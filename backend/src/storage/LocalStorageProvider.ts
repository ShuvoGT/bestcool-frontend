import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { env } from "../config/env";
import type { StorageProvider, StoredFile } from "./StorageProvider";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

/** Stores files in the local /uploads folder, served by Express statically. */
export class LocalStorageProvider implements StorageProvider {
  async save(buffer: Buffer, originalName: string, _mimeType: string): Promise<StoredFile> {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    const ext = path.extname(originalName).toLowerCase() || ".bin";
    const key = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    await fs.writeFile(path.join(UPLOADS_DIR, key), buffer);
    return { url: `${env.apiUrl}/uploads/${key}`, key };
  }

  async delete(key: string): Promise<void> {
    // Guard against path traversal — keys are flat filenames.
    const safe = path.basename(key);
    await fs.unlink(path.join(UPLOADS_DIR, safe)).catch(() => undefined);
  }
}
