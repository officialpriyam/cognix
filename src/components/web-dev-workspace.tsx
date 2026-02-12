"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { ChatModel } from "app-types/chat";
import { cn } from "lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { appStore } from "@/app/store";
import { useShallow } from "zustand/shallow";
import { toast } from "sonner";
import { Button } from "ui/button";
import PromptInput from "./prompt-input";
import {
  BugIcon,
  ClipboardCopyIcon,
  Loader2Icon,
  RefreshCcwIcon,
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

const WEB_DEV_THREAD_ID = "web-dev-workspace";

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

function hasCodeBlock(text: string) {
  return /```[\s\S]*?```/.test(text);
}

function inferWorkingFileName(text: string) {
  const fileHint = /(?:^|\n)\s*(?:file|filename)\s*[:=-]\s*([^\n`]+)/i.exec(
    text,
  );
  if (fileHint?.[1]?.trim()) {
    return fileHint[1].trim();
  }

  if (/```css/i.test(text)) {
    return "styles.css";
  }

  if (/```(?:js|javascript|ts|typescript)/i.test(text)) {
    return "script.js";
  }

  return "index.html";
}

function getAssistantProgressLabel(
  messages: UIMessage[],
  messageIndex: number,
  text: string,
) {
  const fileName = inferWorkingFileName(text);
  if (!hasCodeBlock(text)) {
    return `Writing ${fileName}...`;
  }

  let codeMessageCount = 0;
  for (let i = 0; i <= messageIndex; i += 1) {
    const message = messages[i];
    if (message.role !== "assistant") continue;

    const assistantText = getMessageText(message);
    if (assistantText && hasCodeBlock(assistantText)) {
      codeMessageCount += 1;
    }
  }

  const action = codeMessageCount <= 1 ? "Creating" : "Editing";
  return `${action} ${fileName}...`;
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

export function WebDevWorkspace({
  initialPrompt,
  initialModel,
}: {
  initialPrompt?: string;
  initialModel?: ChatModel;
}) {
  const [input, setInput] = useState(initialPrompt ?? "");
  const [currentHtml, setCurrentHtml] = useState(DEFAULT_HTML_FILE);
  const [showFilesPanel, setShowFilesPanel] = useState(false);
  const [activeFile, setActiveFile] = useState("index.html");
  const [isBootingContainer, setIsBootingContainer] = useState(false);
  const [containerError, setContainerError] = useState<string | null>(null);
  const stackblitzRef = useRef<HTMLDivElement | null>(null);
  const vmRef = useRef<StackBlitzVM | null>(null);
  const currentHtmlRef = useRef(DEFAULT_HTML_FILE);
  const lastSyncedHtmlRef = useRef(DEFAULT_HTML_FILE);
  const isBootingContainerRef = useRef(false);

  const [chatModel, toolChoice, threadMentions, appStoreMutate] = appStore(
    useShallow((state) => [
      state.chatModel,
      state.toolChoice,
      state.threadMentions,
      state.mutate,
    ]),
  );

  const { messages, sendMessage, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat/temporary",
      prepareSendMessagesRequest: ({ messages }) => {
        const state = appStore.getState();
        const mentions = state.threadMentions[WEB_DEV_THREAD_ID] ?? [];
        const mentionsPrompt = mentions.length
          ? `\n\nActive tools/mentions:\n${mentions
              .map((mention) => `- ${mention.type}: ${mention.name}`)
              .join("\n")}`
          : "";

        return {
          body: {
            messages,
            chatModel: state.chatModel ?? initialModel,
            instructions: `${WEB_DEV_INSTRUCTIONS}\n\nTool mode: ${state.toolChoice}.${mentionsPrompt}`,
          },
        };
      },
    }),
    experimental_throttle: 100,
  });

  const isLoading = useMemo(
    () => status === "submitted" || status === "streaming",
    [status],
  );

  const generatedHtml = useMemo(() => extractLatestHtml(messages), [messages]);
  const activeMentionsCount = threadMentions[WEB_DEV_THREAD_ID]?.length ?? 0;

  useEffect(() => {
    if (!initialModel?.provider || !initialModel?.model) return;

    appStoreMutate({ chatModel: initialModel });
  }, [initialModel?.provider, initialModel?.model, appStoreMutate]);

  useEffect(() => {
    currentHtmlRef.current = currentHtml;
  }, [currentHtml]);

  const bootStackBlitz = useCallback(async () => {
    const mountElement = stackblitzRef.current;
    if (vmRef.current || !mountElement || isBootingContainerRef.current) {
      return;
    }

    isBootingContainerRef.current = true;
    setIsBootingContainer(true);
    setContainerError(null);

    try {
      const sdk = (await import("@stackblitz/sdk")) as unknown as StackBlitzSDK;
      let vm: StackBlitzVM | null = null;
      let lastError: unknown = null;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          mountElement.replaceChildren();
          vm = await sdk.embedProject(
            mountElement,
            createStackBlitzProject(
              currentHtmlRef.current || DEFAULT_HTML_FILE,
            ),
            {
              openFile: "index.html",
              view: "both",
              clickToLoad: false,
              hideNavigation: false,
              forceEmbedLayout: true,
            },
          );
          break;
        } catch (error) {
          lastError = error;
          if (attempt === 0) {
            await new Promise<void>((resolve) => {
              setTimeout(resolve, 350);
            });
          }
        }
      }

      if (!vm) {
        throw lastError ?? new Error("Could not start StackBlitz");
      }

      vmRef.current = vm;
      lastSyncedHtmlRef.current = currentHtmlRef.current;
    } catch (error) {
      console.error(error);
      setContainerError("Could not start embedded StackBlitz. Please retry.");
    } finally {
      isBootingContainerRef.current = false;
      setIsBootingContainer(false);
    }
  }, []);

  const syncHtmlToContainer = useCallback(async (html: string) => {
    if (!vmRef.current || lastSyncedHtmlRef.current === html) return;

    try {
      await vmRef.current.applyFsDiff({
        create: {
          "index.html": html,
        },
      });
      lastSyncedHtmlRef.current = html;
    } catch (error) {
      console.error(error);
      toast.error("Failed to sync code to StackBlitz container");
    }
  }, []);

  useEffect(() => {
    void bootStackBlitz();
  }, [bootStackBlitz]);

  useEffect(() => {
    if (
      !generatedHtml ||
      isLoading ||
      generatedHtml === currentHtmlRef.current
    ) {
      return;
    }

    setCurrentHtml(generatedHtml);
    void syncHtmlToContainer(generatedHtml);
  }, [generatedHtml, isLoading, syncHtmlToContainer]);

  useEffect(() => {
    if (isBootingContainer || !vmRef.current) return;
    void syncHtmlToContainer(currentHtmlRef.current);
  }, [isBootingContainer, syncHtmlToContainer]);

  return (
    <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-2">
      <section className="min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r">
        <div className="px-4 py-3 border-b text-sm font-medium">
          Builder Chat
          <span className="ml-2 text-xs text-muted-foreground font-normal">
            {(chatModel && `${chatModel.provider}/${chatModel.model}`) ||
              "default model"}{" "}
            · {toolChoice} · mentions {activeMentionsCount}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              <p className="mb-3">Describe what you want to build. Example:</p>
              <p className="font-mono text-xs">{DEFAULT_TASK}</p>
            </div>
          )}

          {messages.map((message, messageIndex) => {
            const text = getMessageText(message);
            if (!text) return null;

            const content =
              message.role === "assistant"
                ? getAssistantProgressLabel(messages, messageIndex, text)
                : text;

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
              Coding index.html...
            </div>
          )}
        </div>

        <div className="border-t py-2">
          <PromptInput
            input={input}
            setInput={setInput}
            sendMessage={sendMessage}
            onStop={stop}
            isLoading={isLoading}
            placeholder={DEFAULT_TASK}
            threadId={WEB_DEV_THREAD_ID}
            voiceDisabled
            webDevDisabled
          />
        </div>
      </section>

      <section className="min-h-0 flex flex-col">
        <div className="px-4 py-3 border-b text-sm font-medium flex items-center gap-2">
          <span>StackBlitz Container</span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowFilesPanel((prev) => !prev)}
            >
              {showFilesPanel ? "Hide Files" : "Show Files"}
            </Button>
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
                lastSyncedHtmlRef.current = "";
                stackblitzRef.current?.replaceChildren();
                void bootStackBlitz();
              }}
            >
              <BugIcon className="size-4" />
              Restart Container
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
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
                      Starting StackBlitz container...
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-destructive">{containerError}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void bootStackBlitz()}
                    >
                      Retry
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {showFilesPanel && (
            <div className="h-64 min-h-0 border-t grid grid-cols-[180px,1fr]">
              <div className="border-r bg-muted/30 p-2 space-y-2">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  Files
                </p>
                <button
                  type="button"
                  onClick={() => setActiveFile("index.html")}
                  className={cn(
                    "w-full rounded-md px-2 py-1.5 text-left text-xs transition",
                    activeFile === "index.html"
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  index.html
                </button>
              </div>
              <div className="min-h-0 overflow-auto">
                <div className="border-b px-3 py-2 text-xs font-medium">
                  {activeFile}
                </div>
                <pre className="p-3 text-xs leading-5 whitespace-pre-wrap font-mono">
                  {currentHtml}
                </pre>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
