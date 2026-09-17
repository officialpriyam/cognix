import logger from "logger";
import {
  QWEN_VIDEO_DURATIONS,
  QWEN_VIDEO_RATIOS,
  QWEN_VIDEO_RESOLUTIONS,
  type QwenImageModelId,
  type QwenVideoModelId,
} from "./qwen-models";

/**
 * QwenCloud (DashScope-compatible) image + video generation client.
 *
 * Plain fetch, no SDK: text-to-image runs synchronously through the
 * multimodal-generation endpoint (Qwen-Image series), Wan images and all
 * video go through async task endpoints polled to completion. Auth comes from
 * DASHSCOPE_API_KEY (QwenCloud's documented variable); the base URL can be
 * overridden for regional endpoints.
 */

const DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com";

function baseUrl(): string {
  return (
    process.env.QWENCLOUD_BASE_URL ||
    process.env.DASHSCOPE_BASE_URL ||
    DEFAULT_BASE_URL
  ).replace(/\/$/, "");
}

export function getQwenApiKey(): string | undefined {
  const key = process.env.DASHSCOPE_API_KEY?.trim();
  return key ? key : undefined;
}

export function isQwenConfigured(): boolean {
  return Boolean(getQwenApiKey());
}

function requireApiKey(): string {
  const key = getQwenApiKey();
  if (!key) {
    throw new Error(
      "DASHSCOPE_API_KEY is not configured, so Qwen image/video generation is unavailable.",
    );
  }
  return key;
}

async function parseJsonResponse(response: Response, what: string) {
  let body: any = null;
  try {
    body = await response.json();
  } catch {
    throw new Error(`Qwen ${what} failed with status ${response.status}`);
  }
  if (!response.ok || (body?.code && body.code !== "")) {
    throw new Error(
      `Qwen ${what} failed: ${body?.message || body?.code || `status ${response.status}`}`,
    );
  }
  return body;
}

export interface QwenGeneratedImage {
  base64: string;
  mimeType: string;
}

/** Models answering synchronously via the multimodal-generation endpoint. */
const IMAGE_MODELS_SYNC = new Set(["qwen-image-3.0-pro"]);
/** Wan 2.7 async image models (image-generation endpoint, messages payload). */
const IMAGE_MODELS_MESSAGES_ASYNC = new Set([
  "wan2.7-image",
  "wan2.7-image-pro",
]);

/**
 * Text-to-image. Qwen-Image models answer synchronously; Wan models only
 * offer async tasks, which are submitted and polled here with the same result
 * shape so callers don't branch.
 */
