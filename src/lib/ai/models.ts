import "server-only";

import { createOllama } from "ollama-ai-provider-v2";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { xai } from "@ai-sdk/xai";
import { LanguageModelV2, openrouter } from "@openrouter/ai-sdk-provider";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { LanguageModel } from "ai";
import {
  createOpenAICompatibleModels,
  openaiCompatibleModelsSafeParse,
} from "./create-openai-compatiable";
import { ChatModel } from "app-types/chat";
import {
  DEFAULT_FILE_PART_MIME_TYPES,
  OPENAI_FILE_MIME_TYPES,
  GEMINI_FILE_MIME_TYPES,
  ANTHROPIC_FILE_MIME_TYPES,
  XAI_FILE_MIME_TYPES,
} from "./file-support";
import { cache } from "react";
import { DEFAULT_CHAT_MODEL } from "./model-recommendations";

const ollama = createOllama({
  baseURL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/api",
});
const groq = createGroq({
  baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});
const nvidia = createOpenAICompatible({
  name: "nvidia",
  baseURL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY,
});

const magicxCoder = createOpenAICompatible({
  name: "Magical AI",
  baseURL: process.env.MAGICX_CODER_BASE_URL || "http://185.172.175.223:1234/v1",
  apiKey: process.env.MAGICX_CODER_API_KEY,
});

const magicx = createOpenAICompatible({
  name: "Magical AI",
  baseURL: process.env.MAGICX_BASE_URL || "http://185.172.175.223:1234/api/v1",
  apiKey: process.env.MAGICX_API_KEY,
});

const staticModels = {
  "Magical AI": {
    MagicX-Daily-B: magicxCoder(""),
    MagicX-B: magicx("google/gemma-3-1b"),
  },
  openai: {
    "gpt-4.1": openai("gpt-4.1"),
    "gpt-4.1-mini": openai("gpt-4.1-mini"),
    "o4-mini": openai("o4-mini"),
    o3: openai("o3"),
    "gpt-5.1-chat": openai("gpt-5.1-chat-latest"),
    "gpt-5.1": openai("gpt-5.1"),
    "gpt-5.1-codex": openai("gpt-5.1-codex"),
    "gpt-5.1-codex-mini": openai("gpt-5.1-codex-mini"),
  },
  google: {
    "gemini-2.5-flash-lite": google("gemini-2.5-flash-lite"),
    "gemini-2.5-flash": google("gemini-2.5-flash"),
    "gemini-3-pro": google("gemini-3-pro-preview"),
    "gemini-2.5-pro": google("gemini-2.5-pro"),
  },
  anthropic: {
    "sonnet-4.5": anthropic("claude-sonnet-4-5"),
    "haiku-4.5": anthropic("claude-haiku-4-5"),
    "opus-4.5": anthropic("claude-opus-4-5"),
  },
  xai: {
    "grok-4-1-fast": xai("grok-4-1-fast-non-reasoning"),
    "grok-4-1": xai("grok-4-1"),
    "grok-3-mini": xai("grok-3-mini"),
  },
  ollama: {
    "qwen2.5-coder:14b": ollama("qwen2.5-coder:14b"),
  },
  groq: {
    "kimi-k2-instruct": groq("moonshotai/kimi-k2-instruct"),
    "llama-4-scout-17b": groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    "gpt-oss-20b": groq("openai/gpt-oss-20b"),
    "gpt-oss-120b": groq("openai/gpt-oss-120b"),
    "qwen3-32b": groq("qwen/qwen3-32b"),
  },
  nvidia: {
    "minimax-m2.7": nvidia("minimaxai/minimax-m2.7"),
    "mistral-large-3-675b": nvidia(
      "mistralai/mistral-large-3-675b-instruct-2512",
    ),
    "llama-4-maverick-17b": nvidia("meta/llama-4-maverick-17b-128e-instruct"),
    "llama-3.3-nemotron-super-49b-v1.5": nvidia(
      "nvidia/llama-3.3-nemotron-super-49b-v1.5",
    ),
    "llama-3.1-nemotron-ultra-253b-v1": nvidia(
      "nvidia/llama-3.1-nemotron-ultra-253b-v1",
    ),
    "nemotron-3-ultra-550b-a55b": nvidia("nvidia/nemotron-3-ultra-550b-a55b"),
    "nemotron-3-super-120b-a12b": nvidia("nvidia/nemotron-3-super-120b-a12b"),
    "nemotron-3-nano-30b-a3b": nvidia("nvidia/nemotron-3-nano-30b-a3b"),
    "nvidia-nemotron-nano-9b-v2": nvidia("nvidia/nvidia-nemotron-nano-9b-v2"),
    "gpt-oss-120b": nvidia("openai/gpt-oss-120b"),
    "qwen3-coder-480b-a35b": nvidia("qwen/qwen3-coder-480b-a35b-instruct"),
    "qwen3-next-80b-a3b-thinking": nvidia("qwen/qwen3-next-80b-a3b-thinking"),
    "deepseek-v4-pro": nvidia("deepseek-ai/deepseek-v4-pro"),
    "kimi-k2-thinking": nvidia("moonshotai/kimi-k2-thinking"),
  },
  openRouter: {
    "gpt-oss-20b:free": openrouter("openai/gpt-oss-20b:free"),
    "qwen3-8b:free": openrouter("qwen/qwen3-8b:free"),
    "qwen3-14b:free": openrouter("qwen/qwen3-14b:free"),
    "qwen3-coder:free": openrouter("qwen/qwen3-coder:free"),
    "deepseek-r1:free": openrouter("deepseek/deepseek-r1-0528:free"),
    "deepseek-v3:free": openrouter("deepseek/deepseek-chat-v3-0324:free"),
    "gemini-2.0-flash-exp:free": openrouter("google/gemini-2.0-flash-exp:free"),
  },
};

