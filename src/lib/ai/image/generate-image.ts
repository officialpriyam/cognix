"use server";
import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import {
  Content as GeminiMessage,
  Part as GeminiPart,
  GoogleGenAI,
} from "@google/genai";
import { serverFileStorage } from "lib/file-storage";
import { getBase64Data } from "lib/file-storage/storage-utils";
import { safe, watchError } from "ts-safe";

import {
  FilePart,
  ImagePart,
  ModelMessage,
  TextPart,
  experimental_generateImage,
} from "ai";
import { isString } from "lib/utils";
import logger from "logger";

type GenerateImageOptions = {
  image?: ImageInput;
  messages?: ModelMessage[];
  mode?: "create" | "edit" | "composite";
  prompt: string;
  abortSignal?: AbortSignal;
};

type ImageInput = {
  base64: string;
  mimeType: string;
};

type GeneratedImage = {
  base64: string;
  mimeType?: string;
};

export type GeneratedImageResult = {
  images: GeneratedImage[];
  model?: string;
};

const NVIDIA_IMAGE_MODEL_ALIASES: Record<string, string> = {
  "flux.1-dev": "black-forest-labs/flux.1-dev",
  "flux_1-dev": "black-forest-labs/flux.1-dev",
  "flux.1-schnell": "black-forest-labs/flux.1-schnell",
  "flux_1-schnell": "black-forest-labs/flux.1-schnell",
  "flux.1-kontext-dev": "black-forest-labs/flux.1-kontext-dev",
  "flux_1-kontext-dev": "black-forest-labs/flux.1-kontext-dev",
  "flux.2-klein-4b": "black-forest-labs/flux.2-klein-4b",
  "flux_2-klein-4b": "black-forest-labs/flux.2-klein-4b",
  "stable-diffusion-3.5-large": "stabilityai/stable-diffusion-3.5-large",
  "stable-diffusion-3_5-large": "stabilityai/stable-diffusion-3.5-large",
  "qwen-image": "qwen/qwen-image",
  "qwen-image-edit": "qwen/qwen-image-edit",
};

export async function generateImageWithOpenAI(
  options: GenerateImageOptions,
): Promise<GeneratedImageResult> {
  return experimental_generateImage({
    model: openai.image("gpt-image-1-mini"),
    abortSignal: options.abortSignal,
    prompt: options.prompt,
  }).then((res) => {
    return {
      images: res.images.map((v) => {
        const item: GeneratedImage = {
          base64: Buffer.from(v.uint8Array).toString("base64"),
          mimeType: v.mediaType,
        };
        return item;
      }),
    };
  });
}

export async function generateImageWithXAI(
  options: GenerateImageOptions,
): Promise<GeneratedImageResult> {
  return experimental_generateImage({
    model: xai.image("grok-2-image"),
    abortSignal: options.abortSignal,
    prompt: options.prompt,
  }).then((res) => {
    return {
      images: res.images.map((v) => ({
        base64: Buffer.from(v.uint8Array).toString("base64"),
        mimeType: v.mediaType,
      })),
    };
  });
}

export async function generateImageWithNvidiaFlux(
  options: GenerateImageOptions,
): Promise<GeneratedImageResult> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not set");
  }

  const model = selectNvidiaImageModel(options.mode);

  if (usesNvidiaOpenAIImageApi(model)) {
    return generateNvidiaOpenAICompatibleImage({
      ...options,
      apiKey,
      model,
    });
  }

  return generateNvidiaNativeImage({
    ...options,
    apiKey,
    model,
  });
}

async function generateNvidiaNativeImage(
  options: GenerateImageOptions & { apiKey: string; model: string },
) {
  const baseURL =
    process.env.NVIDIA_IMAGE_BASE_URL || "https://ai.api.nvidia.com/v1/genai";
  const endpoint = `${baseURL.replace(/\/$/, "")}/${options.model.replace(
    /^\//,
    "",
  )}`;

  const body: Record<string, unknown> = {
    prompt: options.prompt,
    height: 1024,
    width: 1024,
    cfg_scale: options.image ? 3.5 : 5,
    mode: "base",
    samples: 1,
    seed: 0,
    steps: options.image ? 30 : 50,
  };

  if (options.image) {
    body.image = `data:${options.image.mimeType};base64,${options.image.base64}`;
    body.aspect_ratio = "match_input_image";
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: options.abortSignal,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `NVIDIA image generation failed: ${JSON.stringify(data).slice(0, 500)}`,
    );
  }

  const images = extractNvidiaImages(data);
  if (!images.length) {
    throw new Error("NVIDIA image generation returned no image data");
  }

  return { images, model: options.model };
}

