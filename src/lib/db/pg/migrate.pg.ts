import { migrate } from "drizzle-orm/node-postgres/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { Pool, type PoolClient } from "pg";
type PgPool = Pool;
import { join } from "path";
import { getMigrationDbUrl } from "lib/db/db-url";
import logger from "logger";
import {
  computePendingMigrations,
  MIGRATION_LOCK_KEY,
  parseMigrationMode,
  type MigrationMode,
  MIGRATION_MODE_ENV,
} from "./migrate-mode";

const MIGRATIONS_FOLDER = join(process.cwd(), "src/lib/db/migrations/pg");

/**
 * Dedicated migration connection. Uses DB_MIGRATION_URL when provided
 * (Supabase: the direct "Session pooler" URL on port 5432, NOT the
 * transaction pooler on 6543 — advisory locks don't survive transaction
 * pooling), falling back to the regular app URL.
 */
function createMigrationDb() {
  const { url, source } = getMigrationDbUrl();
  logger.info(`[db:migrate] using connection from ${source}`);
  const pool = new Pool({
    connectionString: url,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });
  return drizzle(pool);
}

let migrationDb: ReturnType<typeof createMigrationDb> | undefined;

function getMigrationDb() {
  migrationDb ??= createMigrationDb();
  return migrationDb;
}

export interface MigrationStatus {
  mode: MigrationMode;
  total: number;
  applied: number;
  pending: number;
  /** Hash prefixes of migrations that have not been applied yet. */
  pendingNames: string[];
  /** True when the migration bookkeeping table exists. */
  tableExists: boolean;
}

/** Reads the migration files bundled with the app (drizzle journal + hashes). */
function loadMigrations() {
  return readMigrationFiles({ migrationsFolder: MIGRATIONS_FOLDER });
}

async function migrationTableExists(client: PoolClient): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    "select to_regclass('drizzle.__drizzle_migrations') is not null as exists",
  );
  return result.rows[0]?.exists === true;
}

/** Newest applied-migration timestamp, or null when none recorded. */
async function fetchLastAppliedCreatedAt(
  client: PoolClient,
): Promise<number | null> {
  const result = await client.query<{ created_at: string | number | null }>(
    "select max(created_at) as created_at from drizzle.__drizzle_migrations",
  );
  const raw = result.rows[0]?.created_at;
  if (raw === null || raw === undefined) return null;
  return Number(raw);
}

/**
 * Applies pending migrations while holding a session advisory lock.
 * With max:1 the pool always hands back the same connection, so the lock,
 * the migrator and the unlock all share one session — and the lock is
 * genuinely held for the whole run.
 */
async function runMigrationsWithLock() {
  const db = getMigrationDb();
  const client = await (db.$client as PgPool).connect();
  try {
    await client.query("select pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    try {
      await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
    } finally {
      await client.query("select pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]);
    }
  } finally {
    client.release();
  }
}

/**
 * Reports migration status without modifying the database.
 */
export async function getMigrationStatus(): Promise<MigrationStatus> {
  const mode = parseMigrationMode(process.env[MIGRATION_MODE_ENV]);
  const migrations = loadMigrations();

  const client = await (getMigrationDb().$client as PgPool).connect();
  try {
    const tableExists = await migrationTableExists(client);
    if (!tableExists) {
      return {
        mode,
        total: migrations.length,
        applied: 0,
        pending: migrations.length,
        pendingNames: migrations.map((m) => m.hash.slice(0, 12)),
        tableExists,
      };
    }

    const lastAppliedAt = await fetchLastAppliedCreatedAt(client);
    const pending = computePendingMigrations(migrations, lastAppliedAt);
    return {
      mode,
      total: migrations.length,
      applied: migrations.length - pending.length,
      pending: pending.length,
      pendingNames: pending.map((m) => m.hash.slice(0, 12)),
      tableExists,
    };
  } finally {
    client.release();
  }
}

/**
 * Runs PostgreSQL migrations according to DB_AUTO_MIGRATE:
 *
 * | DB_AUTO_MIGRATE | behavior                                          |
 * |-----------------|---------------------------------------------------|
 * | unset / true    | smart: apply only when pending migrations exist    |
 * | false           | never migrate on startup                           |
 * | force           | always run the migrator (legacy behavior)          |
 * | check           | log pending migrations without applying them       |
 */
export const runMigrateIfEnabled = async (): Promise<void> => {
  const mode = parseMigrationMode(process.env[MIGRATION_MODE_ENV]);

  if (mode === "never") {
    logger.info("⏭️ DB_AUTO_MIGRATE=false — skipping startup migrations");
    return;
  }

  if (mode === "always") {
    logger.info("⏳ Running PostgreSQL migrations (DB_AUTO_MIGRATE=force)...");
    const start = Date.now();
    await runMigrationsWithLock();
    logger.info("✅ PostgreSQL migrations completed in", Date.now() - start, "ms");
    return;
  }

  // mode === "smart" | "check"
  const start = Date.now();
  const status = await getMigrationStatus();

  if (status.pending === 0) {
    logger.info(
      `✅ Database schema is up to date (${status.applied}/${status.total} migrations) — checked in ${Date.now() - start}ms`,
    );
    return;
  }

  logger.info(
    `⏳ ${status.pending} pending PostgreSQL migration(s) detected (checked in ${Date.now() - start}ms)...`,
  );

  if (mode === "check") {
    logger.warn(
      `🔎 DB_AUTO_MIGRATE=check — not applying. Pending: ${status.pendingNames.join(", ")}`,
    );
    return;
  }

  await runMigrationsWithLock();
  logger.info("✅ PostgreSQL migrations completed in", Date.now() - start, "ms");
};

/**
 * Legacy entrypoint: always run the migrator (used by `pnpm db:migrate`).
 */
export const runMigrate = async (): Promise<void> => {
  logger.info("⏳ Running PostgreSQL migrations...");
  const start = Date.now();
  await runMigrationsWithLock().catch((err) => {
    logger.error(
      `❌ PostgreSQL migrations failed. check the postgres instance is running.`,
      err.cause,
    );
    throw err;
  });
  logger.info("✅ PostgreSQL migrations completed in", Date.now() - start, "ms");
};