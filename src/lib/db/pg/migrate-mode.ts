/**
 * Pure helpers for the smart auto-migration feature.
 * Kept free of DB/imports so they are trivially unit-testable.
 */

/**
 * Migration modes controlled by the DB_AUTO_MIGRATE env var:
 *
 * - "smart"  (default, `true`): migrate on startup only when there are
 *            pending migrations. Fast, no DDL round-trips when up to date.
 * - "never"  (`false`): do not migrate on startup. Use `pnpm db:migrate`.
 * - "always" (`force`): always run the migrator on startup (legacy behavior).
 * - "check"  (`check`): report pending migrations without applying them.
 */
export type MigrationMode = "smart" | "never" | "always" | "check";

export const MIGRATION_MODE_ENV = "DB_AUTO_MIGRATE";

/** Session-level advisory-lock key so concurrent instances don't race migrations. */
export const MIGRATION_LOCK_KEY = 1128409166; // == 0x434F474E ("COGN")

export function parseMigrationMode(raw?: string): MigrationMode {
  const value = raw?.trim().toLowerCase() ?? "";
  if (value === "" || value === "true" || value === "1" || value === "on" || value === "yes") {
    return "smart";
  }
  if (value === "false" || value === "0" || value === "off" || value === "no") {
    return "never";
  }
  if (value === "force" || value === "always") {
    return "always";
  }
  if (value === "check" || value === "dry-run" || value === "dryrun") {
    return "check";
  }
  throw new Error(
    `Invalid ${MIGRATION_MODE_ENV} value "${raw}". ` +
      "Use one of: true, false, force, check.",
  );
}

export interface MigrationMetaLike {
  hash: string;
  folderMillis: number;
}

/**
 * Replicates drizzle-orm's node-postgres migrator decision rule exactly:
 * a migration is applied when its journal timestamp (folderMillis) is
 * strictly greater than the newest `created_at` recorded in the migrations
 * table (or when the table is empty). Using the same rule here means the
 * pending check never disagrees with what `migrate()` will actually do.
 */
export function computePendingMigrations(
  migrations: readonly MigrationMetaLike[],
  lastAppliedCreatedAt: number | null,
): MigrationMetaLike[] {
  if (lastAppliedCreatedAt === null) return [...migrations];
  return migrations.filter((m) => m.folderMillis > lastAppliedCreatedAt);
}
