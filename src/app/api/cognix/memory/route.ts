import { getSession } from "auth/server";
import {
  listCognixMemory,
  putCognixMemory,
} from "lib/db/pg/repositories/cognix-sync-repository.pg";
import { z } from "zod";

const bodySchema = z.object({
  entries: z
    .array(
      z.object({
        sessionId: z.string().optional(),
        kind: z.enum(["summary", "note", "fact"]).optional(),
        content: z.string().min(1),
      }),
    )
    .min(1),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "Invalid input", details: parsed.error.message },
      { status: 400 },
    );
  await putCognixMemory(session.user.id, parsed.data.entries);
  return Response.json({ success: true });
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  const entries = await listCognixMemory(session.user.id, sessionId);
  return Response.json({ entries });
}
