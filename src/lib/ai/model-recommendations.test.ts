import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHAT_MODEL,
  getAutoModelCandidates,
  selectAutoModel,
  selectImageToolModelForPrompt,
  selectRecommendedModelForPrompt,
} from "./model-recommendations";

const providers = [
  {
    provider: "openai",
    hasAPIKey: false,
    models: [{ name: "gpt-5.1-codex" }],
  },
  {
    provider: "nvidia",
    hasAPIKey: true,
    models: [
      { name: "minimax-m2.7" },
      { name: "qwen3-coder-480b-a35b" },
      { name: "gpt-oss-120b", isToolCallUnsupported: true },
    ],
  },
];

describe("model recommendations", () => {
  it("keeps the default NVIDIA model for general prompts", () => {
    expect(
      selectRecommendedModelForPrompt({
        prompt: "hello there",
        providers,
        requestedModel: DEFAULT_CHAT_MODEL,
      }),
    ).toEqual(DEFAULT_CHAT_MODEL);
  });

  it("keeps a selected available model for coding prompts", () => {
    expect(
      selectRecommendedModelForPrompt({
        prompt: "debug this TypeScript component",
        providers,
        requestedModel: DEFAULT_CHAT_MODEL,
        respectRequestedModel: true,
      }),
    ).toEqual(DEFAULT_CHAT_MODEL);
  });

  it("routes coding prompts from the unpinned default model", () => {
    expect(
      selectRecommendedModelForPrompt({
        prompt: "debug this TypeScript component",
        providers,
        requestedModel: DEFAULT_CHAT_MODEL,
      }),
    ).toEqual({
      provider: "nvidia",
      model: "qwen3-coder-480b-a35b",
    });
  });

  it("routes coding prompts when the pinned model is unavailable", () => {
    expect(
      selectRecommendedModelForPrompt({
        prompt: "debug this TypeScript component",
        providers,
        requestedModel: {
          provider: "openai",
          model: "gpt-5.1-codex",
        },
        respectRequestedModel: true,
      }),
    ).toEqual({
      provider: "nvidia",
      model: "qwen3-coder-480b-a35b",
    });
  });

  it("falls back when a selected model cannot call the required image tool", () => {
    expect(
      selectRecommendedModelForPrompt({
        prompt: "generate an image of a clean dashboard",
        providers,
        requestedModel: {
          provider: "nvidia",
          model: "gpt-oss-120b",
        },
        requireToolCall: true,
        respectRequestedModel: true,
      }),
    ).toEqual(DEFAULT_CHAT_MODEL);
  });

  it("prefers NVIDIA FLUX for image generation when available", () => {
    expect(
      selectImageToolModelForPrompt("generate an image of a clean dashboard", {
        nvidia: true,
        google: true,
        openai: true,
      }),
    ).toBe("nvidia");
  });

  it("does not select an image tool for non-image prompts", () => {
    expect(
      selectImageToolModelForPrompt("explain OAuth callbacks", {
        nvidia: true,
      }),
    ).toBeUndefined();
  });

  it("selects an image tool for image edit prompts", () => {
    expect(
      selectImageToolModelForPrompt(
        "edit this photo and remove the background",
        {
          nvidia: true,
        },
      ),
    ).toBe("nvidia");
  });

  it("prefers a free model in Auto mode", () => {
    expect(
      selectAutoModel([
        {
          provider: "openai",
          hasAPIKey: true,
          models: [{ name: "gpt-5.1-codex" }],
        },
        {
          provider: "openRouter",
          hasAPIKey: true,
          models: [
            { name: "qwen3-coder:free", isFree: true },
            { name: "paid-model" },
          ],
        },
      ]),
    ).toEqual({ provider: "openRouter", model: "qwen3-coder:free" });
  });

  it("falls back to any configured model when no free model is available", () => {
    expect(
      selectAutoModel([
        {
          provider: "nvidia",
          hasAPIKey: true,
          models: [{ name: "minimax-m2.7" }],
        },
      ]),
    ).toEqual({ provider: "nvidia", model: "minimax-m2.7" });
  });

  it("returns ordered Auto candidates with free models before paid fallbacks", () => {
    expect(
      getAutoModelCandidates([
        {
          provider: "openai",
          hasAPIKey: true,
          models: [{ name: "gpt-5.1-codex" }],
        },
        {
          provider: "nvidia",
          hasAPIKey: true,
          models: [{ name: "minimax-m2.7" }],
        },
        {
          provider: "openRouter",
          hasAPIKey: true,
          models: [{ name: "qwen3-coder:free", isFree: true }],
        },
      ]),
    ).toEqual([
      { provider: "openRouter", model: "qwen3-coder:free" },
      { provider: "openai", model: "gpt-5.1-codex" },
      { provider: "nvidia", model: "minimax-m2.7" },
    ]);
  });
});
