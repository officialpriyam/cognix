import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgClient: postgres.Sql | undefined;
}

// Reuse one client per warm serverless instance. Supabase's transaction pooler
// is shared across every concurrent instance — keep max low (default 1) so
// instance count × max stays within the pooler limit. Override via env if needed.
//
// postgres.js has no client-side statement timeout: once a query is sent on an
// established connection, nothing bounds it. A query stuck behind a lock or a
// saturated pooler therefore hangs forever — the route never responds and the
// proxy returns 502 (which is also what wedges every later query when max is
// 1). These startup GUCs make Postgres abort runaway queries server-side so
// hangs become catchable errors (route catch → 500 JSON) instead of 502s.
// Tune via env (milliseconds); "0" disables a timeout.
export const pgClient =
  globalThis._pgClient ??
  postgres(process.env.POSTGRES_URL!, {
    prepare: false,
    max: process.env.POSTGRES_POOL_MAX
      ? Number(process.env.POSTGRES_POOL_MAX)
      : 1,
    idle_timeout: 20,
    connect_timeout: 10,
    connection: {
      statement_timeout: process.env.POSTGRES_STATEMENT_TIMEOUT_MS
        ? Number(process.env.POSTGRES_STATEMENT_TIMEOUT_MS)
        : 30_000,
      lock_timeout: process.env.POSTGRES_LOCK_TIMEOUT_MS
        ? Number(process.env.POSTGRES_LOCK_TIMEOUT_MS)
        : 10_000,
      idle_in_transaction_session_timeout: process.env
        .POSTGRES_IDLE_TX_TIMEOUT_MS
        ? Number(process.env.POSTGRES_IDLE_TX_TIMEOUT_MS)
        : 60_000,
    },
  });

globalThis._pgClient = pgClient;

export const pgDb = drizzle(pgClient, { schema });
