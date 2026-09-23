import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  ANTHROPIC_FILE_MIME_TYPES,
  OPENAI_FILE_MIME_TYPES,
} from "./file-support";

vi.mock("server-only", () => ({}));

let modelsModule: typeof import("./models");

beforeAll(async () => {
  modelsModule = await import("./models");
});

describe("customModelProvider file support metadata", () => {
  it("includes default file support for OpenAI gpt-5.6-terra", () => {
    const { customModelProvider, getFilePartSupportedMimeTypes } = modelsModule;
    const model = customModelProvider.getModel({
      provider: "openai",
      model: "gpt-5.6-terra",
    });
    expect(getFilePartSupportedMimeTypes(model)).toEqual(
      Array.from(OPENAI_FILE_MIME_TYPES),
    );

    const openaiProvider = customModelProvider.modelsInfo.find(
      (item) => item.provider === "openai",
    );
    const metadata = openaiProvider?.models.find(
      (item) => item.name === "gpt-5.6-terra",
    );

    expect(metadata?.supportedFileMimeTypes).toEqual(
      Array.from(OPENAI_FILE_MIME_TYPES),
    );
  });

  it("adds rich support for anthropic claude-sonnet-5", () => {
    const { customModelProvider, getFilePartSupportedMimeTypes } = modelsModule;
    const model = customModelProvider.getModel({
      provider: "anthropic",
      model: "claude-sonnet-5",
    });
    expect(getFilePartSupportedMimeTypes(model)).toEqual(
      Array.from(ANTHROPIC_FILE_MIME_TYPES),
    );
  });
});

describe("openrouter provider and extended gemini catalog", () => {
  it("resolves the new gemini chat models through the gateway", () => {
    const { customModelProvider } = modelsModule;
    expect(
      customModelProvider.getModel({
        provider: "google",
        model: "gemini-3.8-flash",
      }),
    ).toBe("google/gemini-3.8-flash");
    expect(
      customModelProvider.getModel({
        provider: "google",
        model: "gemini-2.5-pro",
      }),
    ).toBe("google/gemini-2.5-pro");
  });

  it("registers the openrouter free-tier catalog", () => {
    const { customModelProvider } = modelsModule;
    const entry = customModelProvider.modelsInfo.find(
      (item) => item.provider === "openrouter",
    );
    expect(entry).toBeDefined();
    // 20 :free slugs + the openrouter/free router (live snapshot, Sep 2026)
    expect(entry?.models).toHaveLength(21);
    expect(entry?.models.some((item) => item.name === "free-router")).toBe(
      true,
    );
    // Instances resolve (never fall back) and vision models accept images
    const router = customModelProvider.getModel({
      provider: "openrouter",
      model: "free-router",
    });
    expect(router).toBeDefined();
    expect(
      entry?.models.find((item) => item.name === "free-router")
        ?.isImageInputUnsupported,
    ).toBe(false);
    expect(
      entry?.models.find((item) => item.name === "nemotron-3.5-content-safety")
        ?.isToolCallUnsupported,
    ).toBe(true);
  });

  it("gates the openrouter provider on OPENROUTER_API_KEY", async () => {
    vi.resetModules();
    try {
      vi.stubEnv("OPENROUTER_API_KEY", "");
      const keyless = await import("./models");
      const keylessEntry = keyless.customModelProvider.modelsInfo.find(
        (item) => item.provider === "openrouter",
      );
      expect(keylessEntry?.hasAPIKey).toBe(false);

      vi.resetModules();
      vi.stubEnv("OPENROUTER_API_KEY", "sk-or-test");
      const keyed = await import("./models");
      const keyedEntry = keyed.customModelProvider.modelsInfo.find(
        (item) => item.provider === "openrouter",
      );
      expect(keyedEntry?.hasAPIKey).toBe(true);
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});

describe("CognixOwn provider", () => {
  it("registers Qoder and Relay under the CognixOwn category", () => {
    const { customModelProvider } = modelsModule;
    const entry = customModelProvider.modelsInfo.find(
      (item) => item.provider === "CognixOwn",
    );
    expect(entry).toBeDefined();
    expect(entry?.models.map((item) => item.name).sort()).toEqual([
      "Qoder",
      "Relay",
    ]);
    // Instances resolve (never fall back to the default model).
    expect(
      customModelProvider.getModel({ provider: "CognixOwn", model: "Qoder" }),
    ).toBeDefined();
    expect(
      customModelProvider.getModel({ provider: "CognixOwn", model: "Relay" }),
    ).toBeDefined();
  });

  it("gates the CognixOwn provider on COGNIXOWN_API_KEY", async () => {
    vi.resetModules();
    try {
      vi.stubEnv("COGNIXOWN_API_KEY", "");
      const keyless = await import("./models");
      const keylessEntry = keyless.customModelProvider.modelsInfo.find(
        (item) => item.provider === "CognixOwn",
      );
      expect(keylessEntry?.hasAPIKey).toBe(false);

      vi.resetModules();
      vi.stubEnv("COGNIXOWN_API_KEY", "lm-studio-test-token");
      const keyed = await import("./models");
      const keyedEntry = keyed.customModelProvider.modelsInfo.find(
        (item) => item.provider === "CognixOwn",
      );
      expect(keyedEntry?.hasAPIKey).toBe(true);
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
