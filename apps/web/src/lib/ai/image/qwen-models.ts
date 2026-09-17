/**
 * Qwen image/video model catalog + option sets. Pure constants on purpose:
 * this module is imported by client components, so it must stay free of
 * node-only APIs (Buffer, process.env).
 *
 * Model ids follow Alibaba Model Studio (DashScope):
 * - qwen-image-3.0-pro: synchronous multimodal-generation endpoint
 * - wan2.7-image / wan2.7-image-pro: async image-generation endpoint (messages)
 * - wan2.6-t2i: async text2image endpoint (prompt)
 * - wan3.0-video: async video-synthesis (resolution/ratio/duration)
 * - wan2.6-t2v: async video-synthesis (size/duration, legacy pixel sizes)
 */

/** Aspect-ratio keys shared by image models; per-model pixel sizes live in
 * qwen.ts (server-only) since they differ by model family. */
export const QWEN_IMAGE_RATIOS: Record<string, string> = {
  "1:1": "1:1",
  "16:9": "16:9",
  "9:16": "9:16",
  "4:3": "4:3",
  "3:4": "3:4",
};

export const QWEN_IMAGE_MODEL_IDS = [
  "qwen-image-3.0-pro",
  "wan2.7-image-pro",
  "wan2.7-image",
  "wan2.6-t2i",
] as const;

export type QwenImageModelId = (typeof QWEN_IMAGE_MODEL_IDS)[number];

export const QWEN_IMAGE_MODELS: {
  id: QwenImageModelId;
  label: string;
  sync: boolean;
}[] = [
  { id: "qwen-image-3.0-pro", label: "Qwen Image 3.0 Pro", sync: true },
  { id: "wan2.7-image-pro", label: "Wan 2.7 Image Pro", sync: false },
  { id: "wan2.7-image", label: "Wan 2.7 Image", sync: false },
  { id: "wan2.6-t2i", label: "Wan 2.6 T2I", sync: false },
];

export const QWEN_VIDEO_MODEL_IDS = ["wan3.0-video", "wan2.6-t2v"] as const;

export type QwenVideoModelId = (typeof QWEN_VIDEO_MODEL_IDS)[number];

export const QWEN_VIDEO_MODELS: { id: QwenVideoModelId; label: string }[] = [
  { id: "wan3.0-video", label: "Wan 3.0 Video" },
  { id: "wan2.6-t2v", label: "Wan 2.6 Text-to-Video" },
];

export const QWEN_VIDEO_RESOLUTIONS = ["480P", "720P", "1080P"] as const;
export const QWEN_VIDEO_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4"] as const;
export const QWEN_VIDEO_DURATIONS = [5, 10, 15] as const;
