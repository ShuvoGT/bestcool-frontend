import { LocalStorageProvider } from "./LocalStorageProvider";
import type { StorageProvider } from "./StorageProvider";

// Swap this single line to move uploads to S3/R2 later.
export const storage: StorageProvider = new LocalStorageProvider();
