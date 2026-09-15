import { getSession } from "auth/server";
import {
  COGNIX_DESKTOP_CLIENT_ID,
  isAllowedRedirect,
  startDesktopAuthorize,
} from "lib/auth/desktop-oauth";
import type { NextRequest } from "next/server";

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] as string,
  );

function params(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const scope = q.get("scope");
  return {
    clientId: q.get("client_id"),
    redirectUri: q.get("redirect_uri"),
    responseType: q.get("response_type"),
    scope,
    state: q.get("state"),
    codeChallenge: q.get("code_challenge"),
  };
}

const form = (p: Record<string, string | null>) =>
  Object.entries(p)
    .map(
      ([k, v]) =>
        `<input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(v ?? "")}">`,
    )
    .join("");

async function errorRedirect(req: NextRequest, error: string) {
  const uri = req.nextUrl.searchParams.get("redirect_uri");
  const state = req.nextUrl.searchParams.get("state");
  if (uri && isAllowedRedirect(uri)) {
    const back = new URL(uri);
    back.searchParams.set("error", error);
    if (state) back.searchParams.set("state", state);
    return Response.redirect(back.toString(), 302);
  }
  return new Response("invalid request", { status: 400 });
}

export async function GET(req: NextRequest) {
  const p = params(req);
  if (
    p.clientId !== COGNIX_DESKTOP_CLIENT_ID ||
    !p.redirectUri ||
    !isAllowedRedirect(p.redirectUri)
  )
    return errorRedirect(req, "invalid_request");

  const session = await getSession();
  if (!session) {
    const login = new URL("/sign-in", req.nextUrl.origin);
    login.searchParams.set(
      "callbackURL",
      `/oauth/authorize?${req.nextUrl.searchParams.toString()}`,
    );
    return Response.redirect(login.toString(), 302);
  }

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Authorize Cognix</title>
<style>body{font:15px/1.5 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#0b0b0f;color:#eee}
.card{max-width:380px;padding:28px;border:1px solid #26262c;border-radius:16px;background:#131318}
h1{font-size:18px;margin:0 0 4px}p{margin:10px 0;color:#b8b8c2}code{background:#1d1d24;padding:2px 6px;border-radius:6px}
.btns{display:flex;gap:10px;margin-top:18px}button{flex:1;padding:10px 14px;border-radius:10px;border:0;cursor:pointer;font:inherit}
.approve{background:#5b5bd6;color:#fff}.deny{background:#2a2a33;color:#ddd}</style></head>
<body><form method="post" action="/oauth/authorize" class="card">
<h1>Authorize Cognix Desktop</h1>
<p>Sign in to <strong>Cognix Desktop</strong> as <code>${escapeHtml(session.user.email)}</code> and grant access to the requested permissions:</p>
<p><code>${escapeHtml(p.scope ?? "")}</code></p>
${form({ ...p })}
<div class="btns"><button class="approve" name="consent" value="approve">Authorize</button>
<button class="deny" name="consent" value="deny" formNoValidate formaction="/oauth/authorize/deny">Cancel</button></div>
</form></body></html>`;
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.formData().catch(() => null);
  if (!body) return errorRedirect(req, "invalid_request");
  const p = {
    clientId: String(body.get("client_id") ?? ""),
    redirectUri: String(body.get("redirect_uri") ?? ""),
    responseType: String(body.get("response_type") ?? ""),
    scope: String(body.get("scope") ?? ""),
    state: String(body.get("state") ?? ""),
    codeChallenge: String(body.get("code_challenge") ?? ""),
  };
  const result = await startDesktopAuthorize(p);
  if (!result.ok) return errorRedirect(req, result.reason);
  return Response.redirect(result.redirectTo, 302);
}
