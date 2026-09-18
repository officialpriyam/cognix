import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { FileNotFoundError } from "lib/errors";
import { generateUUID } from "lib/utils";
import logger from "logger";
import type {
  FileMetadata,
  FileStorage,
  UploadOptions,
} from "./file-storage.interface";
import {
  resolveStoragePrefix,
  sanitizeFilename,
  toBuffer,
} from "./storage-utils";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Bucket names for different purposes. Defaults mirror .env.example —
// a mismatched hard-coded name here used to surface as "Bucket not found".
const AVATAR_BUCKET = process.env.SUPABASE_AVATAR_BUCKET || "avatars";
const ATTACHMENT_BUCKET =
  process.env.SUPABASE_ATTACHMENT_BUCKET || "attachments";
const AI_GENERATED_BUCKET =
  process.env.SUPABASE_AI_GENERATED_BUCKET || "ai-generated";

// Allow build without Supabase config (will fail at runtime if actually used)
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

const STORAGE_PREFIX = resolveStoragePrefix();

const ensureSupabaseConfigured = () => {
  if (!supabase) {
    throw new Error(
      "Supabase Storage is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.",
    );
  }
};

/** Buckets already verified/created in this process — keeps the happy path free of extra API calls. */
const ensuredBuckets = new Set<string>();

const isMissingBucketError = (message: string): boolean =>
  /nosuchbucket|bucket not found/i.test(message);

/**
 * Create the bucket when it is missing (fresh deployment, renamed env var,
 * wrong default). Without this, the first AI generation after setup dies with
 * a cryptic 404 "Bucket not found". Service-role key has create permission.
 */
const ensureBucket = async (bucketName: string): Promise<void> => {
  if (ensuredBuckets.has(bucketName)) return;

  const { data: buckets, error: listError } =
    await supabase!.storage.listBuckets();
  if (listError) {
    throw new Error(
      `Could not list storage buckets to verify "${bucketName}": ${listError.message}`,
    );
  }

  const exists = (buckets ?? []).some((bucket) => bucket.name === bucketName);
  if (!exists) {
    logger.info(`Supabase bucket "${bucketName}" not found — creating it`);
    // Attachments stay private (served via signed URLs); everything else public.
    const { error: createError } = await supabase!.storage.createBucket(
      bucketName,
      { public: bucketName !== ATTACHMENT_BUCKET },
    );
    if (createError && !/already exists|duplicate/i.test(createError.message)) {
      throw new Error(
        `Failed to create storage bucket "${bucketName}": ${createError.message}`,
      );
    }
  }

  ensuredBuckets.add(bucketName);
};

const buildPathname = (
  filename: string,
  userId?: string,
  projectId?: string,
) => {
  const safeName = sanitizeFilename(filename);
  const id = generateUUID();

  // Project upload: userId/projects/projectId/uuid
  if (userId && projectId) {
    return path.posix.join(userId, "projects", projectId, id);
  }

  // If userId is provided, create user-specific path
  if (userId) {
    return path.posix.join(userId, `${id}-${safeName}`);
  }

  // Legacy: use storage prefix for backward compatibility
  const prefix = STORAGE_PREFIX ? `${STORAGE_PREFIX}/` : "";
  return path.posix.join(prefix, `${id}-${safeName}`);
};

/**
 * Determine which bucket to use based on file path or upload type.
 * - Avatar images go to 'avatars' bucket
 * - AI-generated images go to 'Gemini Images' bucket (or configured bucket)
 * - File attachments go to 'attachments' bucket
 */
const getBucketName = (pathname: string, uploadType?: string): string => {
  // Explicit upload type takes precedence
  if (uploadType === "avatar") {
    return AVATAR_BUCKET;
  }
  if (uploadType === "ai-generated") {
    return AI_GENERATED_BUCKET;
  }
  if (uploadType === "attachment") {
    return ATTACHMENT_BUCKET;
  }

  // Fallback: Check path for backward compatibility
  if (pathname.includes("avatar") || pathname.startsWith("avatars/")) {
    return AVATAR_BUCKET;
  }

  // Default to attachments bucket
  return ATTACHMENT_BUCKET;
};

const mapMetadata = (
  key: string,
  info: { contentType: string; size: number; uploadedAt?: Date },
) =>
  ({
    key,
    filename: path.posix.basename(key),
    contentType: info.contentType,
    size: info.size,
    uploadedAt: info.uploadedAt,
  }) satisfies FileMetadata;

