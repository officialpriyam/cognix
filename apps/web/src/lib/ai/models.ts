import "server-only";

// ✅ Register AI Gateway provider globally (MUST be first import)
// This registers the gateway provider at module load time, ensuring it's
// initialized once and reused across all requests. This eliminates per-request
// provider initialization overhead (~500-1000ms savings per request).
import "./register-gateway-provider";

// AI Gateway: No need to import @ai-sdk/openai, @ai-sdk/google, etc.
// These are now handled by AI Gateway using string model IDs
import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { LanguageModel } from "ai";
import { ChatModel } from "app-types/chat";
import { userRepository } from "lib/db/repository";
import { createOllama } from "ollama-ai-provider-v2";
import {
  createOpenAICompatibleModels,
  openaiCompatibleModelsSafeParse,
} from "./create-openai-compatiable";
import {
  ANTHROPIC_FILE_MIME_TYPES,
  DEFAULT_FILE_PART_MIME_TYPES,
  GEMINI_FILE_MIME_TYPES,
  OPENAI_FILE_MIME_TYPES,
  XAI_FILE_MIME_TYPES,
} from "./file-support";
import { getTensorXModel } from "./providers/tensorx";
import {
  COGNIXOWN_QODER_ID,
  COGNIXOWN_RELAY_ID,
  getCognixOwnConfig,
  normalizeCognixOwnBaseUrl,
  recordCognixOwnUsage,
} from "./providers/cognixown";

const ollama = createOllama({
  baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/api",
});
const groq = createGroq({
  baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});
// OpenRouter (OpenAI-compatible). Free-tier models are addressed by their full
// slugs (e.g. "z-ai/glm-5.2:free"); "openrouter/free" is OpenRouter's own
// router over the free pool. Referer/title headers are OpenRouter convention.
const openrouter = createOpenAICompatible({
  name: "openrouter",
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    "HTTP-Referer":
      process.env.NEXT_PUBLIC_BASE_URL ?? "https://cognix.iampriyam.me",
    "X-Title": "Cognix",
  },
});
// CognixOwn (self-hosted LM Studio, OpenAI-compatible). Display names are
// "Qoder" (Qwen) and "Relay" (Gemma); the category label is "CognixOwn".
// The Bearer token stays in server env (COGNIXOWN_API_KEY) — clients,
// including the desktop app, go through the /api/cognixown/v1 proxy.
const cognixown = createOpenAICompatible({
  name: "cognixown",
  baseURL: normalizeCognixOwnBaseUrl(process.env.COGNIXOWN_BASE_URL),
  apiKey: process.env.COGNIXOWN_API_KEY || "not-configured",
});

