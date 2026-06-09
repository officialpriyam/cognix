import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHAT_MODEL,
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
    models: [{ name: "minimax-m2.7" }, { name: "qwen3-coder-480b-a35b" }],
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

  it("routes coding prompts to the best available coding model", () => {
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
});