const staticUnsupportedModels = new Set([
  staticModels.openai["o4-mini"],
  staticModels.openRouter["gpt-oss-20b:free"],
  staticModels.openRouter["qwen3-8b:free"],
  staticModels.openRouter["qwen3-14b:free"],
  staticModels.openRouter["deepseek-r1:free"],
  staticModels.openRouter["gemini-2.0-flash-exp:free"],
]);

const nvidiaImageInputModels = {
  "mistral-large-3-675b": staticModels.nvidia["mistral-large-3-675b"],
  "llama-4-maverick-17b": staticModels.nvidia["llama-4-maverick-17b"],
};

const staticSupportImageInputModels = {
  ...staticModels.google,
  ...staticModels.xai,
  ...staticModels.openai,
  ...staticModels.anthropic,
  ...nvidiaImageInputModels,
};

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

const NVIDIA_IMAGE_FILE_MIME_TYPES = DEFAULT_FILE_PART_MIME_TYPES.filter(
  (mimeType) => mimeType.startsWith("image/"),
);

registerFileSupport(staticModels.openai["gpt-4.1"], OPENAI_FILE_MIME_TYPES);
registerFileSupport(
  staticModels.openai["gpt-4.1-mini"],
  OPENAI_FILE_MIME_TYPES,
);
registerFileSupport(staticModels.openai["gpt-5.1"], OPENAI_FILE_MIME_TYPES);
registerFileSupport(
  staticModels.openai["gpt-5.1-chat"],
  OPENAI_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.openai["gpt-5.1-codex"],
  OPENAI_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.openai["gpt-5.1-codex-mini"],
  OPENAI_FILE_MIME_TYPES,
);

registerFileSupport(
  staticModels.google["gemini-2.5-flash-lite"],
  GEMINI_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.google["gemini-2.5-flash"],
  GEMINI_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.google["gemini-2.5-pro"],
  GEMINI_FILE_MIME_TYPES,
);

registerFileSupport(
  staticModels.anthropic["sonnet-4.5"],
  ANTHROPIC_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.anthropic["opus-4.5"],
  ANTHROPIC_FILE_MIME_TYPES,
);

registerFileSupport(staticModels.xai["grok-4-1-fast"], XAI_FILE_MIME_TYPES);
registerFileSupport(staticModels.xai["grok-4-1"], XAI_FILE_MIME_TYPES);
registerFileSupport(staticModels.xai["grok-3-mini"], XAI_FILE_MIME_TYPES);
registerFileSupport(
  staticModels.nvidia["mistral-large-3-675b"],
  NVIDIA_IMAGE_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.nvidia["llama-4-maverick-17b"],
  NVIDIA_IMAGE_FILE_MIME_TYPES,
);
registerFileSupport(
  staticModels.openRouter["gemini-2.0-flash-exp:free"],
  GEMINI_FILE_MIME_TYPES,
);

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

