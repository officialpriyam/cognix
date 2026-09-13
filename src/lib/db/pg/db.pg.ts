// import { Logger } from "drizzle-orm";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { getDbUrl } from "lib/db/db-url";
import { Pool } from "pg";

// class MyLogger implements Logger {
//   logQuery(query: string, params: unknown[]): void {
//     console.log({ query, params });
//   }
// }

const resolved = (() => {
  try {
    return getDbUrl();
  } catch (error) {
    // Don't crash at import time (e.g. unit tests, build). The pool below
    // still allows lazy env resolution (pg honors PG* variables natively);
    // real connection attempts will surface a clear error.
    console.warn(`[db] ${(error as Error).message}`);
    return undefined;
  }
})();

if (resolved?.sslInjected) {
  console.info(
    `[db] Using SSL for remote Postgres host (source: ${resolved.source}). ` +
      "Set sslmode in the URL to override.",
  );
}

// A global singleton pool avoids exhausting connections across HMR/dev reloads
// and works well with serverless platforms (Vercel + Neon/Supabase poolers).
// NOTE: EMAXCONNSESSION ("max clients reached in session mode, pool_size: 15")
// from Supabase/Supavisor means the app runtime is pointed at a session-mode
// URL (port 5432) instead of the transaction pooler (port 6543). In session
// mode 1 app connection == 1 Postgres connection, so even a modest `max`
// multiplied by a few serverless instances exhausts the pool. The runtime URL
// must be the transaction pooler; the :5432 URL is only for DB_MIGRATION_URL.
const globalForDb = globalThis as unknown as {
  pgPool?: import("pg").Pool;
};

function isSessionModeUrl(url: string): boolean {
  // Supabase pooler on :5432 == session mode; direct db.*.supabase.co is also
  // session-scoped (no Supavisor multiplexing).
  return (
    /pooler\.supabase\.com:5432/i.test(url) ||
    /db\.[^/]+\.supabase\.co/i.test(url)
  );
}

function resolvePoolMax(): number {
  const override = Number(process.env.PGPOOL_MAX);
  if (Number.isFinite(override) && override > 0) return Math.floor(override);
  // Remote managed Postgres (Supabase/Neon/...): keep per-instance pools tiny
  // so N serverless instances x max stays under Supavisor's pool_size (15 by
  // default). Local dev/docker can afford a larger pool.
  if (resolved?.sslInjected) return 2;
  return 10;
}

if (
  resolved &&
  isSessionModeUrl(resolved.url) &&
  process.env.DB_ALLOW_SESSION_URL !== "1"
) {
  console.warn(
    `[db] WARNING: ${resolved.source} looks like a Supabase session-mode/direct URL ` +
      "(port 5432 / db.*.supabase.co). The app runtime should use the " +
      "transaction pooler (port 6543) or you will hit EMAXCONNSESSION " +
      "(max clients reached, pool_size: 15) under load. " +
      "Use the :5432 URL only for DB_MIGRATION_URL. " +
      "Set DB_ALLOW_SESSION_URL=1 to silence this (e.g. local dev).",
  );
}

export const pgPool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: resolved?.url,
    // Supabase/Neon poolers (PgBouncer transaction mode) don't support
    // server-side named prepared statements; drizzle-orm/node-postgres only
    // issues unnamed statements, so no extra opt-out is needed here.
    max: resolvePoolMax(),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  });

// Always cache — required for Next.js dev HMR and for reusing warm
// serverless instances instead of opening a fresh pool per invocation.
globalForDb.pgPool = pgPool;

export const pgDb = drizzlePg(pgPool, {
  //   logger: new MyLogger(),
});
