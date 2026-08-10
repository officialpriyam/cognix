"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, UIMessage } from "ai";
import { DEFAULT_AUTO_CHAT_MODEL } from "lib/ai/model-recommendations";
import { cn } from "lib/utils";
import { LogInIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "ui/button";
import { Think } from "ui/think";
import { ErrorMessage, PreviewMessage } from "./message";
import PromptInput from "./prompt-input";

export default function ChatBotGuest() {
  const [input, setInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  const { messages, sendMessage, status, error, setMessages, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat/temporary",
      prepareSendMessagesRequest: ({ messages }) => ({
        body: {
          chatModel: DEFAULT_AUTO_CHAT_MODEL,
          messages,
        },
      }),
    }),
    experimental_throttle: 100,
    onError: () => {
      setMessages((prev) => prev.slice(0, -1));
    },
  });

  const isLoading = useMemo(
    () => status === "streaming" || status === "submitted",
    [status],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
      autoScrollRef.current = isAtBottom;
    };

    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!autoScrollRef.current) return;

    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isLoading]);

  return (
    <div className="flex h-full flex-col">
      {!messages.length && !error && (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-2xl text-center space-y-4">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Start chatting now
            </h1>
            <p className="text-muted-foreground">
              You are in guest mode. Conversations are temporary and not saved.
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button asChild variant="secondary">
                <Link href="/sign-in">
                  <LogInIcon className="size-4" />
                  Sign in
                </Link>
              </Button>
              <Button asChild>
                <Link href="/sign-up">Create account</Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className={cn(
          "flex-1 overflow-y-auto py-6",
          !messages.length && !error && "hidden",
        )}
      >
        {messages.map((message, index) => {
          const isLastMessage = messages.length - 1 === index;

          return (
            <PreviewMessage
              key={message.id}
              messageIndex={index}
              message={message as UIMessage}
              status={status}
              isLoading={isLoading}
              isLastMessage={isLastMessage}
              setMessages={setMessages}
              prevMessage={messages[index - 1] as UIMessage}
              sendMessage={sendMessage}
            />
          );
        })}

        {isLoading && (
          <div className="w-full mx-auto max-w-3xl px-6">
            <Think />
          </div>
        )}

        {error && <ErrorMessage error={error} />}
        <div className="min-h-24" />
      </div>

      <div className="w-full pb-6">
        <PromptInput
          input={input}
          sendMessage={sendMessage}
          setInput={setInput}
          model={DEFAULT_AUTO_CHAT_MODEL}
          setModel={() => {}}
          disabledMention={true}
          toolDisabled
          voiceDisabled
          placeholder="Ask anything..."
          isLoading={isLoading}
          onStop={stop}
        />
      </div>
    </div>
  );
}
