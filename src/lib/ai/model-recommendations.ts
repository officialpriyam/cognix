import type { ChatModel } from "app-types/chat";

export type PromptCategory = "coding" | "image" | "reasoning" | "general";
export type ImageToolModel = "nvidia" | "google" | "openai";

type ProviderModelInfo = {
  provider: string;
  hasAPIKey: boolean;
  models: {
    name: string;
    isToolCallUnsupported?: boolean;
  }[];
};

type ImageToolAvailability = Partial<Record<ImageToolModel, boolean>>;

export const DEFAULT_CHAT_MODEL: ChatModel = {
  provider: "nvidia",
  model: "minimax-m2.7",
};

export const DEFAULT_IMAGE_TOOL_MODEL: ImageToolModel = "nvidia";

const MODEL_RECOMMENDATIONS: Record<PromptCategory, ChatModel[]> = {
  coding: [
    { provider: "openai", model: "gpt-5.1-codex" },
    { provider: "anthropic", model: "sonnet-4.5" },
    { provider: "google", model: "gemini-3-pro" },
    { provider: "nvidia", model: "qwen3-coder-480b-a35b" },
    { provider: "nvidia", model: "minimax-m2.7" },
    { provider: "groq", model: "qwen3-32b" },
    { provider: "ollama", model: "qwen2.5-coder:14b" },
  ],
  image: [
    { provider: "google", model: "gemini-3-pro" },
    { provider: "openai", model: "gpt-4.1" },
    { provider: "nvidia", model: "mistral-large-3-675b" },
    { provider: "nvidia", model: "llama-4-maverick-17b" },
    DEFAULT_CHAT_MODEL,
  ],
  reasoning: [
    { provider: "openai", model: "gpt-5.1" },
    { provider: "anthropic", model: "opus-4.5" },
    { provider: "google", model: "gemini-3-pro" },
    { provider: "nvidia", model: "minimax-m2.7" },
    { provider: "nvidia", model: "nemotron-3-ultra-550b-a55b" },
    { provider: "nvidia", model: "nemotron-3-super-120b-a12b" },
  ],
  general: [
    DEFAULT_CHAT_MODEL,
    { provider: "nvidia", model: "mistral-large-3-675b" },
    { provider: "nvidia", model: "llama-4-maverick-17b" },
    { provider: "nvidia", model: "llama-3.3-nemotron-super-49b-v1.5" },
    { provider: "openai", model: "gpt-4.1" },
    { provider: "google", model: "gemini-2.5-flash" },
  ],
};

const CODING_PATTERN =
  /\b(code|coding|program|programming|debug|bug|typescript|javascript|python|react|next\.?js|node\.?js|api|sql|schema|compiler|function|component|repo|github|docker|eslint|biome|test|unit test|e2e|refactor)\b/i;

const REASONING_PATTERN =
  /\b(reason|reasoning|think through|solve|proof|math|logic|analyze|compare|strategy|plan|derive|calculate|architecture)\b/i;

const IMAGE_GENERATION_PATTERN =
  /\b(generate|create|make|draw|design|render|paint|illustrate|produce)\b.{0,48}\b(image|photo|picture|poster|banner|logo|icon|avatar|wallpaper|mockup|illustration|art)\b|\b(image|photo|picture|poster|banner|logo|icon|avatar|wallpaper|mockup|illustration|art)\b.{0,48}\b(generate|create|make|draw|design|render|paint|illustrate|produce)\b/i;

export function inferPromptCategory(prompt: string): PromptCategory {
  if (hasImageGenerationIntent(prompt)) {
    return "image";
  }
  if (CODING_PATTERN.test(prompt)) {
    return "coding";
  }
  if (REASONING_PATTERN.test(prompt)) {
    return "reasoning";
  }
  return "general";
}

export function hasImageGenerationIntent(prompt: string) {
  return IMAGE_GENERATION_PATTERN.test(prompt);
}

export function selectRecommendedModelForPrompt({
  prompt,
  providers,
  requestedModel,
  requireToolCall = false,
  respectRequestedModel = false,
}: {
  prompt: string;
  providers: ProviderModelInfo[];
  requestedModel?: ChatModel;
  requireToolCall?: boolean;
  respectRequestedModel?: boolean;
}) {
  const category = inferPromptCategory(prompt);
  const requestedModelAvailable =
    !!requestedModel &&
    isModelAvailable(requestedModel, providers, { requireToolCall });

  if (
    requestedModelAvailable &&
    (respectRequestedModel || category === "general")
  ) {
    return requestedModel;
  }

  return (
    pickAvailableModel(category, providers, { requireToolCall }) ??
    pickAvailableModel("general", providers, { requireToolCall }) ??
    DEFAULT_CHAT_MODEL
  );
}

export function selectImageToolModelForPrompt(
  prompt: string,
  availability: ImageToolAvailability,
) {
  if (!hasImageGenerationIntent(prompt)) {
    return undefined;
  }

  const order: ImageToolModel[] = [
    DEFAULT_IMAGE_TOOL_MODEL,
    "google",
    "openai",
  ];

  return order.find((model) => availability[model]);
}

function pickAvailableModel(
  category: PromptCategory,
  providers: ProviderModelInfo[],
  options?: { requireToolCall?: boolean },
) {
  return MODEL_RECOMMENDATIONS[category].find((model) =>
    isModelAvailable(model, providers, options),
  );
}

function isModelAvailable(
  model: ChatModel,
  providers: ProviderModelInfo[],
  options?: { requireToolCall?: boolean },
) {
  const provider = providers.find((item) => item.provider === model.provider);
  if (!provider?.hasAPIKey) {
    return false;
  }
  const modelInfo = provider.models.find((item) => item.name === model.model);
  if (!modelInfo) {
    return false;
  }
  if (options?.requireToolCall && modelInfo.isToolCallUnsupported) {
    return false;
  }
  return true;
}
