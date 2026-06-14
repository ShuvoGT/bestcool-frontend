/**
 * Storage abstraction for uploaded files (ported + adapted from
 * backend/src/storage/*). The upload route only talks to `storage`, so the
 * backing store is swappable.
 *
 * Local disk (default): writes to `public/uploads`, which Next serves at
 * `/uploads/...`. Hostinger has a persistent filesystem, so this works in
 * production there — unlike Render (the reason the split app needed Cloudinary).
 * Cloudinary is still used automatically when CLOUDINARY_CLOUD_NAME is set.
 */
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export interface StoredFile {
  /** Publicly reachable URL of the stored file. */
  url: string;
  /** Provider-specific path/key, used for deletion. */
  key: string;
}

export interface StorageProvider {
  save(buffer: Buffer, originalName: string, mimeType: string): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

class LocalStorageProvider implements StorageProvider {
  async save(buffer: Buffer, originalName: string): Promise<StoredFile> {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    const ext = path.extname(originalName).toLowerCase() || ".bin";
    const key = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    await fs.writeFile(path.join(UPLOADS_DIR, key), buffer);
    // Same-origin relative URL — served by Next from /public/uploads.
    return { url: `/uploads/${key}`, key };
  }

  async delete(key: string): Promise<void> {
    const safe = path.basename(key); // guard against path traversal
    await fs.unlink(path.join(UPLOADS_DIR, safe)).catch(() => undefined);
  }
}

class CloudinaryStorageProvider implements StorageProvider {
  async save(buffer: Buffer): Promise<StoredFile> {
    // Lazy import so `cloudinary` is only loaded when actually configured.
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    const folder = process.env.CLOUDINARY_FOLDER || "bestcool";
    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder, resource_type: "auto" }, (error, res) => {
        if (error || !res) return reject(error ?? new Error("Cloudinary upload failed"));
        resolve(res as { secure_url: string; public_id: string });
      });
      stream.end(buffer);
    });
    return { url: result.secure_url, key: result.public_id };
  }

  async delete(key: string): Promise<void> {
    const { v2: cloudinary } = await import("cloudinary");
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    await cloudinary.uploader.destroy(key).catch(() => undefined);
  }
}

export const storage: StorageProvider = process.env.CLOUDINARY_CLOUD_NAME
  ? new CloudinaryStorageProvider()
  : new LocalStorageProvider();
