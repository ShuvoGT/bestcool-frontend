import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { env } from "../config/env";
import type { StorageProvider, StoredFile } from "./StorageProvider";

/**
 * Stores uploaded files in Cloudinary. Used in production (e.g. Render) where
 * the local filesystem is ephemeral and disk uploads would vanish on restart.
 * Selected automatically when the CLOUDINARY_* env vars are set — see
 * storage/index.ts. The DB stores Cloudinary's public_id as the `key`.
 */
export class CloudinaryStorageProvider implements StorageProvider {
  constructor() {
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
      secure: true,
    });
  }

  async save(buffer: Buffer, _originalName: string, _mimeType: string): Promise<StoredFile> {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: env.cloudinary.folder, resource_type: "auto" },
        (error, res) => {
          if (error || !res) return reject(error ?? new Error("Cloudinary upload failed"));
          resolve(res);
        },
      );
      stream.end(buffer);
    });
    return { url: result.secure_url, key: result.public_id };
  }

  async delete(key: string): Promise<void> {
    // `key` is the Cloudinary public_id returned by save(); swallow errors so a
    // missing/already-deleted asset never breaks the calling request.
    await cloudinary.uploader.destroy(key).catch(() => undefined);
  }
}
