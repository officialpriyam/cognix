import { NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { SessionTable, UserTable } from "lib/db/pg/schema.pg";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    console.log("[desktop/session] Received token:", token ? `${token.substring(0, 20)}...` : "null");

    if (!token) {
      console.log("[desktop/session] No token provided");
      return NextResponse.json({ error: "No token provided" }, { status: 400 });
    }

    // Check all sessions for this token
    const rows = await pgDb
      .select({
        session: {
          id: SessionTable.id,
          token: SessionTable.token,
          expiresAt: SessionTable.expiresAt,
          userId: SessionTable.userId,
        },
        user: {
          id: UserTable.id,
          email: UserTable.email,
          name: UserTable.name,
          image: UserTable.image,
          role: UserTable.role,
        },
      })
      .from(SessionTable)
      .innerJoin(UserTable, eq(SessionTable.userId, UserTable.id))
      .where(eq(SessionTable.token, token))
      .limit(1);

    console.log("[desktop/session] DB lookup result:", rows.length > 0 ? {
      found: true,
      expiresAt: rows[0].session.expiresAt,
      now: new Date(),
      isExpired: rows[0].session.expiresAt < new Date(),
      userEmail: rows[0].user.email,
    } : { found: false });

    if (rows.length === 0) {
      // Also check without expiry filter
      const anyMatch = await pgDb
        .select({ token: SessionTable.token, expiresAt: SessionTable.expiresAt })
        .from(SessionTable)
        .where(eq(SessionTable.token, token))
        .limit(1);
      console.log("[desktop/session] Token exists in DB (any):", anyMatch.length > 0 ? {
        expiresAt: anyMatch[0].expiresAt,
        isExpired: anyMatch[0].expiresAt < new Date(),
      } : "NOT FOUND");
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    if (rows[0].session.expiresAt < new Date()) {
      console.log("[desktop/session] Session expired");
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    console.log("[desktop/session] Success for user:", rows[0].user.email);
    return NextResponse.json({
      user: rows[0].user,
      session: { token: rows[0].session.token },
    });
  } catch (error) {
    console.error("[desktop/session] Error:", error);
    return NextResponse.json({ error: "Auth failed" }, { status: 401 });
  }
}
