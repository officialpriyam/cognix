"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChatModel } from "app-types/chat";
import { cn } from "lib/utils";
import {
  BugIcon,
  ClipboardCopyIcon,
  ExternalLinkIcon,
  Loader2Icon,
  RefreshCcwIcon,
  SendIcon,
  SquareIcon,
} from "lucide-react";
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
  DEFAULT_HTML_FILE,
  DEFAULT_TASK,
  StackBlitzSDK,
  StackBlitzVM,
  WEB_DEV_INSTRUCTIONS,
  buildVirtualFiles,
  createStackBlitzProject,
  extractLatestHtml,
  getAssistantDisplayText,
  getFileMapFingerprint,
  getMessageText,
  getStackBlitzEmbedOptions,
  getStackBlitzErrorMessage,
  toStackBlitzFileMap,
  waitForContainerLayout,
} from "./web-dev-utils";

type ViewMode = "files" | "web";

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
  const [viewMode, setViewMode] = useState<ViewMode>("web");
  const [activeFile, setActiveFile] = useState("index.html");
  const [isBootingContainer, setIsBootingContainer] = useState(false);
  const [containerError, setContainerError] = useState<string | null>(null);
  const stackblitzRef = useRef<HTMLDivElement | null>(null);
  const vmRef = useRef<StackBlitzVM | null>(null);
  const currentHtmlRef = useRef(DEFAULT_HTML_FILE);
  const lastSyncedFingerprintRef = useRef("");
  const isBootingContainerRef = useRef(false);

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
      const sdk = (await import("@stackblitz/sdk")) as unknown as StackBlitzSDK;
      const files = toStackBlitzFileMap(
        buildVirtualFiles(currentHtmlRef.current || DEFAULT_HTML_FILE),
      );
      const fingerprint = getFileMapFingerprint(files);
      const project = createStackBlitzProject(files);
      const options = getStackBlitzEmbedOptions();
      const sleep = (delayMs: number) =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, delayMs);
        });

      let vm: StackBlitzVM | null = null;
      let lastError: unknown = null;

      for (let cycle = 0; cycle < 3 && !vm; cycle += 1) {
        const hasLayout = await waitForContainerLayout(
          mountElement,
          4000 + cycle * 3000,
        );
        if (!hasLayout) {
          lastError = new Error("Container size is not ready yet.");
          continue;
        }

        for (const option of options) {
          for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
              if (!mountElement.isConnected) {
                throw new Error("Container is no longer mounted.");
              }

              mountElement.replaceChildren();
              vm = await sdk.embedProject(mountElement, project, option);
              break;
            } catch (error) {
              lastError = error;
              await sleep(250 + attempt * 200);
            }
          }

          if (vm) break;
        }

        if (!vm) {
          await sleep(220 + cycle * 160);
        }
      }

      if (!vm) {
        throw lastError ?? new Error("StackBlitz boot failed.");
      }

      vmRef.current = vm;
      lastSyncedFingerprintRef.current = fingerprint;
    } catch (error) {
      console.error(error);
      setContainerError(getStackBlitzErrorMessage(error));
    } finally {
      isBootingContainerRef.current = false;
      setIsBootingContainer(false);
    }
  }, []);

  const openStackBlitzInNewTab = useCallback(async () => {
    try {
      const sdk = (await import("@stackblitz/sdk")) as unknown as StackBlitzSDK;
      const files = toStackBlitzFileMap(
        buildVirtualFiles(currentHtmlRef.current || DEFAULT_HTML_FILE),
      );
      const project = createStackBlitzProject(files);
      sdk.openProject(project, {
        openFile: "index.html",
        showSidebar: true,
        sidebarView: "project",
        startScript: "dev",
        terminalHeight: 32,
        view: "default",
      });
    } catch (error) {
      console.error(error);
      toast.error("Unable to open StackBlitz in a new tab");
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
    if (!open) return;

    if (initialPrompt?.trim()) {
      setInput(initialPrompt.trim());
    }

    if (viewMode === "web") {
      void bootStackBlitz();
    }
  }, [open, initialPrompt, viewMode, bootStackBlitz]);

  useEffect(() => {
    if (open) return;

    vmRef.current = null;
    isBootingContainerRef.current = false;
    lastSyncedFingerprintRef.current = "";
    stackblitzRef.current?.replaceChildren();
  }, [open]);

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
    if (!open || viewMode !== "web" || isBootingContainer || !vmRef.current) {
      return;
    }

    void syncProjectToContainer(currentHtmlRef.current);
  }, [open, viewMode, isBootingContainer, currentHtml, syncProjectToContainer]);

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

              {messages.map((message, messageIndex) => {
                const text = getMessageText(message);
                if (!text) return null;

                const content =
                  message.role === "assistant"
                    ? getAssistantDisplayText(messages, messageIndex, text)
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
              <span>Preview + Files</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-normal",
                  containerError
                    ? "bg-amber-500/15 text-amber-600"
                    : "bg-emerald-500/15 text-emerald-600",
                )}
              >
                {containerError ? "Local preview active" : "StackBlitz active"}
              </span>
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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void openStackBlitzInNewTab()}
                >
                  <ExternalLinkIcon className="size-4" />
                  Open StackBlitz
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
                      <p className="text-xs text-destructive">
                        {containerError}
                        <span className="ml-2 text-foreground">
                          Retry to restore StackBlitz file tree and terminal.
                        </span>
                      </p>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void bootStackBlitz()}
                      >
                        Retry
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void openStackBlitzInNewTab()}
                      >
                        Open in Tab
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
                  <div className="border-t border-white/10 bg-[#181818]">
                    <div className="px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-[#a0a0a0]">
                      Terminal
                    </div>
                    <pre className="px-3 pb-3 text-xs leading-5 font-mono whitespace-pre-wrap text-[#d4d4d4]">
                      {containerError
                        ? [
                            "> StackBlitz container is offline in this pane.",
                            "> Local preview is still working.",
                            "> Use Web View > Retry to restore container terminal.",
                          ].join("\n")
                        : [
                            "> npm run dev",
                            "> vite --host 0.0.0.0 --port 5173",
                          ].join("\n")}
                    </pre>
                  </div>
                </section>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
