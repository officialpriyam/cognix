// import { Logger } from "drizzle-orm";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getDbUrl } from "lib/db/db-url";

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
const globalForDb = globalThis as unknown as {
  pgPool?: import("pg").Pool;
};

export const pgPool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: resolved?.url,
    // Supabase/Neon poolers (PgBouncer transaction mode) don't support
    // server-side prepared statements; keep them disabled.
    max: Number(process.env.PGPOOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pgPool;
}

export const pgDb = drizzlePg(pgPool, {
  //   logger: new MyLogger(),
});