export const isToolCallUnsupportedModel = (model: LanguageModel) => {
  return allUnsupportedModels.has(model);
};

const isImageInputUnsupportedModel = (model: LanguageModelV2) => {
  return !Object.values(staticSupportImageInputModels).includes(model);
};

export const getFilePartSupportedMimeTypes = (model: LanguageModel) => {
  return staticFilePartSupportByModel.get(model) ?? [];
};

const fallbackModel =
  staticModels.nvidia[
    DEFAULT_CHAT_MODEL.model as keyof typeof staticModels.nvidia
  ] ?? staticModels.nvidia["minimax-m2.7"];

export const customModelProvider = {
  modelsInfo: Object.entries(allModels).map(([provider, models]) => ({
    provider,
    models: Object.entries(models).map(([name, model]) => ({
      name,
      isToolCallUnsupported: isToolCallUnsupportedModel(model),
      isImageInputUnsupported: isImageInputUnsupportedModel(model),
      supportedFileMimeTypes: [...getFilePartSupportedMimeTypes(model)],
    })),
    hasAPIKey: checkProviderAPIKey(provider as keyof typeof staticModels),
  })),
  getModel: (model?: ChatModel): LanguageModel => {
    if (!model) return fallbackModel;
    const provider = model.provider;
    const modelName = model.model;

    // Check if it's a known static model
    if (allModels[provider]?.[modelName]) {
      return allModels[provider][modelName];
    }

    // If not, try to create it dynamically for certain providers
    if (provider === "openRouter" || provider === "openRouterFree") {
      return openrouter(modelName);
    }
    if (provider === "google") {
      return google(modelName);
    }
    if (provider === "nvidia") {
      return nvidia(modelName);
    }
    if (provider === "Magical AI") {
      // Try magicxcoder first, then magicx
      if (modelName === "magicxcoder") {
        return magicxCoder("qwen2.5-coder-1.5b-instruct");
      }
      if (modelName === "magicx") {
        return magicx("google/gemma-3-1b");
      }
      // Fallback to magicxcoder
      return magicxCoder("qwen2.5-coder-1.5b-instruct");
    }

    return allModels[provider]?.[modelName] || fallbackModel;
  },
};

export const fetchOpenRouterModels = cache(async () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === "****") return [];

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://cognix.ai", // Optional
        "X-Title": "Cognix", // Optional
      },
    });
    const data = await response.json();
    if (!data.data) return [];

    return data.data.map((m: any) => ({
      name: m.id,
      isToolCallUnsupported: false, // Default to supported, search handles filtering if needed
      isImageInputUnsupported: false, // Difficult to know exactly without more metadata
      supportedFileMimeTypes: [],
    }));
  } catch (e) {
    console.error("Failed to fetch OpenRouter models", e);
    return [];
  }
});

export const fetchGoogleModels = cache(async () => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey || apiKey === "****") return [];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );
    const data = await response.json();
    if (!data.models) return [];

    return data.models
      .filter((m: any) =>
        m.supportedGenerationMethods.includes("generateContent"),
      )
      .map((m: any) => ({
        name: m.name.replace("models/", ""),
        isToolCallUnsupported: false,
        isImageInputUnsupported: false,
        supportedFileMimeTypes: GEMINI_FILE_MIME_TYPES,
      }));
  } catch (e) {
    console.error("Failed to fetch Google models", e);
    return [];
  }
});

function checkProviderAPIKey(provider: keyof typeof staticModels) {
  let key: string | undefined;
  switch (provider) {
    case "openai":
      key = process.env.OPENAI_API_KEY;
      break;
    case "google":
      key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      break;
    case "anthropic":
      key = process.env.ANTHROPIC_API_KEY;
      break;
    case "xai":
      key = process.env.XAI_API_KEY;
      break;
    case "groq":
      key = process.env.GROQ_API_KEY;
      break;
    case "nvidia":
      key = process.env.NVIDIA_API_KEY;
      break;
    case "openRouter":
      key = process.env.OPENROUTER_API_KEY;
      break;
    case "Magical AI":
      key = process.env.MAGICX_CODER_API_KEY || process.env.MAGICX_API_KEY;
      break;
    default:
      return true; // assume the provider has an API key
  }
  return !!key && key != "****";
}
