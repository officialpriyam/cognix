import logger from "logger";
import {
  QWEN_IMAGE_RATIOS,
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

const IMAGE_MODELS_SYNC = new Set(["qwen-image-3.0-pro"]);

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
    const size =
      QWEN_IMAGE_RATIOS[input.ratio || "1:1"] ?? QWEN_IMAGE_RATIOS["1:1"];
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
            size,
            n: 1,
          },
        }),
        signal: input.signal,
      },
    );
    const body = await parseJsonResponse(response, "image generation");
    const images = extractSyncImages(body);
    if (images.length === 0) {
      throw new Error("Qwen returned no images for this prompt");
    }
    return downloadImages(images);
  }

  // Wan image models: async task, then poll like video.
  const taskId = await submitImageTask(apiKey, model, prompt);
  const urls = await pollImageTask(apiKey, taskId, input.signal);
  return downloadImages(urls.map((url) => ({ url, mimeType: "image/png" })));
}

function extractSyncImages(body: any): { url: string; mimeType: string }[] {
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
): Promise<string> {
  const response = await fetch(
    `${baseUrl()}/api/v1/services/aigc/image-generation/generation`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model,
        input: { prompt },
        parameters: { size: "2K", n: 1, prompt_extend: true },
      }),
    },
  );
  const body = await parseJsonResponse(response, "image task submission");
  const taskId = body?.output?.task_id;
  if (!taskId) throw new Error("Qwen did not return an image task id");
  return taskId as string;
}

async function pollImageTask(
  apiKey: string,
  taskId: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const body = await pollTask(apiKey, taskId, "image task", signal);
  const results = body?.output?.results ?? [];
  const urls = results
    .map((r: any) => r?.url)
    .filter((url: unknown): url is string => typeof url === "string" && !!url);
  if (urls.length === 0) {
    throw new Error("Qwen image task finished without image URLs");
  }
  return urls;
}

// ---------------------------------------------------------------------------
// Video (always async tasks)
// ---------------------------------------------------------------------------

/** wan2.6 and earlier take pixel sizes; derive one from ratio+resolution. */
function legacyVideoSize(ratio: string, resolution: string): string {
  const height =
    resolution === "1080P" ? 1080 : resolution === "480P" ? 480 : 720;
  const width =
    ratio === "16:9"
      ? Math.round((height * 16) / 9)
      : ratio === "9:16"
        ? Math.round((height * 9) / 16)
        : ratio === "4:3"
          ? Math.round((height * 4) / 3)
          : ratio === "3:4"
            ? Math.round((height * 3) / 4)
            : height;
  return `${Math.min(width, 1440)}*${Math.min(height, 1440)}`;
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
