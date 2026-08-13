import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { SessionTable, UserTable } from "lib/db/pg/schema.pg";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 400 });
    }

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

    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    if (rows[0].session.expiresAt < new Date()) {
      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    return NextResponse.json({
      user: rows[0].user,
      session: { token: rows[0].session.token },
    });
  } catch {
    return NextResponse.json({ error: "Auth failed" }, { status: 401 });
  }
}
