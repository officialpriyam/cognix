import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { existsSync } from "node:fs";
import { join } from "path";
import { pgClient } from "lib/db/pg/db.pg";
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
  // statement_timeout, so run them on a reserved connection with the
  // query timeouts disabled instead of the shared request client.
  const reserved = await pgClient.reserve();
  try {
    await reserved.unsafe(
      "SET statement_timeout = 0; SET lock_timeout = 0; SET idle_in_transaction_session_timeout = 0",
    );
    await migrate(drizzle(reserved, { schema }), {
      migrationsFolder: resolveMigrationsFolder(),
    }).catch((err) => {
      console.error(
        `❌ PostgreSQL migrations failed. check the postgres instance is running.`,
        err.cause,
      );
      throw err;
    });
  } finally {
    reserved.release();
  }
  const end = Date.now();

  console.log("✅ PostgreSQL migrations completed in", end - start, "ms");
};
