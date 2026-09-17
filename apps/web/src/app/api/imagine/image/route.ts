import { withAuth } from "auth/route-guard";
import { generateQwenImage, isQwenConfigured } from "lib/ai/image/qwen";
import {
  QWEN_IMAGE_MODEL_IDS,
  QWEN_IMAGE_RATIOS,
} from "lib/ai/image/qwen-models";
import { serverFileStorage } from "lib/file-storage";
import { NextResponse } from "next/server";
import z from "zod";

export const maxDuration = 300;

const bodySchema = z.object({
  prompt: z.string().min(1).max(4000),
  model: z.enum(QWEN_IMAGE_MODEL_IDS).optional(),
  ratio: z
    .enum(Object.keys(QWEN_IMAGE_RATIOS) as [string, ...string[]])
    .optional(),
});

/**
 * POST /api/imagine/image
 *
 * Standalone text-to-image generation (Qwen-Image / Wan) for the Imagine
 * section. Images are stored permanently; Qwen result URLs expire in 24h.
 */
export const POST = withAuth(async (request: Request, session) => {
  try {
    if (!isQwenConfigured()) {
      return NextResponse.json(
        { error: "Image generation is not configured (missing API key)" },
        { status: 503 },
      );
    }
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid image request", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const images = await generateQwenImage({
      prompt: parsed.data.prompt,
      model: parsed.data.model,
      ratio: parsed.data.ratio,
    });

    const stored = await Promise.all(
      images.map(async (image, index) => {
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