const staticModels = {
  // Navigator (Moonshot AI Kimi K2.5 via AI Gateway) - Primary model
  Navigator: {
    "Base model": "moonshotai/kimi-k2.5",
  },
  anthropic: {
    "claude-sonnet-5": "anthropic/claude-sonnet-5",
    "claude-opus-4.8": "anthropic/claude-opus-4.8",
    "claude-fable-5": "anthropic/claude-fable-5",
  },
  deepseek: {
    "deepseek-r1": "deepseek/deepseek-r1",
    "deepseek-v3.2": "deepseek/deepseek-v3.2",
  },
  google: {
    "gemini-2.5-flash": "google/gemini-2.5-flash",
    "gemini-2.5-flash-lite": "google/gemini-2.5-flash-lite",
    "gemini-2.5-pro": "google/gemini-2.5-pro",
    "gemini-3-flash-preview": "google/gemini-3-flash-preview",
    "gemini-3.1-pro-preview": "google/gemini-3.1-pro-preview",
    "gemini-3.1-flash-lite": "google/gemini-3.1-flash-lite",
    "gemini-3.5-flash": "google/gemini-3.5-flash",
    "gemini-3.5-flash-lite": "google/gemini-3.5-flash-lite",
    "gemini-3.6-flash": "google/gemini-3.6-flash",
    "gemini-3.7-flash": "google/gemini-3.7-flash",
    "gemini-3.8-flash": "google/gemini-3.8-flash",
    // embedding (not visible in UI)
    "gemini-embedding-001": "google/gemini-embedding-001",
    // image (not visible in UI)
    "gemini-2.5-flash-image": "google/gemini-2.5-flash-image",
  },
  mistral: {
    "mistral-large-3": "mistral/mistral-large-3",
    "magistral-small": "mistral/magistral-small",
    "devstral-2": "mistral/devstral-2",
    // embedding (not visible in UI)
    "mistral-embed": "mistral/mistral-embed",
  },
  moonshotai: {
    "kimi-k2.6": "moonshotai/kimi-k2.6",
    "kimi-k3": "moonshotai/kimi-k3",
  },
  openai: {
    // GPT-5.6 family: Sol (flagship), Terra (balanced), Luna (fast/cheap)
    "gpt-5.6-sol": "openai/gpt-5.6-sol",
    "gpt-5.6-terra": "openai/gpt-5.6-terra",
    "gpt-5.6-luna": "openai/gpt-5.6-luna",
    // embedding (not visible in UI)
    "text-embedding-3-small": "openai/text-embedding-3-small",
    "text-embedding-3-large": "openai/text-embedding-3-large",
    // image (not visible in UI)
    "gpt-5-nano": "openai/gpt-5-nano",
    "gpt-5": "openai/gpt-5",
  },
  zai: {
    "glm-5.2": "zai/glm-5.2",
  },
  alibaba: {
    "qwen3.7-max": "alibaba/qwen3.7-max",
    "qwen3.7-plus": "alibaba/qwen3.7-plus",
  },
  cohere: {
    // embedding (not visible in UI)
    "embed-v4.0": "cohere/embed-v4.0",
  },
  xai: {
    "grok-4.5": "xai/grok-4.5",
    "grok-4.3": "xai/grok-4.3",
  },
  // Separate services (keep SDK format)
  ollama: {
    "gemma3:1b": ollama("gemma3:1b"),
    "gemma3:4b": ollama("gemma3:4b"),
    "gemma3:12b": ollama("gemma3:12b"),
  },
  // Groq inference provider (for Groq-hosted models)
  groq: {
    "gpt-oss-120b": groq("openai/gpt-oss-120b"),
  },
  // OpenRouter free-tier models (hidden unless OPENROUTER_API_KEY is set).
  // Pool rotates over time; snapshot of the :free list + the openrouter/free
  // router. Tool/image flags mirror each model's advertised capabilities.
  openrouter: {
    "glm-5.2": openrouter("z-ai/glm-5.2:free"),
    "north-mini-code": openrouter("cohere/north-mini-code:free"),
    "dots-3-note": openrouter("dots-studio/dots-3-note-preview:free"),
    "gemma-4-26b": openrouter("google/gemma-4-26b-a4b-it:free"),
    "gemma-4-31b": openrouter("google/gemma-4-31b-it:free"),
    "ling-3-flash-fin": openrouter("inclusionai/ling-3.0-flash-fin:free"),
    "ling-3-flash-sante": openrouter("inclusionai/ling-3.0-flash-sante:free"),
    "ling-3-flash-vl": openrouter("inclusionai/ling-3.0-flash-vl:free"),
    "lfm-2.5-2.6b": openrouter("liquid/lfm-2.5-2.6b:free"),
    "nex-n2.5-mini": openrouter("nex-agi/nex-n2.5-mini:free"),
    "nex-n2.5-pro": openrouter("nex-agi/nex-n2.5-pro:free"),
    "nemotron-3-nano-omni": openrouter(
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
    ),
    "nemotron-3-super": openrouter("nvidia/nemotron-3-super-120b-a12b:free"),
    "nemotron-3-ultra": openrouter("nvidia/nemotron-3-ultra-550b-a55b:free"),
    "nemotron-3.5-lightning": openrouter("nvidia/nemotron-3.5-lightning:free"),
    "nemotron-3.5-content-safety": openrouter(
      "nvidia/nemotron-3.5-content-safety:free",
    ),
    "free-router": openrouter("openrouter/free"),
    "laguna-s-2.1": openrouter("poolside/laguna-s-2.1:free"),
    "laguna-xs-2.1": openrouter("poolside/laguna-xs-2.1:free"),
    inkling: openrouter("thinkingmachines/inkling:free"),
    "inkling-small": openrouter("thinkingmachines/inkling-small:free"),
  },
  // CognixOwn self-hosted models (hidden unless COGNIXOWN_API_KEY is set).
  CognixOwn: {
    Qoder: cognixown(COGNIXOWN_QODER_ID),
    Relay: cognixown(COGNIXOWN_RELAY_ID),
  },
};

