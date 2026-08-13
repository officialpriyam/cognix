import { NextResponse } from "next/server";
import { eq, and, gt } from "drizzle-orm";
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
        session: SessionTable,
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
      .where(
        and(
          eq(SessionTable.token, token),
          gt(SessionTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    return NextResponse.json(rows[0]);
  } catch {
    return NextResponse.json({ error: "Auth failed" }, { status: 401 });
  }
}
