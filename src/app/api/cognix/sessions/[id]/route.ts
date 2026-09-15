import { getSession } from "auth/server";
import {
  deleteCognixSession,
  getCognixSession,
} from "lib/db/pg/repositories/cognix-sync-repository.pg";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const session = await getSession();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const result = await getCognixSession(session.user.id, id);
  if (!result) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(result);
}

export async function DELETE(_request: Request, context: Context) {
  const session = await getSession();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  await deleteCognixSession(session.user.id, id);
  return Response.json({ success: true });
}
