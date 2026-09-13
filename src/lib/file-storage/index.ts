import "server-only";
import { IS_DEV } from "lib/const";
import type { FileStorage } from "./file-storage.interface";
import { createS3FileStorage } from "./s3-file-storage";
import { createVercelBlobStorage } from "./vercel-blob-storage";
// Lazily imported so the Supabase SDK is never pulled into the static
// module graph (keeps it out of the edge/middleware runtime).
let createSupabaseStorage: (() => FileStorage) | undefined;
async function loadSupabaseStorage(): Promise<FileStorage> {
  if (!createSupabaseStorage) {
    createSupabaseStorage = (await import("./supabase-storage")).createSupabaseStorage;
  }
  return createSupabaseStorage();
}
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

const createNoopStorage = (): FileStorage => ({
  async upload() {
    throw new Error("File storage is not configured.");
  },
  async download() {
    throw new Error("File storage is not configured.");
  },
  async delete() {
    throw new Error("File storage is not configured.");
  },
  async exists() {
    return false;
  },
  async getMetadata() {
    return null;
  },
  async getSourceUrl() {
    return null;
  },
});

/**
 * Resolves the configured storage driver. Any failure (missing env, unreachable
 * Supabase, bad config) is caught and downgraded to a safe no-op so that a
 * storage misconfiguration can never crash the server or the request graph.
 */
const createFileStorage = async (): Promise<FileStorage> => {
  logger.info(`Creating file storage: ${storageDriver}`);
  try {
    switch (storageDriver) {
      case "vercel-blob":
        return createVercelBlobStorage();
      case "s3":
        return createS3FileStorage();
      case "supabase":
        return await loadSupabaseStorage();
      default: {
        const exhaustiveCheck: never = storageDriver;
        throw new Error(`Unsupported file storage driver: ${exhaustiveCheck}`);
      }
    }
  } catch (error) {
    logger.error(
      `Failed to initialize "${storageDriver}" storage; using safe no-op fallback`,
      error,
    );
    return createNoopStorage();
  }
};

const serverFileStoragePromise =
  globalThis.__server__file_storage__
    ? Promise.resolve(globalThis.__server__file_storage__)
    : createFileStorage();

// Resolve synchronously-best-effort: reuse a resolved instance when available.
const serverFileStorage: FileStorage =
  globalThis.__server__file_storage__ ?? (await serverFileStoragePromise);

if (IS_DEV) {
  globalThis.__server__file_storage__ = serverFileStorage;
}

export { serverFileStorage, storageDriver };
