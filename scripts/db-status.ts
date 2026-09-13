import { colorize } from "consola/utils";
import "load-env";

const { getMigrationStatus } = await import("lib/db/pg/migrate.pg");

try {
  const status = await getMigrationStatus();

  console.log("📊 Migration status");
  console.log(`   Mode (DB_AUTO_MIGRATE): ${status.mode}`);
  console.log(
    `   Migrations: ${status.applied} applied / ${status.total} total`,
  );
  console.log(
    `   Bookkeeping table (drizzle.__drizzle_migrations): ${
      status.tableExists ? "exists" : "missing"
    }`,
  );

  if (status.pending === 0) {
    console.log(colorize("green", "✅ Database schema is up to date"));
  } else {
    console.log(
      colorize("yellow", `⚠️  ${status.pending} pending migration(s):`),
    );
    for (const name of status.pendingNames) {
      console.log(`   - ${name}`);
    }
    console.log(`\nApply them with: ${colorize("green", "pnpm db:migrate")}`);
    process.exitCode = 1;
  }

  process.exit(0);
} catch (error) {
  const err = error as Error & { cause?: unknown; errors?: unknown };
  const cause =
    (err.cause as Error | undefined)?.message ??
    (Array.isArray(err.errors)
      ? err.errors.map((e) => (e as Error).message).join("; ")
      : undefined);
  console.error(
    colorize("red", "❌ Failed to read migration status:"),
    err.message || cause || err,
  );
  if (!err.message && cause) {
    console.error("   (hint: is the database reachable? check your DB URL env var)");
  }
  process.exit(1);
}
