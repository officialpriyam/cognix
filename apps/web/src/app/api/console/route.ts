import { getSession } from "auth/server";
import { desc, eq } from "drizzle-orm";
import { getCognixOwnConfig } from "lib/ai/providers/cognixown";
import { pgClient, pgDb } from "lib/db/pg/db.pg";
import {
  AccountTable,
  OAuthAccessTokenTable,
  OAuthApplicationTable,
  SessionTable,
} from "lib/db/pg/schema.pg";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Trusted clients configured in code (no oauth_application row exists). */
const TRUSTED_CLIENT_NAMES: Record<string, string> = {
  "cognix-desktop": "Cognix Desktop",
};

export type ConsoleSnapshot = {
  sessions: Array<{
    id: string;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
    ipAddress: string | null;
    userAgent: string | null;
    current: boolean;
  }>;
  accounts: Array<{
    id: string;
    providerId: string;
    createdAt: string;
  }>;
  connectedApps: Array<{
    clientId: string;
    name: string;
    kind: "desktop" | "oauth";
    lastUsed: string | null;
    scopes: string;
  }>;
  cognixOwnUsage: Array<{ day: string; count: number }>;
  cognixOwnLimit: number;
  cognixOwnConfigured: boolean;
};

/**
 * Everything the user console shows in one authenticated snapshot: active
 * sessions (signed-in locations), social sign-in methods, connected
 * applications (desktop tokens + OAuth apps), and CognixOwn daily usage.
 */
export async function GET() {
  const session = await getSession();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const [sessions, accounts, appTokens, usageRows] = await Promise.all([
    pgDb
      .select({
        id: SessionTable.id,
        token: SessionTable.token,
        createdAt: SessionTable.createdAt,
        updatedAt: SessionTable.updatedAt,
        expiresAt: SessionTable.expiresAt,
        ipAddress: SessionTable.ipAddress,
        userAgent: SessionTable.userAgent,
      })
      .from(SessionTable)
      .where(eq(SessionTable.userId, userId))
      .orderBy(desc(SessionTable.updatedAt)),
    pgDb
      .select({
        id: AccountTable.id,
        providerId: AccountTable.providerId,
        createdAt: AccountTable.createdAt,
      })
      .from(AccountTable)
      .where(eq(AccountTable.userId, userId))
      .orderBy(desc(AccountTable.createdAt)),
    pgDb
      .select({
        clientId: OAuthAccessTokenTable.clientId,
        scopes: OAuthAccessTokenTable.scopes,
        updatedAt: OAuthAccessTokenTable.updatedAt,
      })
      .from(OAuthAccessTokenTable)
      .where(eq(OAuthAccessTokenTable.userId, userId))
      .orderBy(desc(OAuthAccessTokenTable.updatedAt))
      .limit(50),
    // cognixown_usage is created lazily on first use (see recordCognixOwnUsage),
    // so a missing table just means "no usage yet" — not an error.
    pgClient<{ day: string; count: number }[]>`
      SELECT day::text AS day, count
      FROM cognixown_usage
      WHERE user_id = ${userId}
      ORDER BY day DESC
      LIMIT 14
    `.catch(() => [] as { day: string; count: number }[]),
  ]);

  // Collapse OAuth tokens to one row per client (most recent wins).
  const appsByClient = new Map<
    string,
    ConsoleSnapshot["connectedApps"][number]
  >();
  for (const token of appTokens) {
    const existing = appsByClient.get(token.clientId);
    if (existing) continue;
    appsByClient.set(token.clientId, {
      clientId: token.clientId,
      name:
        TRUSTED_CLIENT_NAMES[token.clientId] ??
        (await lookupAppName(token.clientId)) ??
        token.clientId,
      kind: TRUSTED_CLIENT_NAMES[token.clientId] ? "desktop" : "oauth",
      lastUsed: token.updatedAt.toISOString(),
      scopes: token.scopes,
    });
  }

  const cognixOwn = getCognixOwnConfig();

  const snapshot: ConsoleSnapshot = {
    sessions: sessions.map((row) => ({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      current: row.token === session.session?.token,
    })),
    accounts: accounts.map((row) => ({
      id: row.id,
      providerId: row.providerId,
      createdAt: row.createdAt.toISOString(),
    })),
    connectedApps: Array.from(appsByClient.values()),
    cognixOwnUsage: usageRows.map((row) => ({
      day: String(row.day),
      count: Number(row.count),
    })),
    cognixOwnLimit: cognixOwn.dailyLimit,
    cognixOwnConfigured: cognixOwn.isConfigured,
  };

  return NextResponse.json(snapshot);
}

async function lookupAppName(clientId: string): Promise<string | null> {
  const rows = await pgDb
    .select({ name: OAuthApplicationTable.name })
    .from(OAuthApplicationTable)
    .where(eq(OAuthApplicationTable.clientId, clientId))
    .limit(1);
  return rows[0]?.name ?? null;
}