async function generateNvidiaOpenAICompatibleImage(
  options: GenerateImageOptions & { apiKey: string; model: string },
) {
  const baseURL =
    process.env.NVIDIA_OPENAI_IMAGE_BASE_URL ||
    process.env.NVIDIA_BASE_URL ||
    "https://integrate.api.nvidia.com/v1";
  const isEdit = options.mode !== "create" && Boolean(options.image);
  const endpoint = `${baseURL.replace(/\/$/, "")}/images/${
    isEdit ? "edits" : "generations"
  }`;

  const response = isEdit
    ? await postNvidiaImageEdit(endpoint, options)
    : await postNvidiaImageGeneration(endpoint, options);

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `NVIDIA image ${isEdit ? "edit" : "generation"} failed: ${JSON.stringify(
        data,
      ).slice(0, 500)}`,
    );
  }

  const images = extractNvidiaImages(data);
  if (!images.length) {
    throw new Error("NVIDIA image generation returned no image data");
  }

  return { images, model: options.model };
}

async function postNvidiaImageGeneration(
  endpoint: string,
  options: GenerateImageOptions & { apiKey: string; model: string },
) {
  return fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getOpenAICompatibleNvidiaImageModel(options.model),
      prompt: options.prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    }),
    signal: options.abortSignal,
  });
}

async function postNvidiaImageEdit(
  endpoint: string,
  options: GenerateImageOptions & { apiKey: string; model: string },
) {
  if (!options.image) {
    throw new Error("No image was found to edit.");
  }

  const formData = new FormData();
  formData.set("model", getOpenAICompatibleNvidiaImageModel(options.model));
  formData.set("prompt", options.prompt);
  formData.set("n", "1");
  formData.set("size", "1024x1024");
  formData.set("response_format", "b64_json");
  formData.set(
    "image",
    new Blob([Buffer.from(options.image.base64, "base64")], {
      type: options.image.mimeType,
    }),
    "image.png",
  );

  return fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: formData,
    signal: options.abortSignal,
  });
}

function selectNvidiaImageModel(mode?: "create" | "edit" | "composite") {
  const envModel =
    mode === "edit" || mode === "composite"
      ? process.env.NVIDIA_IMAGE_EDIT_MODEL || process.env.NVIDIA_IMAGE_MODEL
      : process.env.NVIDIA_IMAGE_MODEL;

  return normalizeNvidiaImageModel(envModel || "black-forest-labs/flux.1-dev");
}

function normalizeNvidiaImageModel(model: string) {
  return NVIDIA_IMAGE_MODEL_ALIASES[model] ?? model;
}

function getOpenAICompatibleNvidiaImageModel(model: string) {
  const parts = model.split("/");
  return parts[1] ?? model;
}

function usesNvidiaOpenAIImageApi(model: string) {
  return new Set([
    "qwen/qwen-image",
    "qwen/qwen-image-edit",
    "black-forest-labs/flux.1-schnell",
    "black-forest-labs/flux.2-klein-4b",
    "stabilityai/stable-diffusion-3.5-large",
  ]).has(model);
}

export const generateImageWithNanoBanana = async (
  options: GenerateImageOptions,
): Promise<GeneratedImageResult> => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
  });

  const geminiMessages: GeminiMessage[] = await safe(options.messages || [])
    .map((messages) => Promise.all(messages.map(convertToGeminiMessage)))
    .watch(watchError(logger.error))
    .unwrap();
  if (options.prompt) {
    geminiMessages.push({
      role: "user",
      parts: [{ text: options.prompt }],
    });
  }
  const response = await ai.models
    .generateContent({
      model: "gemini-2.5-flash-image",
      config: {
        abortSignal: options.abortSignal,
        responseModalities: ["IMAGE"],
      },
      contents: geminiMessages,
    })
    .catch((err) => {
      logger.error(err);
      throw err;
    });
  return (
    response.candidates?.reduce(
      (acc, candidate) => {
        const images =
          candidate.content?.parts
            ?.filter((part) => part.inlineData)
            .map((p) => ({
              base64: p.inlineData!.data!,
              mimeType: p.inlineData!.mimeType,
            })) ?? [];
        acc.images.push(...images);
        return acc;
      },
      { images: [] as GeneratedImage[] },
    ) || { images: [] as GeneratedImage[] }
  );
};

