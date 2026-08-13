import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  if (pathname === "/admin") {
    return NextResponse.redirect(new URL("/admin/users", request.url));
  }
  if (pathname === "/" || pathname === "/api" || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    if (pathname === "/app-auth") {
      const url = new URL(request.url);
      const state = url.searchParams.get("state") || "";
      const callbackURL = encodeURIComponent(`/app-auth?state=${state}`);
      return NextResponse.redirect(
        new URL(`/sign-in?callbackURL=${callbackURL}`, request.url),
      );
    }
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/auth|export|sign-in|sign-up).*)",
  ],
};