// Models that should not be visible in the UI (embedding and image generation models)
const hiddenModels = new Set([
  // Embedding models
  staticModels.google["gemini-embedding-001"],
  staticModels.mistral["mistral-embed"],
  staticModels.openai["text-embedding-3-small"],
  staticModels.openai["text-embedding-3-large"],
  staticModels.cohere["embed-v4.0"],
  // Image generation models
  staticModels.google["gemini-2.5-flash-image"],
  staticModels.openai["gpt-5-nano"],
  staticModels.openai["gpt-5"],
]);

const staticUnsupportedModels = new Set([
  staticModels.ollama["gemma3:1b"],
  staticModels.ollama["gemma3:4b"],
  staticModels.ollama["gemma3:12b"],
  // OpenRouter free models that don't advertise tool calling
  staticModels.openrouter["glm-5.2"],
  staticModels.openrouter["nemotron-3.5-content-safety"],
]);

// List of model IDs that support image input (now strings from AI Gateway)
const staticSupportImageInputModelIds = new Set([
  // Google models (all multimodal)
  staticModels.google["gemini-2.5-flash"],
  staticModels.google["gemini-2.5-flash-lite"],
  staticModels.google["gemini-2.5-pro"],
  staticModels.google["gemini-3-flash-preview"],
  staticModels.google["gemini-3.1-pro-preview"],
  staticModels.google["gemini-3.1-flash-lite"],
  staticModels.google["gemini-3.5-flash"],
  staticModels.google["gemini-3.5-flash-lite"],
  staticModels.google["gemini-3.6-flash"],
  staticModels.google["gemini-3.7-flash"],
  staticModels.google["gemini-3.8-flash"],
  // Anthropic models
  staticModels.anthropic["claude-sonnet-5"],
  staticModels.anthropic["claude-opus-4.8"],
  staticModels.anthropic["claude-fable-5"],
  // OpenAI models
  staticModels.openai["gpt-5.6-sol"],
  staticModels.openai["gpt-5.6-terra"],
  staticModels.openai["gpt-5.6-luna"],
  // Moonshot AI models
  staticModels.Navigator["Base model"],
  staticModels.moonshotai["kimi-k2.6"],
  staticModels.moonshotai["kimi-k3"],
  // xAI models
  staticModels.xai["grok-4.5"],
  staticModels.xai["grok-4.3"],
  // Alibaba models (Qwen 3.7 Plus supports vision input)
  staticModels.alibaba["qwen3.7-plus"],
  // OpenRouter free models with image input
  staticModels.openrouter["dots-3-note"],
  staticModels.openrouter["gemma-4-26b"],
  staticModels.openrouter["gemma-4-31b"],
  staticModels.openrouter["ling-3-flash-vl"],
  staticModels.openrouter["nex-n2.5-mini"],
  staticModels.openrouter["nex-n2.5-pro"],
  staticModels.openrouter["nemotron-3-nano-omni"],
  staticModels.openrouter["nemotron-3.5-content-safety"],
  staticModels.openrouter["free-router"],
  staticModels.openrouter["inkling"],
  staticModels.openrouter["inkling-small"],
]);

const staticFilePartSupportByModel = new Map<
  LanguageModel,
  readonly string[]
