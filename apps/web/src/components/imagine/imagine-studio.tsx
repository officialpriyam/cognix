"use client";

import {
  QWEN_IMAGE_MODELS,
  QWEN_IMAGE_RATIOS,
  QWEN_VIDEO_DURATIONS,
  QWEN_VIDEO_MODELS,
  QWEN_VIDEO_RATIOS,
  QWEN_VIDEO_RESOLUTIONS,
} from "lib/ai/image/qwen-models";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "ui/button";
import { Card, CardContent } from "ui/card";
import { Input } from "ui/input";
import { Label } from "ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";
import { Skeleton } from "ui/skeleton";
import { Textarea } from "ui/textarea";

type Mode = "image" | "video";

interface GalleryImage {
  kind: "image";
  id: string;
  url: string;
  prompt: string;
}

interface GalleryVideo {
  kind: "video";
  id: string;
  taskId: string;
  prompt: string;
  status: "pending" | "running" | "succeeded" | "failed";
  videoUrl?: string;
  message?: string;
}

type GalleryItem = GalleryImage | GalleryVideo;

async function readError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body?.error || fallback;
  } catch {
    return fallback;
  }
}

export function ImagineStudio() {
  const [mode, setMode] = useState<Mode>("image");
  const [prompt, setPrompt] = useState("");
  const [imageModel, setImageModel] = useState<string>(QWEN_IMAGE_MODELS[0].id);
  const [videoModel, setVideoModel] = useState<string>(QWEN_VIDEO_MODELS[0].id);
  const [ratio, setRatio] = useState<string>("1:1");
  const [imageUrl, setImageUrl] = useState("");
  const [resolution, setResolution] = useState<string>(
    QWEN_VIDEO_RESOLUTIONS[1],
  );
  const [duration, setDuration] = useState<number>(QWEN_VIDEO_DURATIONS[0]);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const pollers = useRef(new Map<string, ReturnType<typeof setInterval>>());

  useEffect(
    () => () => {
      for (const timer of pollers.current.values()) clearInterval(timer);
      pollers.current.clear();
    },
    [],
  );

  const pollVideo = (taskId: string) => {
    const timer = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/imagine/video?taskId=${encodeURIComponent(taskId)}`,
        );
        if (!response.ok)
          throw new Error(await readError(response, "Poll failed"));
        const body = (await response.json()) as {
          status: GalleryVideo["status"];
          videoUrl?: string;
          message?: string;
        };
        if (body.status === "succeeded" || body.status === "failed") {
          clearInterval(timer);
          pollers.current.delete(taskId);
        }
        setItems((current) =>
          current.map((item) =>
            item.kind === "video" && item.taskId === taskId
              ? {
                  ...item,
                  status: body.status,
                  videoUrl: body.videoUrl ?? item.videoUrl,
                  message: body.message,
                }
              : item,
          ),
        );
      } catch (error) {
        clearInterval(timer);
        pollers.current.delete(taskId);
        setItems((current) =>
          current.map((item) =>
            item.kind === "video" && item.taskId === taskId
              ? {
                  ...item,
                  status: "failed",
                  message:
                    error instanceof Error ? error.message : "Poll failed",
                }
              : item,
          ),
        );
      }
    }, 5000);
    pollers.current.set(taskId, timer);
  };

  const generateImage = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/imagine/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed, model: imageModel, ratio }),
      });
      if (!response.ok)
        throw new Error(await readError(response, "Generation failed"));
      const body = (await response.json()) as {
        images: { url: string; mimeType?: string }[];
      };
      setItems((current) => [
        ...body.images.map(
          (image): GalleryImage => ({
            kind: "image",
            id: `${Date.now()}-${image.url.slice(-12)}`,
            url: image.url,
            prompt: trimmed,
          }),
        ),
        ...current,
      ]);
      setPrompt("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Image generation failed",
      );
    } finally {
      setBusy(false);
    }
  };

  const generateVideo = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/imagine/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: trimmed,
          model: videoModel,
          resolution,
          ratio,
          duration,
          imageUrl: imageUrl.trim() || undefined,
        }),
      });
      if (!response.ok)
        throw new Error(await readError(response, "Submission failed"));
      const body = (await response.json()) as { taskId: string };
      setItems((current) => [
        {
          kind: "video",
          id: body.taskId,
          taskId: body.taskId,
          prompt: trimmed,
          status: "pending",
        },
        ...current,
      ]);
      pollVideo(body.taskId);
      setPrompt("");
      toast.success("Video task submitted — polling for the result");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Video submission failed",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Imagine</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate images and videos with Qwen models, separately from chat.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex gap-2">
            {(["image", "video"] as Mode[]).map((value) => (
              <Button
                key={value}
                variant={mode === value ? "secondary" : "ghost"}
                size="sm"
                className="rounded-full capitalize"
                onClick={() => setMode(value)}
              >
                {value}
              </Button>
            ))}
          </div>

          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={
              mode === "image"
                ? "Describe the image to imagine…"
                : "Describe the video to imagine…"
            }
            className="min-h-24 resize-none"
          />

          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label>Model</Label>
              {mode === "image" ? (
                <Select value={imageModel} onValueChange={setImageModel}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QWEN_IMAGE_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={videoModel} onValueChange={setVideoModel}>
                  <SelectTrigger className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QWEN_VIDEO_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label>Aspect ratio</Label>
              {mode === "image" ? (
                <Select value={ratio} onValueChange={setRatio}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(QWEN_IMAGE_RATIOS).map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={ratio} onValueChange={setRatio}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QWEN_VIDEO_RATIOS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {mode === "video" && (
              <>
                <div className="grid gap-1.5">
                  <Label>Resolution</Label>
                  <Select value={resolution} onValueChange={setResolution}>
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QWEN_VIDEO_RESOLUTIONS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Duration</Label>
                  <Select
                    value={String(duration)}
                    onValueChange={(value) => setDuration(Number(value))}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QWEN_VIDEO_DURATIONS.map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value}s
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="grid gap-1.5">
              <Label className="invisible">Generate</Label>
              <Button
                onClick={mode === "image" ? generateImage : generateVideo}
                disabled={busy || !prompt.trim()}
              >
                {busy
                  ? mode === "image"
                    ? "Imagining…"
                    : "Submitting…"
                  : `Generate ${mode}`}
              </Button>
            </div>
          </div>

          {mode === "video" && (
            <div className="grid gap-1.5">
              <Label htmlFor="imagine-image-url">
                First-frame image URL (optional, animates from the image)
              </Label>
              <Input
                id="imagine-image-url"
                placeholder="https://…"
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {items.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) =>
            item.kind === "image" ? (
              <Card key={item.id} className="overflow-hidden">
                <img
                  src={item.url}
                  alt={item.prompt}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
                <CardContent className="pt-3">
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {item.prompt}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="flex min-h-48 flex-col gap-2 pt-4">
                  {item.status === "succeeded" && item.videoUrl ? (
                    <video
                      src={item.videoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="aspect-video w-full rounded-md bg-black"
                    />
                  ) : item.status === "failed" ? (
                    <p className="text-sm text-destructive">
                      {item.message || "Video generation failed"}
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Skeleton className="aspect-video w-full" />
                      <p className="text-xs text-muted-foreground">
                        {item.status === "running"
                          ? "Rendering video…"
                          : "Video queued — polling for the result…"}
                      </p>
                    </div>
                  )}
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {item.prompt}
                  </p>
                </CardContent>
              </Card>
            ),
          )}
        </div>
      )}
    </div>
  );
}
