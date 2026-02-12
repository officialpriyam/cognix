"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { ChatModel } from "app-types/chat";
import { cn } from "lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "ui/dialog";
import { Textarea } from "ui/textarea";
import {
  BugIcon,
  ClipboardCopyIcon,
  Loader2Icon,
  RefreshCcwIcon,
  SendIcon,
  SquareIcon,
} from "lucide-react";

const DEFAULT_TASK =
  "Build a responsive SaaS landing page with hero, features, pricing, and FAQ sections.";

const DEFAULT_HTML_FILE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cognix Web Dev Mode</title>
    <style>
      :root {
        color-scheme: light;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto;
        background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
      }
      .card {
        max-width: 640px;
        background: white;
        border-radius: 16px;
        padding: 28px;
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.12);
      }
      h1 {
        margin: 0 0 10px;
        font-size: 28px;
      }
      p {
        margin: 0;
        color: #475569;
        line-height: 1.55;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Web Dev Mode</h1>
      <p>Ask for a website in the left panel. The generated code appears here live.</p>
    </div>
  </body>
</html>`;

const WEB_DEV_INSTRUCTIONS = `You are in Cognix Web Dev Mode.

Rules:
1) Build websites or web app UI based on the user's request.
2) Always return a complete runnable "index.html" in one \`\`\`html\`\`\` code block.
3) Keep external dependencies minimal and avoid package installs unless explicitly asked.
4) If user asks edits, update the full HTML and return the complete file again.
5) After the code block, add a short summary (max 4 lines).`;

type StackBlitzVM = {
  applyFsDiff: (diff: {
    create?: Record<string, string>;
    destroy?: string[];
  }) => Promise<void>;
};

type StackBlitzSDK = {
  embedProject: (
    element: HTMLElement,
    project: {
      title: string;
      description?: string;
      template: string;
      files: Record<string, string>;
    },
    options?: Record<string, unknown>,
  ) => Promise<StackBlitzVM>;
};

const createStackBlitzProject = (indexHtml: string) => ({
  title: "Cognix Web Dev Mode",
  description: "AI powered web app builder in Cognix",
  template: "javascript",
  files: {
    "index.html": indexHtml,
  },
});

function getMessageText(message: UIMessage) {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => {
      return part.type === "text";
    })
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function stripCodeBlocks(text: string) {
  return text.replace(/```[\s\S]*?```/g, "[code updated in StackBlitz]").trim();
}

function extractLatestHtml(messages: UIMessage[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== "assistant") continue;

    const text = getMessageText(message);
    if (!text) continue;

    const htmlMatch = /```html\s*([\s\S]*?)```/i.exec(text);
    if (htmlMatch?.[1]?.trim()) {
      return htmlMatch[1].trim();
    }

    const anyCodeMatch = /```(?:[\w-]+)?\s*([\s\S]*?)```/i.exec(text);
    if (anyCodeMatch?.[1]?.trim()) {
      const code = anyCodeMatch[1].trim();
      if (/<html|<!doctype html|<body|<head/i.test(code)) {
        return code;
      }
    }
  }

  return "";
}

