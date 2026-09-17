import { pgDb as db } from "lib/db/pg/db.pg";
import { OAuthAccessTokenTable } from "lib/db/pg/schema.pg";
import { eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * POST /api/oauth/revoke
 *
 * Revokes a desktop access/refresh token pair issued through the OIDC
 * provider (better-auth ships no revocation endpoint). Always answers 200 so
 * callers can't probe token validity. Body is form-encoded or JSON:
 * { token, client_id? }.
 */
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let token: unknown;
    if (contentType.includes("application/json")) {
      token = ((await request.json()) as { token?: unknown }).token;
    } else {
      const form = await request.formData();
      token = form.get("token");
    }
    if (typeof token === "string" && token.length > 0) {
      await db
        .delete(OAuthAccessTokenTable)
        .where(
          or(
            eq(OAuthAccessTokenTable.accessToken, token),
            eq(OAuthAccessTokenTable.refreshToken, token),
          ),
        );
    }
  } catch (error) {
    console.error("OAuth revoke failed:", error);
  }
  return NextResponse.json({ revoked: true });
}
