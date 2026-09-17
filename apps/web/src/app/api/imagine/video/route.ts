import { withAuth } from "auth/route-guard";
import {
  downloadQwenVideo,
  getQwenVideoStatus,
  isQwenConfigured,
  submitQwenVideoTask,
} from "lib/ai/image/qwen";
import {
  QWEN_VIDEO_DURATIONS,
  QWEN_VIDEO_MODEL_IDS,
  QWEN_VIDEO_RATIOS,
  QWEN_VIDEO_RESOLUTIONS,
} from "lib/ai/image/qwen-models";
import { serverFileStorage } from "lib/file-storage";
import { NextResponse } from "next/server";
import z from "zod";

const createSchema = z.object({
  prompt: z.string().min(1).max(4000),
  model: z.enum(QWEN_VIDEO_MODEL_IDS).optional(),
  imageUrl: z.string().optional(),
  resolution: z.enum(QWEN_VIDEO_RESOLUTIONS).optional(),
  ratio: z.enum(QWEN_VIDEO_RATIOS).optional(),
  duration: z
    .number()
    .refine(
      (value): value is (typeof QWEN_VIDEO_DURATIONS)[number] =>
        (QWEN_VIDEO_DURATIONS as readonly number[]).includes(value),
      "Unsupported duration",
    )
    .optional(),
});

/** Accept http(s) URLs as-is; move uploaded data-URL first frames into
 * permanent storage so DashScope can fetch them. */
async function resolveFirstFrame(
  imageUrl: string | undefined,
  userId: string,
): Promise<string | undefined> {
  if (!imageUrl?.trim()) return undefined;
  const value = imageUrl.trim();
  if (/^https?:\/\//i.test(value)) return value;
  const match = /^data:(image\/[\w.+-]+);base64,(.+)$/i.exec(value);
  if (!match) {
    throw new Error("First frame must be an image URL or an uploaded image");
  }
  const uploaded = await serverFileStorage.upload(
    Buffer.from(match[2], "base64"),
    {
      contentType: match[1],
      filename: `imagine-first-frame-${Date.now()}.png`,
      userId,
      uploadType: "ai-generated",
    },
  );
  return uploaded.sourceUrl;
}

/**
 * POST /api/imagine/video — submit a text/image-to-video task, returns a
 * task id immediately. Generation takes minutes; the client polls GET.
 */
export const POST = withAuth(async (request: Request, session) => {
  try {
    if (!isQwenConfigured()) {
      return NextResponse.json(
        { error: "Video generation is not configured (missing API key)" },
        { status: 503 },
      );
    }
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid video request", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const imageUrl = await resolveFirstFrame(
      parsed.data.imageUrl,
      session.user.id,
    );
    const { taskId } = await submitQwenVideoTask({
      ...parsed.data,
      imageUrl,
    });
    return NextResponse.json({ taskId, status: "pending" });
  } catch (error) {
    console.error("Imagine video submission failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Video submission failed",
      },
      { status: 500 },
    );
  }
});

/**
 * GET /api/imagine/video?taskId=… — poll a video task. On success the video
 * is downloaded into permanent storage (Qwen URLs expire after 24h); if that
 * save fails the expiring source URL is returned instead.
 */
export const GET = withAuth(async (request: Request, session) => {
  try {
    const taskId = new URL(request.url).searchParams.get("taskId");
    if (!taskId) {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 },
      );
    }
    const status = await getQwenVideoStatus(taskId);
    if (status.status !== "succeeded") {
      return NextResponse.json(status);
    }
    try {
      const video = await downloadQwenVideo(status.videoUrl);
      const uploaded = await serverFileStorage.upload(
        Buffer.from(video.base64, "base64"),
        {
          contentType: video.mimeType,
          filename: `imagine-video-${Date.now()}.mp4`,
          userId: session.user.id,
          uploadType: "ai-generated",
        },
      );
      return NextResponse.json({
        status: "succeeded",
        videoUrl: uploaded.sourceUrl,
        stored: true,
      });
    } catch (error) {
      console.error("Imagine video save failed, returning source URL:", error);
      return NextResponse.json({
        status: "succeeded",
        videoUrl: status.videoUrl,
        stored: false,
      });
    }
  } catch (error) {
    console.error("Imagine video poll failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Video poll failed" },
      { status: 500 },
    );
  }
});