export function WebDevModeDialog({
  open,
  onOpenChange,
  initialPrompt,
  chatModel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPrompt?: string;
  chatModel?: ChatModel;
}) {
  const [input, setInput] = useState("");
  const [currentHtml, setCurrentHtml] = useState(DEFAULT_HTML_FILE);
  const [isBootingContainer, setIsBootingContainer] = useState(false);
  const [containerError, setContainerError] = useState<string | null>(null);
  const stackblitzRef = useRef<HTMLDivElement | null>(null);
  const vmRef = useRef<StackBlitzVM | null>(null);

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat/temporary",
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          messages,
          chatModel,
          instructions: WEB_DEV_INSTRUCTIONS,
        },
      }),
    }),
    experimental_throttle: 100,
  });

  const isLoading = useMemo(
    () => status === "submitted" || status === "streaming",
    [status],
  );

  const generatedHtml = useMemo(() => extractLatestHtml(messages), [messages]);

  const bootStackBlitz = useCallback(async () => {
    if (vmRef.current || !stackblitzRef.current || isBootingContainer) return;

    setIsBootingContainer(true);
    setContainerError(null);

    try {
      const sdk = (await import("@stackblitz/sdk")) as unknown as StackBlitzSDK;
      const vm = await sdk.embedProject(
        stackblitzRef.current,
        createStackBlitzProject(currentHtml || DEFAULT_HTML_FILE),
        {
          openFile: "index.html",
          view: "both",
          clickToLoad: true,
          hideNavigation: true,
          forceEmbedLayout: true,
        },
      );
      vmRef.current = vm;
    } catch (error) {
      console.error(error);
      setContainerError(
        "Could not start embedded StackBlitz. Retry or open StackBlitz in a new tab.",
      );
    } finally {
      setIsBootingContainer(false);
    }
  }, [currentHtml, isBootingContainer]);

  const syncHtmlToContainer = useCallback(async (html: string) => {
    if (!vmRef.current) return;

    try {
      await vmRef.current.applyFsDiff({
        create: {
          "index.html": html,
        },
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to sync code to StackBlitz container");
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    if (initialPrompt?.trim()) {
      setInput(initialPrompt.trim());
    }
    void bootStackBlitz();
  }, [open, initialPrompt, bootStackBlitz]);

  useEffect(() => {
    if (open) return;

    vmRef.current = null;
  }, [open]);

  useEffect(() => {
    if (!generatedHtml) return;

    setCurrentHtml(generatedHtml);
    void syncHtmlToContainer(generatedHtml);
  }, [generatedHtml, syncHtmlToContainer]);

  useEffect(() => {
    if (!open || !vmRef.current) return;
    void syncHtmlToContainer(currentHtml);
  }, [open, currentHtml, syncHtmlToContainer]);

  const submit = () => {
    const prompt = input.trim();
    if (!prompt || isLoading) return;

    sendMessage({
      role: "user",
      parts: [{ type: "text", text: prompt }],
    });
    setInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[96vw] h-[94vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <DialogTitle>Web Dev Mode</DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            <span>Build websites inside Cognix with your selected model.</span>
            <span className="text-xs">
              {chatModel
                ? `${chatModel.provider}/${chatModel.model}`
                : "using default model"}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2">
          <section className="min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r">
            <div className="px-4 py-3 border-b text-sm font-medium">
              Builder Chat
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  <p className="mb-3">
                    Describe what you want to build. Example:
                  </p>
                  <p className="font-mono text-xs">{DEFAULT_TASK}</p>
                </div>
              )}

              {messages.map((message) => {
                const text = getMessageText(message);
                if (!text) return null;

                const content =
                  message.role === "assistant" ? stripCodeBlocks(text) : text;

                return (
                  <div
                    key={message.id}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm whitespace-pre-wrap",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground ml-8"
                        : "bg-muted mr-8",
                    )}
                  >
                    {content || "(no text response)"}
                  </div>
                );
              })}

              {isLoading && (
                <div className="rounded-xl px-3 py-2 text-sm bg-muted mr-8 flex items-center gap-2">
                  <Loader2Icon className="size-4 animate-spin" />
                  Generating website...
                </div>
              )}
            </div>

            <div className="p-4 border-t space-y-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={DEFAULT_TASK}
                className="min-h-24 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    submit();
                  }
                }}
              />
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <Button
                    variant="secondary"
                    className="ml-auto"
                    onClick={() => stop()}
                  >
                    <SquareIcon className="size-4" />
                    Stop
                  </Button>
                ) : (
                  <Button className="ml-auto" onClick={submit}>
                    <SendIcon className="size-4" />
                    Generate
                  </Button>
                )}
              </div>
            </div>
          </section>

          <section className="min-h-0 flex flex-col">
            <div className="px-4 py-3 border-b text-sm font-medium flex items-center gap-2">
              <span>StackBlitz Container</span>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const code = generatedHtml || DEFAULT_HTML_FILE;
                    setCurrentHtml(code);
                    void syncHtmlToContainer(code);
                  }}
                >
                  <RefreshCcwIcon className="size-4" />
                  Reset Code
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(currentHtml);
                      toast.success("Code copied");
                    } catch {
                      toast.error("Unable to copy code");
                    }
                  }}
                >
                  <ClipboardCopyIcon className="size-4" />
                  Copy Code
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    vmRef.current = null;
                    void bootStackBlitz();
                  }}
                >
                  <BugIcon className="size-4" />
                  Restart Container
                </Button>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative">
              <div
                ref={stackblitzRef}
                className={cn(
                  "h-full w-full",
                  (isBootingContainer || containerError) && "invisible",
                )}
              />
              {(isBootingContainer || containerError) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background">
                  {isBootingContainer ? (
                    <>
                      <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Starting real StackBlitz container...
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-destructive">{containerError}</p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void bootStackBlitz()}
                        >
                          Retry
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            window.open(
                              "https://stackblitz.com/edit/js?file=index.html",
                              "_blank",
                              "noopener,noreferrer",
                            );
                          }}
                        >
                          Open StackBlitz
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
