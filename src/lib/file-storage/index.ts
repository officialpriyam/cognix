import "server-only";
import { IS_DEV } from "lib/const";
import type { FileStorage } from "./file-storage.interface";
import { createS3FileStorage } from "./s3-file-storage";
import { createVercelBlobStorage } from "./vercel-blob-storage";
import { createSupabaseStorage } from "./supabase-storage";
import logger from "logger";

export type FileStorageDriver = "vercel-blob" | "s3" | "supabase";

const resolveDriver = (): FileStorageDriver => {
  const candidate = process.env.FILE_STORAGE_TYPE;

  const normalized = candidate?.trim().toLowerCase();
  if (
    normalized === "vercel-blob" ||
    normalized === "s3" ||
    normalized === "supabase"
  ) {
    return normalized as FileStorageDriver;
  }

  // Default to Vercel Blob
  return "vercel-blob";
};

declare global {
  // eslint-disable-next-line no-var
  var __server__file_storage__: FileStorage | undefined;
}

const storageDriver = resolveDriver();

const createFileStorage = (): FileStorage => {
  logger.info(`Creating file storage: ${storageDriver}`);
  switch (storageDriver) {
    case "vercel-blob":
      return createVercelBlobStorage();
    case "s3":
      return createS3FileStorage();
    case "supabase":
      return createSupabaseStorage();
    default: {
      const exhaustiveCheck: never = storageDriver;
      throw new Error(`Unsupported file storage driver: ${exhaustiveCheck}`);
    }
  }
};

const serverFileStorage =
  globalThis.__server__file_storage__ || createFileStorage();

if (IS_DEV) {
  globalThis.__server__file_storage__ = serverFileStorage;
}

export { serverFileStorage, storageDriver };
