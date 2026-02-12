"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
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
import {
  buildVirtualFiles,
  createStackBlitzProject,
  DEFAULT_HTML_FILE,
  DEFAULT_TASK,
  extractLatestHtml,
  getAssistantProgressLabel,
  getFileMapFingerprint,
  getMessageText,
  StackBlitzSDK,
  StackBlitzVM,
  toStackBlitzFileMap,
  waitForContainerLayout,
  WEB_DEV_INSTRUCTIONS,
} from "./web-dev-utils";

const WEB_DEV_THREAD_ID = "web-dev-workspace";

type ViewMode = "files" | "web";

export function WebDevWorkspace({
  initialPrompt,
  initialModel,
}: {
  initialPrompt?: string;
  initialModel?: ChatModel;
}) {
  const [input, setInput] = useState(initialPrompt ?? "");
  const [currentHtml, setCurrentHtml] = useState(DEFAULT_HTML_FILE);
  const [viewMode, setViewMode] = useState<ViewMode>("web");
  const [activeFile, setActiveFile] = useState("index.html");
  const [isBootingContainer, setIsBootingContainer] = useState(false);
  const [containerError, setContainerError] = useState<string | null>(null);
  const stackblitzRef = useRef<HTMLDivElement | null>(null);
  const vmRef = useRef<StackBlitzVM | null>(null);
  const currentHtmlRef = useRef(DEFAULT_HTML_FILE);
  const lastSyncedFingerprintRef = useRef("");
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
  const virtualFiles = useMemo(
    () => buildVirtualFiles(currentHtml),
    [currentHtml],
  );
  const activeFileContent = useMemo(() => {
    return (
      virtualFiles.find((file) => file.path === activeFile)?.content ??
      virtualFiles[0]?.content ??
      ""
    );
  }, [virtualFiles, activeFile]);

  useEffect(() => {
    if (!initialModel?.provider || !initialModel?.model) return;
    appStoreMutate({ chatModel: initialModel });
  }, [initialModel?.provider, initialModel?.model, appStoreMutate]);

  useEffect(() => {
    currentHtmlRef.current = currentHtml;
  }, [currentHtml]);

  useEffect(() => {
    if (virtualFiles.some((file) => file.path === activeFile)) return;
    setActiveFile(virtualFiles[0]?.path ?? "index.html");
  }, [virtualFiles, activeFile]);

  const bootStackBlitz = useCallback(async () => {
    const mountElement = stackblitzRef.current;
    if (vmRef.current || !mountElement || isBootingContainerRef.current) {
      return;
    }

    isBootingContainerRef.current = true;
    setIsBootingContainer(true);
    setContainerError(null);

    try {
      const hasLayout = await waitForContainerLayout(mountElement);
      if (!hasLayout) {
        throw new Error("Container size is not ready yet.");
      }

      const sdk = (await import("@stackblitz/sdk")) as unknown as StackBlitzSDK;
      const files = toStackBlitzFileMap(
        buildVirtualFiles(currentHtmlRef.current || DEFAULT_HTML_FILE),
      );
      const fingerprint = getFileMapFingerprint(files);
      const project = createStackBlitzProject(files);
      const options: Record<string, unknown>[] = [
        {
          openFile: "index.html",
          view: "both",
          clickToLoad: false,
          hideNavigation: false,
          forceEmbedLayout: true,
        },
        {
          openFile: "index.html",
          view: "both",
          clickToLoad: true,
          hideNavigation: false,
          forceEmbedLayout: true,
        },
      ];

      let vm: StackBlitzVM | null = null;
      let lastError: unknown = null;

      for (const option of options) {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            mountElement.replaceChildren();
            vm = await sdk.embedProject(mountElement, project, option);
            break;
          } catch (error) {
            lastError = error;
            await new Promise<void>((resolve) => {
              setTimeout(resolve, 250 + attempt * 200);
            });
          }
        }

        if (vm) break;
      }

      if (!vm) {
        throw lastError ?? new Error("StackBlitz boot failed.");
      }

      vmRef.current = vm;
      lastSyncedFingerprintRef.current = fingerprint;
    } catch (error) {
      console.error(error);
      setContainerError(
        "StackBlitz failed to load here. Showing local preview until retry.",
      );
    } finally {
      isBootingContainerRef.current = false;
      setIsBootingContainer(false);
    }
  }, []);

  const syncProjectToContainer = useCallback(async (html: string) => {
    if (!vmRef.current) return;

    const files = toStackBlitzFileMap(buildVirtualFiles(html));
    const fingerprint = getFileMapFingerprint(files);
    if (lastSyncedFingerprintRef.current === fingerprint) return;

    try {
      await vmRef.current.applyFsDiff({
        create: files,
      });
      lastSyncedFingerprintRef.current = fingerprint;
    } catch (error) {
      console.error(error);
      toast.error("Failed to sync project to StackBlitz");
    }
  }, []);

  useEffect(() => {
    if (viewMode !== "web") return;
    void bootStackBlitz();
  }, [viewMode, bootStackBlitz]);

  useEffect(() => {
    if (
      !generatedHtml ||
      isLoading ||
      generatedHtml === currentHtmlRef.current
    ) {
      return;
    }

    setCurrentHtml(generatedHtml);
  }, [generatedHtml, isLoading]);

  useEffect(() => {
    if (viewMode !== "web" || isBootingContainer || !vmRef.current) return;
    void syncProjectToContainer(currentHtmlRef.current);
  }, [viewMode, isBootingContainer, currentHtml, syncProjectToContainer]);

  useEffect(() => {
    return () => {
      vmRef.current = null;
      isBootingContainerRef.current = false;
      stackblitzRef.current?.replaceChildren();
    };
  }, []);

  return (
    <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-2">
      <section className="min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r">
        <div className="px-4 py-3 border-b text-sm font-medium">
          Builder Chat
          <span className="ml-2 text-xs text-muted-foreground font-normal">
            {(chatModel && `${chatModel.provider}/${chatModel.model}`) ||
              "default model"}{" "}
            | {toolChoice} | mentions {activeMentionsCount}
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
          <span>Preview + Files</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border p-1">
              <Button
                variant={viewMode === "web" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("web")}
              >
                Web View
              </Button>
              <Button
                variant={viewMode === "files" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("files")}
              >
                File Tree
              </Button>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const code = generatedHtml || DEFAULT_HTML_FILE;
                setCurrentHtml(code);
                void syncProjectToContainer(code);
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
                lastSyncedFingerprintRef.current = "";
                stackblitzRef.current?.replaceChildren();
                void bootStackBlitz();
              }}
            >
              <BugIcon className="size-4" />
              Restart Container
            </Button>
          </div>
        </div>

        {viewMode === "web" ? (
          <div className="flex-1 min-h-0 relative">
            {containerError ? (
              <div className="h-full w-full relative">
                <iframe
                  title="Web fallback preview"
                  srcDoc={currentHtml}
                  className="h-full w-full border-0 bg-white"
                  sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
                />
                <div className="absolute inset-x-3 top-3 flex items-center gap-2 rounded-md border bg-background/95 p-2">
                  <p className="text-xs text-destructive">{containerError}</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void bootStackBlitz()}
                  >
                    Retry
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div
                  ref={stackblitzRef}
                  className={cn(
                    "h-full w-full",
                    isBootingContainer && "invisible",
                  )}
                />
                {isBootingContainer && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background">
                    <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Starting StackBlitz container...
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-[260px,1fr] bg-[#1e1e1e] text-[#d4d4d4]">
            <aside className="min-h-0 overflow-auto border-r border-white/10">
              <div className="px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-[#a0a0a0]">
                Explorer
              </div>
              <div className="px-3 py-1 text-xs font-semibold text-[#d0d0d0]">
                PROJECT
              </div>
              {virtualFiles.map((file) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setActiveFile(file.path)}
                  className={cn(
                    "w-full px-5 py-1.5 text-left text-xs transition",
                    activeFile === file.path
                      ? "bg-[#094771] text-[#ffffff]"
                      : "text-[#d4d4d4] hover:bg-[#2a2d2e]",
                  )}
                >
                  {file.path}
                </button>
              ))}
            </aside>
            <section className="min-h-0 flex flex-col">
              <div className="border-b border-white/10 bg-[#252526] px-3 py-2 text-xs">
                {activeFile}
              </div>
              <pre className="flex-1 min-h-0 overflow-auto p-4 text-xs leading-5 font-mono whitespace-pre-wrap">
                {activeFileContent}
              </pre>
            </section>
          </div>
        )}
      </section>
    </div>
  );
}
