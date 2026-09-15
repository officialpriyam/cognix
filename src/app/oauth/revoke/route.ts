import { eq } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { SessionTable } from "lib/db/pg/schema.pg";
import type { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.formData().catch(() => null);
  const token =
    typeof body?.get("token") === "string"
      ? (body.get("token") as string)
      : null;
  if (token)
    await pgDb.delete(SessionTable).where(eq(SessionTable.token, token));
  return new Response(null, { status: 204 });
}