>();

const registerFileSupport = (
  model: LanguageModel | undefined,
  mimeTypes: readonly string[] = DEFAULT_FILE_PART_MIME_TYPES,
) => {
  if (!model) return;
  staticFilePartSupportByModel.set(model, Array.from(mimeTypes));
};

// OpenAI file support
registerFileSupport(staticModels.openai["gpt-5.6-sol"], OPENAI_FILE_MIME_TYPES);
registerFileSupport(
  staticModels.openai["gpt-5.6-terra"],
  OPENAI_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.openai["gpt-5.6-luna"],
  OPENAI_FILE_MIME_TYPES,
);

// Google file support
registerFileSupport(
  staticModels.google["gemini-2.5-flash"],
  GEMINI_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.google["gemini-2.5-flash-lite"],
  GEMINI_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.google["gemini-2.5-pro"],
  GEMINI_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.google["gemini-3-flash-preview"],
  GEMINI_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.google["gemini-3.1-pro-preview"],
  GEMINI_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.google["gemini-3.1-flash-lite"],
  GEMINI_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.google["gemini-3.5-flash"],
  GEMINI_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.google["gemini-3.5-flash-lite"],
  GEMINI_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.google["gemini-3.6-flash"],
  GEMINI_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.google["gemini-3.7-flash"],
  GEMINI_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.google["gemini-3.8-flash"],
  GEMINI_FILE_MIME_TYPES,
);

// Anthropic file support
registerFileSupport(
  staticModels.anthropic["claude-sonnet-5"],
  ANTHROPIC_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.anthropic["claude-opus-4.8"],
  ANTHROPIC_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.anthropic["claude-fable-5"],
  ANTHROPIC_FILE_MIME_TYPES,
);

// xAI file support
registerFileSupport(staticModels.xai["grok-4.5"], XAI_FILE_MIME_TYPES);
registerFileSupport(staticModels.xai["grok-4.3"], XAI_FILE_MIME_TYPES);

// Moonshot AI file support
registerFileSupport(
  staticModels.Navigator["Base model"],
  DEFAULT_FILE_PART_MIME_TYPES,
);
registerFileSupport(
  staticModels.moonshotai["kimi-k2.6"],
  DEFAULT_FILE_PART_MIME_TYPES,
);
registerFileSupport(
  staticModels.moonshotai["kimi-k3"],
  DEFAULT_FILE_PART_MIME_TYPES,
);

// OpenRouter vision-capable free models
for (const name of [
  "dots-3-note",
  "gemma-4-26b",
  "gemma-4-31b",
  "ling-3-flash-vl",
  "nex-n2.5-mini",
  "nex-n2.5-pro",
  "nemotron-3-nano-omni",
  "nemotron-3.5-content-safety",
  "free-router",
  "inkling",
  "inkling-small",
] as const) {
  registerFileSupport(
    staticModels.openrouter[name],
    DEFAULT_FILE_PART_MIME_TYPES,
  );
}

const openaiCompatibleProviders = openaiCompatibleModelsSafeParse(
  process.env.OPENAI_COMPATIBLE_DATA,
);

const {
  providers: openaiCompatibleModels,
  unsupportedModels: openaiCompatibleUnsupportedModels,
} = createOpenAICompatibleModels(openaiCompatibleProviders);

const allModels = { ...openaiCompatibleModels, ...staticModels };

const allUnsupportedModels = new Set([
  ...openaiCompatibleUnsupportedModels,
  ...staticUnsupportedModels,
]);

export const isToolCallUnsupportedModel = (model: LanguageModel | string) => {
  // For string models (AI Gateway), check if it's in the unsupported set
  if (typeof model === "string") {
    return Array.from(allUnsupportedModels).some(
      (m) => typeof m === "string" && m === model,
    );
  }
  return allUnsupportedModels.has(model);
};

