import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  COGNIXOWN_DEFAULT_BASE_URL,
  COGNIXOWN_DEFAULT_DAILY_LIMIT,
  normalizeCognixOwnBaseUrl,
} from "./cognixown";

describe("normalizeCognixOwnBaseUrl", () => {
  it("appends /v1 to a bare host", () => {
    expect(normalizeCognixOwnBaseUrl("http://185.172.175.223:1234")).toBe(
      "http://185.172.175.223:1234/v1",
    );
  });

  it("keeps an explicit /v1 and trims trailing slashes", () => {
    expect(normalizeCognixOwnBaseUrl("http://host:1234/v1/")).toBe(
      "http://host:1234/v1",
    );
    expect(normalizeCognixOwnBaseUrl("http://host:1234//")).toBe(
      "http://host:1234/v1",
    );
  });

  it("falls back to the default host", () => {
    expect(normalizeCognixOwnBaseUrl()).toBe(
      `${COGNIXOWN_DEFAULT_BASE_URL}/v1`,
    );
    expect(normalizeCognixOwnBaseUrl("")).toBe(
      `${COGNIXOWN_DEFAULT_BASE_URL}/v1`,
    );
  });
});

describe("getCognixOwnConfig", () => {
  it("is unconfigured without a key and defaults the daily limit", async () => {
    vi.resetModules();
    try {
      vi.stubEnv("COGNIXOWN_API_KEY", "");
      vi.stubEnv("COGNIXOWN_DAILY_LIMIT", "");
      const fresh = await import("./cognixown");
      const config = fresh.getCognixOwnConfig();
      expect(config.isConfigured).toBe(false);
      expect(config.dailyLimit).toBe(COGNIXOWN_DEFAULT_DAILY_LIMIT);
      expect(config.baseUrlV1).toBe(`${COGNIXOWN_DEFAULT_BASE_URL}/v1`);
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it("honors env overrides", async () => {
    vi.resetModules();
    try {
      vi.stubEnv("COGNIXOWN_API_KEY", "lm-studio-test-token");
      vi.stubEnv("COGNIXOWN_BASE_URL", "http://example:1234");
      vi.stubEnv("COGNIXOWN_DAILY_LIMIT", "250");
      const fresh = await import("./cognixown");
      const config = fresh.getCognixOwnConfig();
      expect(config.isConfigured).toBe(true);
      expect(config.dailyLimit).toBe(250);
      expect(config.baseUrlV1).toBe("http://example:1234/v1");
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
