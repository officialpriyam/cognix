"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ChatModel } from "app-types/chat";
import { WebDevWorkspace } from "@/components/web-dev-workspace";

export default function WebDevPage() {
  const searchParams = useSearchParams();

  const initialPrompt = searchParams.get("prompt")?.trim() || undefined;

  const initialModel = useMemo<ChatModel | undefined>(() => {
    const provider = searchParams.get("provider")?.trim();
    const model = searchParams.get("model")?.trim();

    if (!provider || !model) {
      return undefined;
    }

    return { provider, model };
  }, [searchParams]);

  return (
    <div className="h-full overflow-hidden">
      <WebDevWorkspace
        initialPrompt={initialPrompt}
        initialModel={initialModel}
      />
    </div>
  );
}