function extractNvidiaImages(payload: any): GeneratedImage[] {
  const candidates = [
    payload,
    ...(Array.isArray(payload) ? payload : []),
    payload?.image,
    payload?.b64_json,
    payload?.base64,
    payload?.output,
    ...(Array.isArray(payload?.output) ? payload.output : []),
    ...(Array.isArray(payload?.images) ? payload.images : []),
    ...(Array.isArray(payload?.data) ? payload.data : []),
    ...(Array.isArray(payload?.artifacts) ? payload.artifacts : []),
    ...(Array.isArray(payload?.outputs) ? payload.outputs : []),
  ];

  const seen = new Set<string>();
  return candidates.reduce<GeneratedImage[]>((acc, candidate) => {
    const image = normalizeNvidiaImage(candidate);
    if (!image || seen.has(image.base64)) {
      return acc;
    }
    seen.add(image.base64);
    acc.push(image);
    return acc;
  }, []);
}

function normalizeNvidiaImage(value: any): GeneratedImage | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      return null;
    }
    const match = value.match(/^data:([^;]+);base64,(.+)$/);
    return {
      base64: match?.[2] ?? value,
      mimeType: match?.[1] ?? "image/png",
    };
  }

  if (typeof value !== "object") {
    return null;
  }

  const image = normalizeNvidiaImage(
    value.b64_json ??
      value.base64 ??
      value.image ??
      value.data ??
      value.content,
  );
  if (!image) {
    return null;
  }

  return {
    ...image,
    mimeType:
      value.mimeType ??
      value.mime_type ??
      value.contentType ??
      value.content_type ??
      image.mimeType,
  };
}

async function convertToGeminiMessage(
  message: ModelMessage,
): Promise<GeminiMessage> {
  const getBase64DataSmart = async (input: {
    data: string | Uint8Array | ArrayBuffer | Buffer | URL;
    mimeType: string;
  }): Promise<{ data: string; mimeType: string }> => {
    if (
      typeof input.data === "string" &&
      (input.data.startsWith("http://") || input.data.startsWith("https://"))
    ) {
      // Try fetching directly (public URLs)
      try {
        const resp = await fetch(input.data);
        if (resp.ok) {
          const buf = Buffer.from(await resp.arrayBuffer());
          return { data: buf.toString("base64"), mimeType: input.mimeType };
        }
      } catch {
        // fall through to storage fallback
      }

      // Fallback: derive key and download via storage backend (works for private buckets)
      try {
        const u = new URL(input.data as string);
        const key = decodeURIComponent(u.pathname.replace(/^\//, ""));
        const buf = await serverFileStorage.download(key);
        return { data: buf.toString("base64"), mimeType: input.mimeType };
      } catch {
        // Ignore and fall back to generic helper below
      }
    }

    // Default fallback: use generic helper (handles base64, buffers, blobs, etc.)
    return getBase64Data(input);
  };
  const parts = isString(message.content)
    ? ([{ text: message.content }] as GeminiPart[])
    : await Promise.all(
        message.content.map(async (content) => {
          if (content.type == "file") {
            const part = content as FilePart;
            const data = await getBase64DataSmart({
              data: part.data,
              mimeType: part.mediaType!,
            });
            return {
              inlineData: data,
            } as GeminiPart;
          }
          if (content.type == "text") {
            const part = content as TextPart;
            return {
              text: part.text,
            };
          }
          if (content.type == "image") {
            const part = content as ImagePart;
            const data = await getBase64DataSmart({
              data: part.image,
              mimeType: part.mediaType!,
            });
            return {
              inlineData: data,
            };
          }
          return null;
        }),
      )
        .then((parts) => parts.filter(Boolean) as GeminiPart[])
        .catch((err) => {
          logger.withTag("convertToGeminiMessage").error(err);
          throw err;
        });

  return {
    role: message.role == "user" ? "user" : "model",
    parts,
  };
}
