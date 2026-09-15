import { exchangeDesktopCode } from "lib/auth/desktop-oauth";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.formData().catch(() => null);
  if (!body)
    return Response.json({ error: "invalid_request" }, { status: 400 });
  const field = (k: string) => {
    const v = body.get(k);
    return typeof v === "string" ? v : null;
  };
  try {
    const tokens = await exchangeDesktopCode({
      grantType: field("grant_type"),
      code: field("code"),
      codeVerifier: field("code_verifier"),
      clientId: field("client_id"),
      redirectUri: field("redirect_uri"),
    });
    return Response.json(tokens, {
      headers: { "cache-control": "no-store", pragma: "no-cache" },
    });
  } catch (error) {
    const code =
      error instanceof Error && error.message === "invalid_grant"
        ? "invalid_grant"
        : "invalid_request";
    return Response.json({ error: code }, { status: 400 });
  }
}
