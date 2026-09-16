import "server-only";

import { createHash, createHmac, randomBytes } from "node:crypto";
import { getSession } from "auth/server";
import { and, eq, gt } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import {
  SessionTable,
  UserTable,
  VerificationTable,
} from "lib/db/pg/schema.pg";

export const COGNIX_DESKTOP_CLIENT_ID =
  process.env.COGNIX_DESKTOP_CLIENT_ID ?? "cognix-desktop";
export const COGNIX_DESKTOP_REDIRECT_URI =
  process.env.COGNIX_DESKTOP_REDIRECT_URI ?? "cognix://oauth/callback";
export const COGNIX_DESKTOP_SCOPES =
  process.env.COGNIX_DESKTOP_SCOPES ?? "openid profile email";
const CODE_TTL_MS = 10 * 60 * 1000;
const ACCESS_TTL_S = 60 * 60 * 24 * 30;

const b64url = (buf: Buffer) =>
  buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const newToken = (bytes = 32) => b64url(randomBytes(bytes));
const codeId = (code: string) => `oauth:code:${code}`;

export function isAllowedRedirect(redirectUri: string) {
  return redirectUri === COGNIX_DESKTOP_REDIRECT_URI;
}

type Pending = {
  userId: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  codeChallenge: string;
};

export async function createAuthCode(input: {
  userId: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
  codeChallenge: string;
}) {
  const code = newToken(32);
  const now = new Date();
  await pgDb.insert(VerificationTable).values({
    identifier: codeId(code),
    value: JSON.stringify({
      ...input,
      createdAt: now.getTime(),
    } satisfies Pending & { createdAt: number }),
    expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    createdAt: now,
    updatedAt: now,
  });
  return code;
}

async function consumeAuthCode(code: string) {
  const rows = await pgDb
    .select()
    .from(VerificationTable)
    .where(
      and(
        eq(VerificationTable.identifier, codeId(code)),
        gt(VerificationTable.expiresAt, new Date()),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  await pgDb.delete(VerificationTable).where(eq(VerificationTable.id, row.id));
  try {
    return JSON.parse(row.value) as Pending & { createdAt: number };
  } catch {
    return null;
  }
}

function verifyPkce(verifier: string, challenge: string) {
  if (!verifier || !challenge) return false;
  const computed = b64url(createHash("sha256").update(verifier).digest());
  return computed === challenge;
}

function signIdToken(payload: Record<string, unknown>) {
  const secret = process.env.BETTER_AUTH_SECRET ?? "cognix-dev-secret";
  const enc = (o: unknown) => b64url(Buffer.from(JSON.stringify(o), "utf8"));
  const head = enc({ alg: "HS256", typ: "JWT" });
  const body = enc(payload);
  const sig = b64url(
    createHmac("sha256", secret).update(`${head}.${body}`).digest(),
  );
  return `${head}.${body}.${sig}`;
}

export async function startDesktopAuthorize(params: {
  clientId: string | null;
  redirectUri: string | null;
  responseType: string | null;
  scope: string | null;
  state: string | null;
  codeChallenge: string | null;
}) {
  const session = await getSession();
  if (!session)
    return { ok: false as const, reason: "unauthenticated" as const };
  const { clientId, redirectUri, responseType, codeChallenge, scope, state } =
    params;
  if (
    responseType !== "code" ||
    clientId !== COGNIX_DESKTOP_CLIENT_ID ||
    !redirectUri ||
    !isAllowedRedirect(redirectUri)
  )
    return { ok: false as const, reason: "invalid_request" as const };
  if (!codeChallenge)
    return { ok: false as const, reason: "invalid_request" as const };

  const scopes = (scope ?? COGNIX_DESKTOP_SCOPES).split(" ").filter(Boolean);
  const code = await createAuthCode({
    userId: session.user.id,
    clientId,
    redirectUri,
    scopes,
    codeChallenge,
  });
  const back = new URL(redirectUri);
  back.searchParams.set("code", code);
  if (state) back.searchParams.set("state", state);
  return { ok: true as const, redirectTo: back.toString() };
}

export async function exchangeDesktopCode(input: {
  grantType: string | null;
  code: string | null;
  codeVerifier: string | null;
  clientId: string | null;
  redirectUri: string | null;
}) {
  const { grantType, code, codeVerifier, clientId, redirectUri } = input;
  if (grantType !== "authorization_code" || !code || !clientId)
    throw new Error("invalid_request");
  const pending = await consumeAuthCode(code);
  if (!pending) throw new Error("invalid_grant");
  if (pending.clientId !== clientId) throw new Error("invalid_grant");
  if (redirectUri && pending.redirectUri !== redirectUri)
    throw new Error("invalid_grant");
  if (!verifyPkce(codeVerifier ?? "", pending.codeChallenge))
    throw new Error("invalid_grant");

  const [user] = await pgDb
    .select()
    .from(UserTable)
    .where(eq(UserTable.id, pending.userId))
    .limit(1);
  if (!user) throw new Error("invalid_grant");

  const token = newToken(32);
  const now = new Date();
  await pgDb.insert(SessionTable).values({
    token,
    userId: user.id,
    expiresAt: new Date(now.getTime() + ACCESS_TTL_S * 1000),
    createdAt: now,
    updatedAt: now,
  });

  const nowSec = Math.floor(now.getTime() / 1000);
  return {
    access_token: token,
    token_type: "Bearer",
    expires_in: ACCESS_TTL_S,
    scope: pending.scopes.join(" "),
    id_token: signIdToken({
      iss:
        process.env.BETTER_AUTH_URL ??
        process.env.NEXT_PUBLIC_BASE_URL ??
        "https://cognix.iampriyam.me",
      sub: user.id,
      aud: clientId,
      email: user.email,
      name: user.name,
      exp: nowSec + ACCESS_TTL_S,
      iat: nowSec,
    }),
  };
}