const isImageInputUnsupportedModel = (model: LanguageModel | string) => {
  // For string models (AI Gateway), check membership directly.
  if (typeof model === "string") {
    return !staticSupportImageInputModelIds.has(model);
  }
  // SDK instances span mixed provider SDK generations whose types don't all
  // satisfy this `ai` version's LanguageModel, so compare by identity instead
  // of Set.has (whose parameter is bound to the inferred element union).
  return !Array.from(staticSupportImageInputModelIds).some((m) => m === model);
};

export const getFilePartSupportedMimeTypes = (model: LanguageModel) => {
  return staticFilePartSupportByModel.get(model) ?? [];
};

/**
 * AI Gateway ID for workflow video → process text (upload / screen recording).
 * Matches `staticModels.google["gemini-3.1-pro-preview"]`; override with
 * `NAVIGATOR_SCREEN_VIDEO_MODEL` in the analyze-video route.
 */
export const defaultNavigatorScreenVideoModelId =
  staticModels.google["gemini-3.1-pro-preview"];

/**
 * Model used by the project-brain pipeline: the tool-sync agent that pulls data
 * from connected tools and the extraction step that generates the To-dos /
 * Progress widget data. Kimi K2.5 (the Navigator base model).
 */
export const projectBrainModelId = staticModels.Navigator["Base model"];

const fallbackModel = staticModels.openai["gpt-5.6-terra"]; // "openai/gpt-5.6-terra"

