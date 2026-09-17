"use client";

import {
  QWEN_IMAGE_MODELS,
  QWEN_VIDEO_DURATIONS,
  QWEN_VIDEO_MODELS,
  QWEN_VIDEO_RATIOS,
  QWEN_VIDEO_RESOLUTIONS,
} from "lib/ai/image/qwen-models";
import { cn } from "lib/utils";
import {
  ArrowUp,
  Camera,
  Clapperboard,
  Image as ImageIcon,
  Mic,
  Mountain,
  Rocket,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "ui/skeleton";

type Mode = "image" | "video";

/** Ratio keys the image endpoint accepts (per-model pixels are server-side). */
const IMAGE_RATIOS: Record<string, string> = {
  "1:1": "1:1",
  "16:9": "16:9",
  "9:16": "9:16",
  "4:3": "4:3",
  "3:4": "3:4",
};

interface GalleryImage {
  kind: "image";
  id: string;
  url: string;
  mimeType?: string;
  prompt: string;
  model: string;
  ratio: string;
}

interface GalleryVideo {
  kind: "video";
  id: string;
  taskId: string;
  prompt: string;
  model: string;
  ratio: string;
  status: "pending" | "running" | "succeeded" | "failed";
  videoUrl?: string;
  message?: string;
}

type GalleryItem = GalleryImage | GalleryVideo;

interface Preset {
  label: string;
  prompt: string;
  gradient: string;
  icon: typeof Camera;
}

const IMAGE_PRESETS: Preset[] = [
  {
    label: "Portrait",
    prompt:
      "Hyper-detailed portrait photograph, soft window light, shallow depth of field, natural skin texture, 85mm lens look",
    gradient: "from-sky-500/70 via-blue-600/60 to-indigo-900/80",
    icon: Camera,
  },
  {
    label: "Reimagine",
    prompt:
      "Reimagine a quiet mountain lake village at dawn, lanterns glowing, mist over the water, painterly detail",
    gradient: "from-violet-500/70 via-purple-600/60 to-fuchsia-900/80",
    icon: Sparkles,
  },
  {
    label: "Product Shot",
    prompt:
      "Studio product photograph of a matte ceramic coffee mug on a stone pedestal, soft gradient backdrop, rim lighting",
    gradient: "from-amber-500/70 via-orange-600/60 to-stone-900/80",
    icon: ShoppingBag,
  },
  {
    label: "Landscape",
    prompt:
      "Vast desert canyon at golden hour, dramatic clouds, tiny traveler silhouette for scale, epic wide composition",
    gradient: "from-emerald-500/70 via-teal-600/60 to-slate-900/80",
    icon: Mountain,
  },
  {
    label: "Cinematic",
    prompt:
      "Cinematic film still, rain-soaked neon street at night, lone figure with umbrella, anamorphic glow, moody grade",
    gradient: "from-rose-500/70 via-red-600/60 to-zinc-900/80",
    icon: Clapperboard,
  },
  {
    label: "Sci-Fi",
    prompt:
      "Retro-futuristic space station interior, huge viewport showing ringed planet, astronauts floating, crisp detail",
    gradient: "from-cyan-500/70 via-sky-600/60 to-slate-900/80",
    icon: Rocket,
  },
];

const VIDEO_PRESETS: Preset[] = [
  {
    label: "Cinematic",
    prompt:
      "Slow aerial push over a neon coastal city at night, rain reflections, cinematic movement, 8 seconds",
    gradient: "from-rose-500/70 via-red-600/60 to-zinc-900/80",
    icon: Clapperboard,
  },
  {
    label: "Nature",
    prompt:
      "Drone shot gliding above morning mist in a pine valley, sunbeams breaking through, birds scattering",
    gradient: "from-emerald-500/70 via-teal-600/60 to-slate-900/80",
    icon: Mountain,
  },
  {
    label: "Product",
    prompt:
      "Smooth 360-degree orbit around a luxury watch floating on black silk, macro detail, studio lighting",
    gradient: "from-amber-500/70 via-orange-600/60 to-stone-900/80",
    icon: ShoppingBag,
  },
  {
    label: "Portrait",
    prompt:
      "Close-up portrait, gentle smile forming, wind moving hair, shallow depth of field, natural light",
    gradient: "from-sky-500/70 via-blue-600/60 to-indigo-900/80",
    icon: Camera,
  },
  {
    label: "Sci-Fi",
    prompt:
      "Spaceship approaching a glowing ring station, stars streaking past, epic scale, smooth forward motion",
    gradient: "from-cyan-500/70 via-sky-600/60 to-slate-900/80",
    icon: Rocket,
  },
  {
    label: "Reimagine",
    prompt:
      "A paper boat drifting down a rain gutter turning into a river adventure, playful, whimsical motion",
    gradient: "from-violet-500/70 via-purple-600/60 to-fuchsia-900/80",
    icon: Sparkles,
  },
];

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
  const [imageModel, setImageModel] = useState<string>(
    "gemini-2.5-flash-image",
  );
  const [videoModel, setVideoModel] = useState<string>(QWEN_VIDEO_MODELS[0].id);
  const [ratio, setRatio] = useState<string>("1:1");
  const [resolution, setResolution] = useState<string>(
    QWEN_VIDEO_RESOLUTIONS[1],
  );
  const [duration, setDuration] = useState<number>(QWEN_VIDEO_DURATIONS[0]);
  const [imageUrl, setImageUrl] = useState("");
  const [aspectOpen, setAspectOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const pollers = useRef(new Map<string, ReturnType<typeof setInterval>>());
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  useEffect(
    () => () => {
      for (const timer of pollers.current.values()) clearInterval(timer);
      pollers.current.clear();
      recognitionRef.current?.stop();
    },
    [],
  );

  const toggleMic = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ??
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (typeof SpeechRecognition !== "function") {
      toast.error("Voice input is not supported in this browser");
      return;
    }
    try {
      const recognition = new (
        SpeechRecognition as new () => {
          lang: string;
          onresult:
            | ((event: { results: { transcript: string }[][] }) => void)
            | null;
          onend: (() => void) | null;
          onerror: (() => void) | null;
          start: () => void;
          stop: () => void;
        }
      )();
      recognition.lang = "en-US";
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setPrompt((current) =>
            current ? `${current} ${transcript}` : transcript,
          );
        }
      };
      recognition.onend = () => setListening(false);
      recognition.onerror = () => {
        setListening(false);
        toast.error("Voice input failed");
      };
      recognitionRef.current = recognition;
      recognition.start();
      setListening(true);
    } catch {
      toast.error("Voice input failed to start");
    }
  };

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
      const generated: GalleryImage[] = body.images.map(
        (image): GalleryImage => ({
          kind: "image",
          id: `${Date.now()}-${image.url.slice(-12)}`,
          url: image.url,
          mimeType: image.mimeType,
          prompt: trimmed,
          model: imageModel,
          ratio,
        }),
      );
      // Chat-like flow: the new result page appears right below the prompt
      // bar and the view scrolls to it, like sending a message in chat.
      setItems((current) => [...generated, ...current]);
      requestAnimationFrame(() =>
        resultsRef.current?.scrollIntoView({ behavior: "smooth" }),
      );
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
      // Chat-like flow: a pending page for this task opens immediately under
      // the prompt bar and fills in with the video as soon as it is ready.
      setItems((current) => [
        {
          kind: "video",
          id: body.taskId,
          taskId: body.taskId,
          prompt: trimmed,
          model: videoModel,
          ratio,
          status: "pending",
        },
        ...current,
      ]);
      requestAnimationFrame(() =>
        resultsRef.current?.scrollIntoView({ behavior: "smooth" }),
      );
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

  const presets = mode === "image" ? IMAGE_PRESETS : VIDEO_PRESETS;
  const canSend = Boolean(prompt.trim()) && !busy;
  const currentModel = mode === "image" ? imageModel : videoModel;
  const setCurrentModel = mode === "image" ? setImageModel : setVideoModel;
  const modelOptions =
    mode === "image"
      ? [
          { id: "gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image" },
          ...QWEN_IMAGE_MODELS.map((m) => ({ id: m.id, label: m.label })),
        ]
      : QWEN_VIDEO_MODELS;
  const ratioOptions =
    mode === "image"
      ? Object.keys(IMAGE_RATIOS)
      : (QWEN_VIDEO_RATIOS as readonly string[]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 pt-14 md:pt-20">
      <h1 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
        What should we imagine?
      </h1>

      <div className="mt-8 rounded-3xl border bg-card p-4 shadow-xl">
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              void (mode === "image" ? generateImage() : generateVideo());
            }
          }}
          placeholder="Type to imagine"
          rows={3}
          className="w-full resize-none bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full bg-muted p-1">
            {(["image", "video"] as Mode[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  mode === value
                    ? "bg-background text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {value === "image" ? (
                  <ImageIcon className="size-3.5" />
                ) : (
                  <Clapperboard className="size-3.5" />
                )}
                {value}
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setAspectOpen((open) => !open)}
              className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {mode === "video" ? `${resolution} · ` : ""}
              {ratio}
            </button>
            {aspectOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close aspect options"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setAspectOpen(false)}
                />
                <div className="absolute bottom-full z-20 mb-2 flex w-44 flex-col gap-1 rounded-2xl border bg-popover p-2 shadow-xl">
                  {ratioOptions.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setRatio(value);
                        setAspectOpen(false);
                      }}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted",
                        ratio === value
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {value}
                    </button>
                  ))}
                  {mode === "video" && (
                    <>
                      <div className="my-1 border-t" />
                      {QWEN_VIDEO_RESOLUTIONS.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setResolution(value);
                            setAspectOpen(false);
                          }}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted",
                            resolution === value
                              ? "font-semibold text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {value}
                        </button>
                      ))}
                      <div className="my-1 border-t" />
                      {QWEN_VIDEO_DURATIONS.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => {
                            setDuration(value);
                            setAspectOpen(false);
                          }}
                          className={cn(
                            "rounded-lg px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted",
                            duration === value
                              ? "font-semibold text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {value}s
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <select
            value={currentModel}
            onChange={(event) => setCurrentModel(event.target.value)}
            className="h-8 cursor-pointer rounded-full bg-muted px-3 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground"
            aria-label="Generation model"
          >
            {modelOptions.map((model) => (
              <option key={model.id} value={model.id}>
                {mode === "image" && model.id === "gemini-2.5-flash-image"
                  ? "Gemini 2.5 Flash Image"
                  : model.label}
              </option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={toggleMic}
              title="Voice input"
              className={cn(
                "rounded-full p-2 transition-colors hover:bg-muted",
                listening
                  ? "text-red-500"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Mic className="size-4" />
            </button>
            <button
              type="button"
              disabled={!canSend}
              onClick={() =>
                void (mode === "image" ? generateImage() : generateVideo())
              }
              title="Generate"
              className="rounded-full bg-blue-600 p-2.5 text-white transition-opacity hover:bg-blue-500 disabled:opacity-40"
            >
              <ArrowUp className="size-4" />
            </button>
          </div>
        </div>

        {mode === "video" && (
          <div className="mt-3">
            <label
              htmlFor="imagine-first-frame"
              className="mb-1 block text-xs text-muted-foreground"
            >
              First frame (optional — animates from this image)
            </label>
            <input
              id="imagine-first-frame"
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setImageUrl(String(reader.result));
                  toast.success("First frame attached");
                };
                reader.readAsDataURL(file);
              }}
              className="block w-full cursor-pointer rounded-xl border border-dashed text-xs text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
            />
            {imageUrl && (
              <div className="mt-2 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="First frame preview"
                  className="size-10 rounded-md object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div ref={resultsRef} className="mt-8 flex flex-col gap-4 pb-10">
          {items.map((item) => (
            <div
              key={item.id}
              className="overflow-hidden rounded-3xl border bg-card shadow-sm"
            >
              <div className="flex flex-col gap-2 p-4">
                {item.kind === "image" ? (
                  <a href={item.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={item.prompt}
                      className={cn(
                        "w-full rounded-2xl bg-muted object-cover",
                        item.ratio === "9:16" || item.ratio === "3:4"
                          ? "max-h-[70vh]"
                          : "",
                      )}
                      loading="lazy"
                    />
                  </a>
                ) : item.status === "succeeded" && item.videoUrl ? (
                  <video
                    src={item.videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-video w-full rounded-2xl bg-black"
                  />
                ) : item.status === "failed" ? (
                  <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-2xl bg-muted text-sm text-destructive">
                    <Clapperboard className="size-6 opacity-60" />
                    {item.message || "Video generation failed"}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Skeleton className="aspect-video w-full rounded-2xl" />
                    <p className="text-xs text-muted-foreground">
                      {item.status === "running"
                        ? "Rendering video…"
                        : "Video queued — polling for the result…"}
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2 py-0.5 font-medium text-foreground">
                    {item.kind === "image" ? item.model : item.model}
                  </span>
                  <span>{item.ratio}</span>
                  <span className="line-clamp-1 flex-1 basis-full text-muted-foreground/80 sm:basis-auto">
                    {item.prompt}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3">
          {presets.map((preset) => {
            const PresetIcon = preset.icon;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setPrompt(preset.prompt)}
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-br text-left transition-transform hover:scale-[1.02]"
                style={{}}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br",
                    preset.gradient,
                  )}
                />
                <span className="absolute inset-0 flex items-center justify-center">
                  <PresetIcon className="size-10 text-white/70 transition-transform group-hover:scale-110" />
                </span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8 text-sm font-medium text-white">
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
