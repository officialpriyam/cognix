import { NextResponse } from "next/server";
import {
  getCognixOwnConfig,
  recordCognixOwnUsage,
} from "lib/ai/providers/cognixown";
import { getBearerToken } from "lib/voice/device-token";

// Long generations stream through this proxy; match the chat routes.
export const maxDuration = 300;

type RouteContext = { params: Promise<{ path: string[] }> };

const HOP_BY_HOP = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

/**
 * Validate the desktop OIDC access token against our own userinfo endpoint
 * and resolve it to the user's id (`sub`). The desktop app holds tokens, not
 * session cookies, so the middleware lets this path through (see
 * `src/middleware.ts`) and authentication happens here.
 */
async function authenticateDesktop(
  request: Request,
): Promise<{ userId: string } | NextResponse> {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Missing bearer token. Sign in to the Cognix desktop app." },
      { status: 401 },
    );
  }

  let res: Response;
  try {
    res = await fetch(new URL("/api/auth/oauth2/userinfo", request.url), {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json(
      { error: "Authentication service unreachable" },
      { status: 503 },
    );
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: "Invalid or expired token. Sign in again." },
      { status: 401 },
    );
  }
  const info = (await res.json().catch(() => null)) as {
    sub?: string;
  } | null;
  if (!info?.sub) {
    return NextResponse.json(
      { error: "Invalid token claims" },
      { status: 401 },
    );
  }
  return { userId: info.sub };
}

async function proxy(request: Request, path: string[]) {
  const auth = await authenticateDesktop(request);
  if (auth instanceof NextResponse) return auth;

  const config = getCognixOwnConfig();
  if (!config.isConfigured) {
    return NextResponse.json(
      { error: "CognixOwn is not configured on the server" },
      { status: 503 },
    );
  }

  const rest = path.join("/");
  const isChatCompletions =
    request.method === "POST" && /(^|\/)chat\/completions$/.test(rest);

  // The upstream key is shared, so every chat completion — web or desktop —
  // counts against the author's daily limit.
  if (isChatCompletions) {
    let usage;
    try {
      usage = await recordCognixOwnUsage(auth.userId);
    } catch (error) {
      console.error("[cognixown] usage accounting failed", error);
      return NextResponse.json(
        { error: "Usage service unavailable" },
        { status: 500 },
      );
    }
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: `CognixOwn daily limit exceeded (${usage.limit} requests/day). Try again tomorrow.`,
        },
        { status: 429 },
      );
    }
  }

  const search = new URL(request.url).search;
  const upstream = `${config.baseUrlV1}/${rest}${search}`;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");
  if (contentType) headers.set("content-type", contentType);
  if (accept) headers.set("accept", accept);
  headers.set("authorization", `Bearer ${config.apiKey}`);

  let body: ArrayBuffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      body = await request.arrayBuffer();
    } catch {
      return NextResponse.json(
        { error: "Unreadable request body" },
        { status: 400 },
      );
    }
  }

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstream, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(290_000),
    });
  } catch {
    return NextResponse.json(
      { error: "CognixOwn upstream unreachable" },
      { status: 502 },
    );
  }

  const outHeaders = new Headers();
  upstreamRes.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      try {
        outHeaders.set(key, value);
      } catch {
        // Ignore headers that cannot be re-set (e.g. invalid values).
      }
    }
  });
  outHeaders.set("cache-control", "no-store");

  // Errors may arrive without a streaming body; materialize those so the
  // status and message survive the hop.
  if (!upstreamRes.body) {
    const text = await upstreamRes.text().catch(() => "");
    return new Response(text, {
      status: upstreamRes.status,
      headers: outHeaders,
    });
  }
  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: outHeaders,
  });
}

export async function GET(request: Request, { params }: RouteContext) {
  const { path } = await params;
  return proxy(request, path);
}

export async function POST(request: Request, { params }: RouteContext) {
  const { path } = await params;
  return proxy(request, path);
}
