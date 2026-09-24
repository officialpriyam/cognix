import { getSession } from "auth/server";
import { and, eq } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { OAuthAccessTokenTable, SessionTable } from "lib/db/pg/schema.pg";
import { NextResponse } from "next/server";
import z from "zod";

const bodySchema = z.object({
  sessionId: z.string().uuid().optional(),
  clientId: z.string().min(1).max(255).optional(),
});

/**
 * Revoke one of the user's own sessions or disconnect one connected app
 * (deletes its OAuth access/refresh tokens). Ownership is enforced by the
 * userId predicate — ids belonging to other users simply match nothing.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Provide sessionId and/or clientId" },
      { status: 400 },
    );
  }
  if (!body.sessionId && !body.clientId) {
    return NextResponse.json(
      { error: "Provide sessionId and/or clientId" },
      { status: 400 },
    );
  }

  let revokedSessions = 0;
  if (body.sessionId) {
    const deleted = await pgDb
      .delete(SessionTable)
      .where(
        and(
          eq(SessionTable.id, body.sessionId),
          eq(SessionTable.userId, userId),
        ),
      )
      .returning({ id: SessionTable.id });
    revokedSessions = deleted.length;
  }

  let disconnectedApps = 0;
  if (body.clientId) {
    const deleted = await pgDb
      .delete(OAuthAccessTokenTable)
      .where(
        and(
          eq(OAuthAccessTokenTable.userId, userId),
          eq(OAuthAccessTokenTable.clientId, body.clientId),
        ),
      )
      .returning({ id: OAuthAccessTokenTable.id });
    disconnectedApps = deleted.length;
  }

  if (revokedSessions === 0 && disconnectedApps === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, revokedSessions, disconnectedApps });
}