export async function generateQwenImage(input: {
  prompt: string;
  model?: QwenImageModelId;
  ratio?: string;
  signal?: AbortSignal;
}): Promise<QwenGeneratedImage[]> {
  const apiKey = requireApiKey();
  const model = input.model || "qwen-image-3.0-pro";
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("An image prompt is required");

  if (IMAGE_MODELS_SYNC.has(model)) {
    const response = await fetch(
      `${baseUrl()}/api/v1/services/aigc/multimodal-generation/generation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: { messages: [{ role: "user", content: [{ text: prompt }] }] },
          parameters: {
            prompt_extend: true,
            watermark: false,
            size: qwenImageSize(input.ratio || "1:1"),
          },
        }),
        signal: input.signal,
      },
    );
    const body = await parseJsonResponse(response, "image generation");
    const images = extractChoiceImages(body);
    if (images.length === 0) {
      throw new Error("Qwen returned no images for this prompt");
    }
    return downloadImages(images);
  }

  // Wan image models: async task, then poll like video.
  const taskId = await submitImageTask(apiKey, model, prompt, input.ratio);
  const urls = await pollImageTask(apiKey, taskId, input.signal);
  return downloadImages(urls.map((url) => ({ url, mimeType: "image/png" })));
}

/** qwen-image-3.0 accepts 512*512–2048*2048 total pixels. */
function qwenImageSize(ratio: string): string {
  switch (ratio) {
    case "16:9":
      return "1664*928";
    case "9:16":
      return "928*1664";
    case "4:3":
      return "1472*1104";
    case "3:4":
      return "1104*1472";
    default:
      return "1328*1328";
  }
}

/** Extract image URLs from a multimodal `choices[].message.content[]` body. */
function extractChoiceImages(body: any): {
  url: string;
  mimeType: string;
}[] {
  const out: { url: string; mimeType: string }[] = [];
  const choices = body?.output?.choices ?? [];
  for (const choice of choices) {
    const content = choice?.message?.content ?? [];
    for (const part of content) {
      if (typeof part?.image === "string" && part.image) {
        out.push({ url: part.image, mimeType: "image/png" });
      }
    }
  }
  return out;
}

async function submitImageTask(
  apiKey: string,
  model: string,
  prompt: string,
  ratio?: string,
): Promise<string> {
  const useMessagesEndpoint = IMAGE_MODELS_MESSAGES_ASYNC.has(model);
  const response = await fetch(
    useMessagesEndpoint
      ? `${baseUrl()}/api/v1/services/aigc/image-generation/generation`
      : `${baseUrl()}/api/v1/services/aigc/text2image/image-synthesis`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify(
        useMessagesEndpoint
          ? {
              model,
              input: {
                messages: [{ role: "user", content: [{ text: prompt }] }],
              },
              parameters: { n: 1, size: "2K" },
            }
          : {
              model,
              input: { prompt },
              parameters: {
                n: 1,
                size: wanLegacyImageSize(ratio || "1:1"),
                prompt_extend: true,
              },
            },
      ),
    },
  );
  const body = await parseJsonResponse(response, "image task submission");
  const taskId = body?.output?.task_id;
  if (!taskId) throw new Error("Qwen did not return an image task id");
  return taskId as string;
}

/** wan2.6-t2i takes pixel sizes within 1280*1280–1440*1440 (per docs). */
function wanLegacyImageSize(ratio: string): string {
  switch (ratio) {
    case "16:9":
      return "1440*816";
    case "9:16":
      return "816*1440";
    case "4:3":
      return "1440*1080";
    case "3:4":
      return "1080*1440";
    default:
      return "1280*1280";
  }
}

async function pollImageTask(
  apiKey: string,
  taskId: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const body = await pollTask(apiKey, taskId, "image task", signal);
  // Newer image endpoints answer with choices[].message.content[].image;
  // the legacy text2image endpoint answers with output.results[].url.
  const urls = [
    ...extractChoiceImages(body).map((image) => image.url),
    ...((body?.output?.results ?? []) as unknown[])
      .map((r: any) => r?.url)
      .filter(
        (url: unknown): url is string => typeof url === "string" && !!url,
      ),
  ];
  if (urls.length === 0) {
    throw new Error("Qwen image task finished without image URLs");
  }
  return urls;
}

// ---------------------------------------------------------------------------
// Video (always async tasks)
// ---------------------------------------------------------------------------

/**
 * wan2.6 and earlier take fixed pixel sizes; arbitrary computed sizes like
 * 405*720 are rejected by the API, so snap to the documented presets.
 */
function legacyVideoSize(ratio: string, resolution: string): string {
  if (resolution === "480P") {
    switch (ratio) {
      case "9:16":
      case "3:4":
        return "480*832";
      case "1:1":
        return "624*624";
      case "4:3":
        return "832*624";
      default:
        return "832*480";
    }
  }
  if (resolution === "1080P") {
    switch (ratio) {
      case "9:16":
      case "3:4":
        return "1080*1920";
      case "1:1":
        return "1440*1440";
      case "4:3":
        return "1920*1440";
      default:
        return "1920*1080";
    }
  }
  switch (ratio) {
    case "9:16":
    case "3:4":
      return "720*1280";
    case "1:1":
      return "960*960";
    case "4:3":
      return "1280*960";
    default:
      return "1280*720";
  }
}

export async function submitQwenVideoTask(input: {
  prompt: string;
  model?: QwenVideoModelId;
  imageUrl?: string;
  resolution?: (typeof QWEN_VIDEO_RESOLUTIONS)[number];
  ratio?: (typeof QWEN_VIDEO_RATIOS)[number];
  duration?: (typeof QWEN_VIDEO_DURATIONS)[number];
}): Promise<{ taskId: string }> {
  const apiKey = requireApiKey();
  const model = input.model || "wan3.0-video";
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("A video prompt is required");
  const resolution = input.resolution || "720P";
  const ratio = input.ratio || "16:9";
  const duration = input.duration || 5;

  const parameters: Record<string, unknown> = {
    prompt_extend: true,
  };
  if (model.startsWith("wan2.6")) {
    parameters.size = legacyVideoSize(ratio, resolution);
    parameters.duration = duration;
  } else {
    parameters.resolution = resolution;
    parameters.ratio = ratio;
    parameters.duration = duration;
  }

  const response = await fetch(
    `${baseUrl()}/api/v1/services/aigc/video-generation/video-synthesis`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model,
        input: {
          prompt,
          ...(input.imageUrl ? { img_url: input.imageUrl } : {}),
        },
        parameters,
      }),
    },
  );
  const body = await parseJsonResponse(response, "video task submission");
  const taskId = body?.output?.task_id;
  if (!taskId) throw new Error("Qwen did not return a video task id");
  return { taskId: taskId as string };
}

export type QwenVideoStatus =
  | { status: "pending" | "running" }
  | { status: "succeeded"; videoUrl: string }
  | { status: "failed"; message: string };

export async function getQwenVideoStatus(
  taskId: string,
): Promise<QwenVideoStatus> {
  const apiKey = requireApiKey();
  const response = await fetch(`${baseUrl()}/api/v1/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const body = await parseJsonResponse(response, "video task poll");
  const taskStatus = body?.output?.task_status;
  if (taskStatus === "SUCCEEDED") {
    const videoUrl = body?.output?.video_url;
    if (typeof videoUrl !== "string" || !videoUrl) {
      return { status: "failed", message: "Video task finished without a URL" };
    }
    return { status: "succeeded", videoUrl };
  }
  if (taskStatus === "FAILED" || taskStatus === "CANCELED") {
    return {
      status: "failed",
      message: body?.message || `Video task ${taskStatus.toLowerCase()}`,
    };
  }
  return { status: taskStatus === "RUNNING" ? "running" : "pending" };
}

/** Shared async-task poller: 3s cadence, 6-minute ceiling per Qwen guidance. */
async function pollTask(
  apiKey: string,
  taskId: string,
  what: string,
  signal?: AbortSignal,
): Promise<any> {
  const deadline = Date.now() + 6 * 60 * 1000;
  let attempt = 0;
  for (;;) {
    if (signal?.aborted) throw new Error(`${what} was cancelled`);
    if (Date.now() > deadline) {
      throw new Error(`${what} did not finish within 6 minutes`);
    }
    if (attempt > 0) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, attempt < 10 ? 3000 : 6000);
        signal?.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new Error(`${what} was cancelled`));
        });
      });
    }
    attempt += 1;
    const response = await fetch(`${baseUrl()}/api/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal,
    });
    const body = await parseJsonResponse(response, `${what} poll`);
    const taskStatus = body?.output?.task_status;
    if (taskStatus === "SUCCEEDED") return body;
    if (taskStatus === "FAILED" || taskStatus === "CANCELED") {
      throw new Error(body?.message || `${what} ${taskStatus.toLowerCase()}`);
    }
    logger.info(`Qwen ${what} ${taskId} status: ${taskStatus ?? "pending"}`);
  }
}

const DOWNLOAD_MAX_BYTES = 100_000_000;

async function downloadImages(
  images: { url: string; mimeType: string }[],
): Promise<QwenGeneratedImage[]> {
  const out: QwenGeneratedImage[] = [];
  for (const image of images) {
    const response = await fetch(image.url);
    if (!response.ok) {
      throw new Error(
        `Could not download generated media (${response.status})`,
      );
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > DOWNLOAD_MAX_BYTES) {
      throw new Error("Generated media is too large to keep");
    }
    const contentType = response.headers.get("content-type") || undefined;
    out.push({
      base64: buffer.toString("base64"),
      mimeType: image.mimeType || contentType || "application/octet-stream",
    });
  }
  return out;
}

/** Download a finished video task result (URLs expire after 24h). */
export async function downloadQwenVideo(
  videoUrl: string,
): Promise<{ base64: string; mimeType: string }> {
  const [downloaded] = await downloadImages([
    { url: videoUrl, mimeType: "video/mp4" },
  ]);
  if (!downloaded) throw new Error("Could not download generated video");
  return downloaded;
}
