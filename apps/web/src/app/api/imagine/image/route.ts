import { withAuth } from "auth/route-guard";
import { generateImageWithGemini } from "lib/ai/image/generate-image";
import { generateQwenImage, isQwenConfigured } from "lib/ai/image/qwen";
import {
  QWEN_IMAGE_MODEL_IDS,
  type QwenImageModelId,
} from "lib/ai/image/qwen-models";
import { serverFileStorage } from "lib/file-storage";
import { NextResponse } from "next/server";
import z from "zod";

export const maxDuration = 300;

const bodySchema = z.object({
  prompt: z.string().min(1).max(4000),
  model: z.enum(["gemini-2.5-flash-image", ...QWEN_IMAGE_MODEL_IDS]).optional(),
  ratio: z.string().optional(),
});

/**
 * POST /api/imagine/image
 *
 * Standalone text-to-image generation for the Imagine section: Google Gemini
 * 2.5 Flash Image (default, via AI Gateway) or Qwen-Image / Wan models
 * (DASHSCOPE_API_KEY). Images are stored permanently; Qwen result URLs expire
 * in 24h, which is why they are re-uploaded here.
 */
export const POST = withAuth(async (request: Request, session) => {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid image request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const model = parsed.data.model ?? "gemini-2.5-flash-image";
    const isQwenModel = (QWEN_IMAGE_MODEL_IDS as readonly string[]).includes(
      model,
    );

    if (isQwenModel && !isQwenConfigured()) {
      return NextResponse.json(
        {
          error:
            "This model needs DASHSCOPE_API_KEY on the server. Pick Gemini Flash Image instead.",
        },
        { status: 503 },
      );
    }

    const generated = isQwenModel
      ? await generateQwenImage({
          prompt: parsed.data.prompt,
          model: model as QwenImageModelId,
          ratio: parsed.data.ratio,
        }).then((images) =>
          images.map((image) => ({
            base64: image.base64,
            mimeType: image.mimeType,
          })),
        )
      : await generateImageWithGemini({
          prompt: parsed.data.prompt,
        }).then((result) => result.images);

    const stored = await Promise.all(
      generated.map(async (image, index) => {
        const uploaded = await serverFileStorage.upload(
          Buffer.from(image.base64, "base64"),
          {
            contentType: image.mimeType,
            filename: `imagine-${Date.now()}-${index}.png`,
            userId: session.user.id,
            uploadType: "ai-generated",
          },
        );
        return { url: uploaded.sourceUrl, mimeType: image.mimeType };
      }),
    );

    return NextResponse.json({ images: stored });
  } catch (error) {
    console.error("Imagine image generation failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Image generation failed",
      },
      { status: 500 },
    );
  }
});
