import "server-only";

import { generateText } from "ai";
import type { ChatModel } from "app-types/chat";
import { getAutoModelCandidates } from "./model-recommendations";
import { type ProviderModelInfo, customModelProvider } from "./models";

type ResolveWorkingAutoModelOptions = {
  providers: ProviderModelInfo[];
  requireToolCall?: boolean;
  abortSignal?: AbortSignal;
};

export async function resolveWorkingAutoModel({
  providers,
  requireToolCall,
  abortSignal,
}: ResolveWorkingAutoModelOptions): Promise<ChatModel | undefined> {
  const candidates = getAutoModelCandidates(providers, { requireToolCall });

  for (const candidate of candidates) {
    const works = await verifyModel(candidate, abortSignal);
    if (works) {
      return candidate;
    }
  }

  return undefined;
}

async function verifyModel(model: ChatModel, abortSignal?: AbortSignal) {
  try {
    const timeoutSignal = AbortSignal.timeout(8_000);
    const signal =
      abortSignal && "any" in AbortSignal
        ? AbortSignal.any([abortSignal, timeoutSignal])
        : timeoutSignal;

    await generateText({
      model: customModelProvider.getModel(model),
      prompt: "Reply with OK.",
      maxOutputTokens: 4,
      abortSignal: signal,
      maxRetries: 0,
    });
    return true;
  } catch {
    return false;
  }
}