export const createSupabaseStorage = (): FileStorage => {
  return {
    async upload(content, options: UploadOptions = {}) {
      ensureSupabaseConfigured();
      const buffer = await toBuffer(content);
      const filename = options.filename ?? "file";
      const pathname = buildPathname(
        filename,
        options.userId,
        options.projectId,
      );
      const contentType = options.contentType || "application/octet-stream";

      // Determine which bucket to use based on uploadType and pathname
      const bucketName = getBucketName(pathname, options.uploadType);

      let upload = await supabase!.storage
        .from(bucketName)
        .upload(pathname, buffer, {
          contentType,
          upsert: false,
        });

      // Self-heal a missing bucket: create it and retry once so a fresh
      // deployment (or a renamed SUPABASE_*_BUCKET env var) doesn't fail the
      // whole generation with a bare "Bucket not found".
      if (upload.error && isMissingBucketError(upload.error.message)) {
        await ensureBucket(bucketName);
        upload = await supabase!.storage
          .from(bucketName)
          .upload(pathname, buffer, {
            contentType,
            upsert: false,
          });
      }

      if (upload.error) {
        throw new Error(
          `Supabase upload failed (bucket "${bucketName}"): ${upload.error.message}`,
        );
      }
      const { data } = upload;

      // Get URL (Signed for private buckets, Public for others)
      let sourceUrl: string;
      if (bucketName === ATTACHMENT_BUCKET) {
        // Private bucket: Generate signed URL (1 hour expiry for immediate use)
        const { data: signedData, error: signedError } = await supabase!.storage
          .from(bucketName)
          .createSignedUrl(data.path, 3600);

        if (signedError) {
          throw new Error(
            `Failed to create signed URL: ${signedError.message}`,
          );
        }
        sourceUrl = signedData.signedUrl;
      } else {
        // Public bucket: Get public URL
        const {
          data: { publicUrl },
        } = supabase!.storage.from(bucketName).getPublicUrl(data.path);
        sourceUrl = publicUrl;
      }

      const metadata: FileMetadata = {
        key: data.path,
        filename: path.posix.basename(data.path),
        contentType,
        size: buffer.byteLength,
        uploadedAt: new Date(),
      };

      return {
        key: data.path,
        sourceUrl,
        metadata,
      };
    },

    async createUploadUrl() {
      // Supabase Storage doesn't support presigned upload URLs in the same way
      // Client should use server upload endpoint
      return null;
    },

    async download(key) {
      ensureSupabaseConfigured();
      const bucketName = getBucketName(key);

      const { data, error } = await supabase!.storage
        .from(bucketName)
        .download(key);

      if (error) {
        if (error.message.includes("not found")) {
          throw new FileNotFoundError(key);
        }
        throw new Error(`Failed to download: ${error.message}`);
      }

      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    },

    async delete(key) {
      ensureSupabaseConfigured();
      const bucketName = getBucketName(key);

      const { error } = await supabase!.storage.from(bucketName).remove([key]);

      if (error) {
        throw new Error(`Failed to delete: ${error.message}`);
      }
    },

    async exists(key) {
      try {
        ensureSupabaseConfigured();
        const bucketName = getBucketName(key);

        const { data, error } = await supabase!.storage
          .from(bucketName)
          .list(path.dirname(key), {
            search: path.basename(key),
          });

        if (error) return false;
        return data.some((file) => file.name === path.basename(key));
      } catch {
        return false;
      }
    },

    async getMetadata(key) {
      try {
        ensureSupabaseConfigured();
        const bucketName = getBucketName(key);

        const { data, error } = await supabase!.storage
          .from(bucketName)
          .list(path.dirname(key), {
            search: path.basename(key),
          });

        if (error || !data.length) {
          return null;
        }

        const file = data.find((f) => f.name === path.basename(key));
        if (!file) return null;

        return mapMetadata(key, {
          contentType: file.metadata?.mimetype || "application/octet-stream",
          size: file.metadata?.size || 0,
          uploadedAt: file.created_at ? new Date(file.created_at) : undefined,
        });
      } catch {
        return null;
      }
    },

    async getSourceUrl(key) {
      try {
        ensureSupabaseConfigured();
        const bucketName = getBucketName(key);

        const {
          data: { publicUrl },
        } = supabase!.storage.from(bucketName).getPublicUrl(key);
        return publicUrl;
      } catch {
        return null;
      }
    },

    async getDownloadUrl(key) {
      // For public buckets, the public URL is the same as download URL
      return this.getSourceUrl(key);
    },

    async getSignedUrl(key, expiresIn = 3600) {
      try {
        ensureSupabaseConfigured();
        const bucketName = getBucketName(key);

        const { data, error } = await supabase!.storage
          .from(bucketName)
          .createSignedUrl(key, expiresIn);

        if (error) {
          throw new Error(`Failed to create signed URL: ${error.message}`);
        }

        return data.signedUrl;
      } catch (error) {
        console.error("Error creating signed URL:", error);
        return null;
      }
    },
  } satisfies FileStorage;
};
