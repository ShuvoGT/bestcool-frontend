import { CloudinaryStorageProvider } from "./CloudinaryStorageProvider";
import { LocalStorageProvider } from "./LocalStorageProvider";
import { env } from "../config/env";
import type { StorageProvider } from "./StorageProvider";

// Use Cloudinary when configured (production hosts with an ephemeral filesystem,
// e.g. Render); fall back to local disk for development. Swap providers here.
export const storage: StorageProvider = env.cloudinary.cloudName
  ? new CloudinaryStorageProvider()
  : new LocalStorageProvider();

console.log(`[storage] using ${env.cloudinary.cloudName ? "Cloudinary" : "local disk"} provider`);
