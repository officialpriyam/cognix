import { generateText } from "ai";
import { getSession } from "auth/server";
import { customModelProvider } from "lib/ai/models";
import {
  hasCognixSessionSummary,
  listCognixSessions,
  replaceCognixSessionSummary,
  upsertCognixSession,
} from "lib/db/pg/repositories/cognix-sync-repository.pg";
import globalLogger from "logger";
import { z } from "zod";

const messageSchema = z.object({
  id: z.string().min(1),
  role: z.string().min(1),
  parts: z.unknown(),
  createdAt: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

const sessionSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  model: z.record(z.string(), z.unknown()).nullable().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const bodySchema = z.object({
  session: sessionSchema,
  messages: z.array(messageSchema).default([]),
  // generateSummary: force; final: mark this as an end-of-session push
  generateSummary: z.boolean().optional(),
  chatModel: z.object({ provider: z.string(), model: z.string() }).optional(),
});

function transcriptText(messages: { role: string; parts: unknown }[]) {
  return messages
    .slice(-40)
    .map((m) => `${m.role}: ${summarizeParts(m.parts)}`)
    .join("\n")
    .slice(0, 12000);
}

function summarizeParts(parts: unknown): string {
  if (typeof parts === "string") return parts;
  if (Array.isArray(parts))
    return parts
      .map((p) =>
        typeof p === "string"
          ? p
          : ((p as { text?: string; content?: string })?.text ??
            (p as { content?: string })?.content ??
            ""),
      )
      .filter(Boolean)
      .join(" ");
  return "";
}

// Best-effort: never let a summary failure break the chat backup.
async function autoSummarize(
  userId: string,
  sessionId: string,
  messages: { role: string; parts: unknown }[],
  chatModel?: { provider: string; model: string },
) {
  try {
    if (!messages.length || (await hasCognixSessionSummary(userId, sessionId)))
      return;
    const { text } = await generateText({
      model: customModelProvider.getModel(chatModel),
      system:
        "You summarize coding-agent sessions. Reply with 2-4 concise sentences capturing the goal, what was done, and any open questions.",
      prompt: transcriptText(messages),
    });
    const summary = text.trim();
    if (summary)
      await replaceCognixSessionSummary(
        userId,
        sessionId,
        summary.slice(0, 2000),
      );
  } catch (error) {
    globalLogger.error("cognix session auto-summary failed", error);
  }
}

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

  const { session: s, messages, generateSummary, chatModel } = parsed.data;
  await upsertCognixSession(session.user.id, s, messages);

  if (generateSummary ?? messages.length > 0) {
    await autoSummarize(session.user.id, s.id, messages, chatModel);
  }
  return Response.json({ success: true });
}

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const sessions = await listCognixSessions(session.user.id);
  return Response.json({ sessions });
}
