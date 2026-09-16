import { and, desc, eq } from "drizzle-orm";
import { pgDb as db } from "../db.pg";
import {
  CognixChatMemoryTable,
  CognixSessionMessageTable,
  CognixSessionTable,
} from "../schema.pg";

export type CognixSyncMessage = {
  id: string;
  role: string;
  parts: unknown;
  createdAt?: string;
  meta?: Record<string, unknown>;
};

export type CognixSyncSession = {
  id: string;
  title?: string;
  model?: Record<string, unknown> | null;
  meta?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export async function upsertCognixSession(
  userId: string,
  session: CognixSyncSession,
  messages: CognixSyncMessage[],
) {
  await db
    .insert(CognixSessionTable)
    .values({
      id: session.id,
      userId,
      title: session.title ?? "",
      model: session.model ?? null,
      meta: session.meta ?? {},
      createdAt: session.createdAt ? new Date(session.createdAt) : new Date(),
      updatedAt: session.updatedAt ? new Date(session.updatedAt) : new Date(),
    })
    .onConflictDoUpdate({
      target: CognixSessionTable.id,
      set: {
        title: session.title ?? CognixSessionTable.title,
        model: session.model ?? null,
        meta: session.meta ?? {},
        updatedAt: new Date(),
      },
    });

  if (messages.length) {
    await db
      .delete(CognixSessionMessageTable)
      .where(eq(CognixSessionMessageTable.sessionId, session.id));
    await db.insert(CognixSessionMessageTable).values(
      messages.map((m) => ({
        id: m.id,
        sessionId: session.id,
        role: m.role,
        parts: m.parts,
        meta: m.meta ?? {},
        createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
      })),
    );
  }
}

export async function listCognixSessions(userId: string) {
  return db
    .select()
    .from(CognixSessionTable)
    .where(eq(CognixSessionTable.userId, userId))
    .orderBy(desc(CognixSessionTable.updatedAt));
}

export async function getCognixSession(userId: string, sessionId: string) {
  const [session] = await db
    .select()
    .from(CognixSessionTable)
    .where(
      and(
        eq(CognixSessionTable.id, sessionId),
        eq(CognixSessionTable.userId, userId),
      ),
    )
    .limit(1);
  if (!session) return null;
  const messages = await db
    .select()
    .from(CognixSessionMessageTable)
    .where(eq(CognixSessionMessageTable.sessionId, sessionId))
    .orderBy(CognixSessionMessageTable.createdAt);
  return { session, messages };
}

export async function deleteCognixSession(userId: string, sessionId: string) {
  await db
    .delete(CognixSessionTable)
    .where(
      and(
        eq(CognixSessionTable.id, sessionId),
        eq(CognixSessionTable.userId, userId),
      ),
    );
}

export async function putCognixMemory(
  userId: string,
  entries: { sessionId?: string | null; kind?: string; content: string }[],
) {
  const now = new Date();
  await db.insert(CognixChatMemoryTable).values(
    entries.map((e) => ({
      userId,
      sessionId: e.sessionId ?? null,
      kind: e.kind ?? "summary",
      content: e.content,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

export async function listCognixMemory(
  userId: string,
  sessionId?: string | null,
) {
  const where = sessionId
    ? and(
        eq(CognixChatMemoryTable.userId, userId),
        eq(CognixChatMemoryTable.sessionId, sessionId),
      )
    : eq(CognixChatMemoryTable.userId, userId);
  return db
    .select()
    .from(CognixChatMemoryTable)
    .where(where)
    .orderBy(desc(CognixChatMemoryTable.updatedAt));
}

const summaryWhere = (userId: string, sessionId: string) =>
  and(
    eq(CognixChatMemoryTable.userId, userId),
    eq(CognixChatMemoryTable.sessionId, sessionId),
    eq(CognixChatMemoryTable.kind, "summary"),
  );

export async function hasCognixSessionSummary(
  userId: string,
  sessionId: string,
) {
  const rows = await db
    .select({ id: CognixChatMemoryTable.id })
    .from(CognixChatMemoryTable)
    .where(summaryWhere(userId, sessionId))
    .limit(1);
  return rows.length > 0;
}

export async function replaceCognixSessionSummary(
  userId: string,
  sessionId: string,
  content: string,
) {
  const now = new Date();
  await db.delete(CognixChatMemoryTable).where(summaryWhere(userId, sessionId));
  await db.insert(CognixChatMemoryTable).values({
    userId,
    sessionId,
    kind: "summary",
    content,
    createdAt: now,
    updatedAt: now,
  });
}
