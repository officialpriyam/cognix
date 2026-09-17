import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { existsSync } from "node:fs";
import { join } from "path";
import postgres from "postgres";
import * as schema from "./schema.pg";

// The migrations folder lives in apps/web. Depending on the entry point the
// process cwd is either apps/web (Next boot, package scripts) or the monorepo
// root (root `pnpm db:migrate`, CI e2e job) — support both.
const resolveMigrationsFolder = () => {
  const fromAppCwd = join(process.cwd(), "src/lib/db/migrations/pg");
  if (existsSync(fromAppCwd)) return fromAppCwd;
  return join(process.cwd(), "apps/web/src/lib/db/migrations/pg");
};

export const runMigrate = async () => {
  console.log("⏳ Running PostgreSQL migrations...");

  const start = Date.now();
  // Migrations run DDL/backfills that can legitimately exceed the request
  // statement_timeout, so run them on a dedicated short-lived client without
  // query timeouts. This must be a separate client (not pgClient.reserve()):
  // drizzle() writes to client.options.parsers, which reserved connections
  // don't expose at runtime.
  const migrationClient = postgres(process.env.POSTGRES_URL!, {
    prepare: false,
    max: 1,
    connect_timeout: 10,
  });
  try {
    await migrate(drizzle(migrationClient, { schema }), {
      migrationsFolder: resolveMigrationsFolder(),
    }).catch((err) => {
      console.error(
        `❌ PostgreSQL migrations failed. check the postgres instance is running.`,
        err.cause,
      );
      throw err;
    });
  } finally {
    await migrationClient.end();
  }
  const end = Date.now();

  console.log("✅ PostgreSQL migrations completed in", end - start, "ms");
};
