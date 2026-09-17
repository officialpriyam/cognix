import { tool as createTool } from "ai";
import { JSONSchema7 } from "json-schema";
import { jsonSchemaToZod } from "lib/json-schema-to-zod";
import { safe } from "ts-safe";
import { fetchExaWithRetry, getExaKeyCount } from "./exa-key-rotation";

export const browsePageSchema: JSONSchema7 = {
  type: "object",
  properties: {
    url: {
      type: "string",
      description:
        "The web page URL to read (must be a public http/https URL).",
    },
    maxCharacters: {
      type: "number",
      description: "Maximum characters of extracted text to return.",
      default: 6000,
      minimum: 500,
      maximum: 20000,
    },
    livecrawl: {
      type: "string",
      enum: ["always", "fallback", "preferred"],
      description:
        "Exa live crawling preference - always forces a live crawl, fallback uses cache first, preferred tries live first.",
      default: "preferred",
    },
  },
  required: ["url"],
};

export type BrowsePageSource = "exa" | "direct-fetch";

export interface BrowsePageSuccess {
  url: string;
  title?: string;
  text: string;
  source: BrowsePageSource;
  truncated: boolean;
}

const DIRECT_FETCH_TIMEOUT_MS = 15_000;
const DIRECT_FETCH_MAX_BYTES = 2_000_000;

// Hostnames/IP ranges that must never be fetched server-side. Literal checks
// only (no DNS resolution); direct-fetch is for public web pages.
const BLOCKED_HOSTNAME = /^(localhost|.*\.localhost|.*\.local|.*\.internal)$/i;
const BLOCKED_IP =
  /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|::1?$|\[::1?\])/;

export function assertPublicHttpUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Only http/https URLs can be read (got: ${parsed.protocol})`,
    );
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTNAME.test(parsed.hostname) || BLOCKED_IP.test(host)) {
    throw new Error(`Refusing to fetch non-public address: ${parsed.hostname}`);
  }
  return parsed;
}

const EXA_BASE_URL = "https://api.exa.ai";

async function readViaExa(
  url: string,
  maxCharacters: number,
  livecrawl: "always" | "fallback" | "preferred",
): Promise<{ title?: string; text: string }> {
  const body = {
    ids: [url],
    contents: {
      text: { maxCharacters },
      livecrawl,
    },
  };
  const result = await fetchExaWithRetry(async (apiKey: string) => {
    const response = await fetch(`${EXA_BASE_URL}/contents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(body),
    });
    if (response.status === 401) {
      throw new Error("Invalid EXA API key");
    }
    if (response.status === 429) {
      throw new Error("Exa API usage limit exceeded");
    }
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Exa API error (${response.status}): ${errorText}`);
    }
    return response.json();
  });
  const first = result?.results?.[0];
  const text = typeof first?.text === "string" ? first.text.trim() : "";
  if (!text) {
    throw new Error("Exa returned no readable text for this URL");
  }
  return {
    title: typeof first?.title === "string" ? first.title : undefined,
    text,
  };
}

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  "#x27": "'",
  "#x2F": "/",
  nbsp: " ",
};

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec) =>
      String.fromCodePoint(Number.parseInt(dec, 10)),
    )
    .replace(/&(amp|lt|gt|quot|nbsp|#39|#x27|#x2F);/g, (m, name) => {
      const decoded = HTML_ENTITY_MAP[name];
      return decoded === undefined ? m : decoded;
    });
}

/**
 * Dependency-free HTML to text extraction: drops scripts, styles, and common
 * chrome (nav/header/footer), then strips tags and collapses whitespace.
 */
export function extractTextFromHtml(html: string): {
  title?: string;
  text: string;
} {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch
    ? decodeHtmlEntities(titleMatch[1].replace(/\s+/g, " ")).trim() || undefined
    : undefined;
  const text = decodeHtmlEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(
        /<(script|style|nav|header|footer|svg|noscript)[\s\S]*?<\/\1>/gi,
        " ",
      )
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t\f\v ]+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
  return { title, text };
}

async function readViaDirectFetch(
  parsed: URL,
  _maxCharacters: number,
): Promise<{ title?: string; text: string }> {
  const response = await fetch(parsed.toString(), {
    signal: AbortSignal.timeout(DIRECT_FETCH_TIMEOUT_MS),
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; CognixBot/1.0)",
      Accept: "text/html,application/xhtml+xml,text/*;q=0.9,*/*;q=0.1",
    },
  });
  if (!response.ok) {
    throw new Error(
      `Page fetch failed with status ${response.status} ${response.statusText}`.trim(),
    );
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (
    !contentType.includes("text/html") &&
    !contentType.includes("text/") &&
    !contentType.includes("application/xhtml")
  ) {
    throw new Error(
      `URL did not return a readable text page (content-type: ${contentType || "unknown"})`,
    );
  }
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > DIRECT_FETCH_MAX_BYTES) {
    throw new Error(
      `Page too large to read (${Math.round(contentLength / 1024)} KB)`,
    );
  }
  let html = await response.text();
  if (html.length > DIRECT_FETCH_MAX_BYTES) {
    html = html.slice(0, DIRECT_FETCH_MAX_BYTES);
  }
  const { title, text } = extractTextFromHtml(html);
  if (!text) {
    throw new Error("No readable text could be extracted from this page");
  }
  return { title, text };
}

export const browsePageTool = createTool({
  description:
    "Read a web page and return its main text content (smart extraction). Uses Exa AI when configured, otherwise falls back to direct fetching. Prefer this over raw HTTP fetch when an agent needs to read an article, docs page, or product page.",
  inputSchema: jsonSchemaToZod(browsePageSchema),
  execute: async (params) => {
    return safe(async (): Promise<BrowsePageSuccess> => {
      const maxCharacters = Math.min(
        Math.max(params.maxCharacters || 6000, 500),
        20000,
      );
      const livecrawl = params.livecrawl || "preferred";
      const parsed = assertPublicHttpUrl(params.url);

      // Primary: Exa extraction (handles JS-rendered pages via live crawl).
      if (getExaKeyCount() > 0) {
        try {
          const { title, text } = await readViaExa(
            parsed.toString(),
            maxCharacters,
            livecrawl,
          );
          const truncated = text.length > maxCharacters;
          return {
            url: parsed.toString(),
            title,
            text: truncated ? text.slice(0, maxCharacters) : text,
            source: "exa",
            truncated,
          };
        } catch (error) {
          console.warn(
            "Exa page read failed, falling back to direct fetch:",
            error instanceof Error ? error.message : error,
          );
        }
      }

      // Fallback: direct fetch + dependency-free text extraction.
      const { title, text } = await readViaDirectFetch(parsed, maxCharacters);
      const truncated = text.length > maxCharacters;
      return {
        url: parsed.toString(),
        title,
        text: truncated ? text.slice(0, maxCharacters) : text,
        source: "direct-fetch",
        truncated,
      };
    })
      .ifFail((error) => {
        return {
          isError: true,
          error: error.message,
          solution:
            "The page could not be read. Explain what went wrong (unsupported URL, page too large, extraction failed) and then answer from existing knowledge or ask the user for the content directly.",
        };
      })
      .unwrap();
  },
});
