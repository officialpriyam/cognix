import { isAllowedRedirect } from "lib/auth/desktop-oauth";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.formData().catch(() => null);
  const field = (k: string) => {
    const v = body?.get(k) ?? req.nextUrl.searchParams.get(k);
    return typeof v === "string" ? v : null;
  };
  const uri = field("redirect_uri");
  const state = field("state");
  if (uri && isAllowedRedirect(uri)) {
    const back = new URL(uri);
    back.searchParams.set("error", "access_denied");
    if (state) back.searchParams.set("state", state);
    return Response.redirect(back.toString(), 302);
  }
  return new Response("invalid request", { status: 400 });
}