export const customModelProvider = {
  modelsInfo: Object.entries(allModels).map(([provider, models]) => ({
    provider,
    models: Object.entries(models)
      .filter(([_name, model]) => !hiddenModels.has(model)) // Filter out embedding and image models
      .map(([name, model]) => ({
        name,
        isToolCallUnsupported: isToolCallUnsupportedModel(model),
        isImageInputUnsupported: isImageInputUnsupportedModel(model),
        supportedFileMimeTypes: [...getFilePartSupportedMimeTypes(model)],
      })),
    hasAPIKey: checkProviderAPIKey(provider as keyof typeof staticModels),
  })),
  getModel: (model?: ChatModel): LanguageModel | string => {
    if (!model) return fallbackModel;
    const resolved = allModels[model.provider]?.[model.model];
    if (!resolved) {
      // Falling back is deliberate (never fail a chat over a stale model id),
      // but a caller that hardcodes an id we do not register would otherwise
      // run on the fallback forever without a trace. Surface it outside prod.
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[models] unknown model "${model.provider}/${model.model}" - using fallback "${fallbackModel}"`,
        );
      }
      return fallbackModel;
    }
    return resolved;
  },
};

function checkProviderAPIKey(provider: keyof typeof staticModels) {
  let key: string | undefined;
  switch (provider) {
    case "openai":
    case "google":
    case "anthropic":
    case "xai":
    case "Navigator":
    case "deepseek":
    case "mistral":
    case "moonshotai":
    case "zai":
    case "alibaba":
    case "cohere":
      // AI Gateway providers - use AI_GATEWAY_API_KEY
      key = process.env.AI_GATEWAY_API_KEY;
      break;
    case "groq":
      key = process.env.GROQ_API_KEY;
      break;
    case "openrouter":
      key = process.env.OPENROUTER_API_KEY;
      break;
    case "CognixOwn":
      key = process.env.COGNIXOWN_API_KEY;
      break;
    case "ollama":
      // Ollama requires a base URL to be configured
      key = process.env.OLLAMA_BASE_URL;
      break;
    default:
      return true; // assume the provider has an API key
  }
  return !!key && key != "****";
}

/**
 * Cache for user-specific provider instances
 * Key format: "userId:baseUrl:type"
 *
 * Why cache?
 * - createOllama/createOpenAI are lightweight (~1ms) but called on EVERY chat message
 * - With cache: 0ms overhead after first request
 * - Cache invalidated when user changes URL (natural - new URL = new key)
 */
const localProviderCache = new Map<string, any>();

/**
 * Get or create cached provider instance
 *
 * Cache key includes apiKey so rotating the key automatically creates a new provider.
 */
function getOrCreateLocalProvider(
  userId: string,
  type: "ollama" | "lmstudio" | "openai_compatible",
  baseUrl: string,
  apiKey?: string,
) {
  // Include a hash of apiKey in cache key so rotation invalidates the cache
  const cacheKey = `${userId}:${baseUrl}:${type}:${apiKey ?? ""}`;

  // Check cache first (0ms overhead)
  let provider = localProviderCache.get(cacheKey);

  if (!provider) {
    // Create new instance (only happens once per user+URL+key)
    const normalizedUrl = baseUrl.replace(/\/$/, "");

    if (type === "ollama") {
      provider = createOllama({
        baseURL: `${normalizedUrl}/api`,
      });
    } else if (type === "lmstudio") {
      provider = createOpenAICompatible({
        name: "lmstudio",
        baseURL: `${normalizedUrl}/v1`,
        apiKey: "not-needed",
      });
    } else if (type === "openai_compatible") {
      provider = createOpenAICompatible({
        name: "xinity",
        baseURL: `${normalizedUrl}/v1`,
        apiKey: apiKey ?? "not-needed",
      });
    }

    localProviderCache.set(cacheKey, provider);
  }

  return provider;
}

/**
 * Get model instance - handles Local Models provider dynamically
 *
 * IMPORTANT: Use this instead of customModelProvider.getModel() in chat API
 *
 * Flow:
 * 1. User selects "llama3.2:latest" from "Local Models" provider
 * 2. Chat API receives: { provider: "Local Models", model: "llama3.2:latest" }
 * 3. This function gets cached provider OR creates new one (first time only)
 * 4. Returns: ollama("llama3.2:latest") with user's baseURL
 *
 * For all other providers (openai, anthropic, etc.):
 * - Falls back to existing static models lookup
 */
export async function getModelInstance(
  modelData?: ChatModel,
  userId?: string,
): Promise<LanguageModel | string> {
  // Handle undefined model
  if (!modelData) return fallbackModel;

  // TensorX is deliberately direct rather than routed through AI Gateway so
  // its audited retention path remains the configured TensorX endpoint.
  if (modelData.provider === "TensorX") {
    return getTensorXModel(modelData.model);
  }

  // Fail fast with an actionable server-log message instead of a cryptic
  // provider 401 mid-stream (e.g. a stale thread pinned to OpenRouter after
  // the key was removed).
  if (modelData.provider === "openrouter" && !process.env.OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured on the server, so OpenRouter models are unavailable.",
    );
  }

  // CognixOwn shares one upstream key across all users, so every web chat
  // completion counts against the author's daily limit (same accounting the
  // desktop proxy uses).
  if (modelData.provider === "CognixOwn") {
    if (!getCognixOwnConfig().isConfigured) {
      throw new Error(
        "COGNIXOWN_API_KEY is not configured on the server, so CognixOwn models are unavailable.",
      );
    }
    if (userId) {
      const usage = await recordCognixOwnUsage(userId);
      if (!usage.allowed) {
        throw new Error(
          `CognixOwn daily limit exceeded (${usage.limit} requests/day). Try again tomorrow.`,
        );
      }
    }
  }

  // SPECIAL CASE: Local Models provider (doesn't exist in allModels)
  if (modelData.provider === "Local Models") {
    if (!userId) {
      throw new Error("User ID required for Local Models");
    }

    const preferences = await userRepository.getPreferences(userId);
    const config = preferences?.localModels;

    if (!config?.enabled || !config.baseUrl) {
      throw new Error("Local models not configured");
    }

    // Get cached provider (0ms after first call)
    const provider = getOrCreateLocalProvider(
      userId,
      config.type,
      config.baseUrl,
      config.apiKey,
    );

    // Return model instance
    return provider(modelData.model); // e.g., "llama3.2:latest"
  }

  // EXISTING BEHAVIOR: Use static models lookup
  // This handles: openai, anthropic, google, ollama (old), groq, etc.
  return customModelProvider.getModel(modelData);
}
