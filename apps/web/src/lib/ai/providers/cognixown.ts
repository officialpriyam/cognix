import "server-only";

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * CognixOwn — self-hosted models behind an LM Studio OpenAI-compatible
 * endpoint. The upstream server requires a Bearer API token (LM Studio API
 * token), which lives only in the web server env (`COGNIXOWN_API_KEY`).
 *
 * Display contract (requested):
 * - provider/category label: "CognixOwn" (like "openrouter")
 * - `qwen/qwen3.5-9b` shows as "Qoder"
 * - `google/gemma-4-e4b` shows as "Relay"
 *
 * Desktop clients never hold the upstream key: they call the
 * `/api/cognixown/v1/*` proxy with their OIDC access token, which validates
 * the token and enforces the per-user daily limit before forwarding.
 */

export const COGNIXOWN_PROVIDER = "CognixOwn";
export const COGNIXOWN_QODER_ID = "qwen/qwen3.5-9b";
export const COGNIXOWN_RELAY_ID = "google/gemma-4-e4b";
export const COGNIXOWN_DEFAULT_BASE_URL = "http://185.172.175.223:1234";
export const COGNIXOWN_DEFAULT_DAILY_LIMIT = 100;

/**
 * Normalize the upstream base URL to the OpenAI-compatible root (`.../v1`).
 * LM Studio serves the API under `/v1`; the env value may or may not include
 * it, and may carry trailing slashes.
 */
export function normalizeCognixOwnBaseUrl(raw?: string): string {
  const base =
    (raw ?? "").trim().replace(/\/+$/, "") || COGNIXOWN_DEFAULT_BASE_URL;
  return base.endsWith("/v1") ? base : `${base}/v1`;
}

export function getCognixOwnConfig() {
  const apiKey = process.env.COGNIXOWN_API_KEY?.trim();
  const parsedLimit = Number(process.env.COGNIXOWN_DAILY_LIMIT);
  return {
    baseUrlV1: normalizeCognixOwnBaseUrl(process.env.COGNIXOWN_BASE_URL),
    apiKey,
    isConfigured: !!apiKey && apiKey !== "****",
    dailyLimit:
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.floor(parsedLimit)
        : COGNIXOWN_DEFAULT_DAILY_LIMIT,
  };
}

const cognixownClient = createOpenAICompatible({
  name: "cognixown",
  baseURL: normalizeCognixOwnBaseUrl(process.env.COGNIXOWN_BASE_URL),
  apiKey: process.env.COGNIXOWN_API_KEY || "not-configured",
});

export function getCognixOwnModel(providerModelId: string) {
  if (!getCognixOwnConfig().isConfigured) {
    throw new Error(
      "COGNIXOWN_API_KEY is not configured on the server, so CognixOwn models are unavailable.",
    );
  }
  return cognixownClient(providerModelId);
}

export type CognixOwnUsage = {
  count: number;
  limit: number;
  allowed: boolean;
};

/**
 * Atomically record one billable CognixOwn request (a chat completion) for a
 * user and report whether they remain within their daily limit.
 *
 * Storage is a tiny self-contained table (`cognixown_usage`, one row per
 * user per UTC day) created on first use, so no Drizzle migration is needed.
 * Used by both the web chat path and the desktop proxy, so the limit applies
 * consistently wherever the shared upstream key is spent.
 */
export async function recordCognixOwnUsage(
  userId: string,
): Promise<CognixOwnUsage> {
  const { dailyLimit } = getCognixOwnConfig();
  // Lazy import: keeps postgres.js out of the module graph for unit tests
  // and for callers that only need the catalog metadata.
  const { pgClient } = await import("../../db/pg/db.pg");
  const day = new Date().toISOString().slice(0, 10);

  await pgClient`
    CREATE TABLE IF NOT EXISTS cognixown_usage (
      user_id TEXT NOT NULL,
      day DATE NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (user_id, day)
    )
  `;

  const rows = await pgClient<{ count: number }[]>`
    INSERT INTO cognixown_usage (user_id, day, count)
    VALUES (${userId}, ${day}, 1)
    ON CONFLICT (user_id, day)
    DO UPDATE SET count = cognixown_usage.count + 1
    RETURNING count
  `;

  const count = rows[0]?.count ?? dailyLimit + 1;
  return { count, limit: dailyLimit, allowed: count <= dailyLimit };
}
