/**
 * Storage abstraction for uploaded files. The API only ever talks to this
 * interface, so local disk can be swapped for S3/R2/Spaces by adding a new
 * implementation and changing one line in storage/index.ts.
 */
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
