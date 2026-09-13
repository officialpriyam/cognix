import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "lib/supabase/server";
import type {
  FileMetadata,
  FileStorage,
  UploadContent,
  UploadOptions,
  UploadResult,
} from "./file-storage.interface";

function toKeyPath(key: string, prefix?: string): string {
  const clean = key.replace(/^\/+/, "");
  if (!prefix) return clean;
  return `${prefix.replace(/\/+$/, "")}/${clean}`;
}

async function toUint8Array(content: UploadContent): Promise<Uint8Array> {
  if (typeof content === "string") return new TextEncoder().encode(content);
  if (content instanceof Uint8Array) return content;
  if (content instanceof ArrayBuffer) return new Uint8Array(content);
  if (ArrayBuffer.isView(content)) {
    return new Uint8Array(
      content.buffer,
      content.byteOffset,
      content.byteLength,
    );
  }
  if (typeof Blob !== "undefined" && content instanceof Blob) {
    return new Uint8Array(await content.arrayBuffer());
  }
  if (
    typeof ReadableStream !== "undefined" &&
    content instanceof ReadableStream
  ) {
    const buf = await new Response(
      content as ReadableStream<Uint8Array>,
    ).arrayBuffer();
    return new Uint8Array(buf);
  }
  if (typeof (content as { pipe?: unknown }).pipe === "function") {
    const chunks: Uint8Array[] = [];
    for await (const chunk of content as unknown as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  throw new Error("Unsupported upload content type for Supabase storage");
}

export function createSupabaseStorage(client?: SupabaseClient): FileStorage {
  const bucket = process.env.FILE_STORAGE_SUPABASE_BUCKET || "cognix";
  const prefix = process.env.FILE_STORAGE_PREFIX?.trim() || "";
  const publicBase = process.env.FILE_STORAGE_SUPABASE_PUBLIC_BASE_URL?.replace(
    /\/+$/,
    "",
  );

  const supabase = client ?? createSupabaseAdminClient();

  const publicUrl = (path: string): string => {
    if (publicBase) return `${publicBase}/${path}`;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };

  return {
    async upload(content, options: UploadOptions = {}): Promise<UploadResult> {
      const filename = options.filename ?? crypto.randomUUID();
      const path = toKeyPath(filename, prefix);
      const body = await toUint8Array(content);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, body, {
          contentType: options.contentType,
          upsert: false,
        });
      if (error) {
        throw new Error(`Supabase storage upload failed: ${error.message}`);
      }

      const metadata = await this.getMetadata(filename);
      return {
        key: filename,
        sourceUrl: publicUrl(data.path),
        metadata: metadata ?? {
          key: filename,
          filename,
          contentType: options.contentType ?? "application/octet-stream",
          size: body.byteLength,
        },
      };
    },

    async download(key: string): Promise<Buffer> {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(toKeyPath(key, prefix));
      if (error) {
        throw new Error(`Supabase storage download failed: ${error.message}`);
      }
      return Buffer.from(await data.arrayBuffer());
    },

    async delete(key: string): Promise<void> {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([toKeyPath(key, prefix)]);
      if (error) {
        throw new Error(`Supabase storage delete failed: ${error.message}`);
      }
    },

    async exists(key: string): Promise<boolean> {
      const path = toKeyPath(key, prefix);
      const dir = prefix ? prefix.replace(/\/+$/, "") : "";
      const name = path.slice(path.lastIndexOf("/") + 1);
      const { data, error } = await supabase.storage.from(bucket).list(dir, {
        search: name,
        limit: 1,
      });
      if (error) return false;
      return (data ?? []).some(
        (f) => `${prefix ? `${prefix}/` : ""}${f.name}` === path,
      );
    },

    async getMetadata(key: string): Promise<FileMetadata | null> {
      const path = toKeyPath(key, prefix);
      const dir = path.includes("/")
        ? path.slice(0, path.lastIndexOf("/"))
        : "";
      const name = path.slice(path.lastIndexOf("/") + 1);
      const { data, error } = await supabase.storage.from(bucket).list(dir, {
        search: name,
        limit: 1,
      });
      if (error || !data?.length) return null;
      const found = data.find((f) => f.name === name);
      if (!found) return null;
      return {
        key,
        filename: found.name,
        contentType:
          (found.metadata?.mimetype as string) ?? "application/octet-stream",
        size: (found.metadata?.size as number) ?? 0,
        uploadedAt: found.created_at ? new Date(found.created_at) : undefined,
      };
    },

    async getSourceUrl(key: string): Promise<string | null> {
      const path = toKeyPath(key, prefix);
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    },
  };
}
