export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dependency installation must never require a reachable database or
    // perform DDL. Runtime startup applies migrations according to
    // DB_AUTO_MIGRATE and holds an advisory lock while doing so.
    const runMigrateIfEnabled = await import("./lib/db/pg/migrate.pg").then(
      (m) => m.runMigrateIfEnabled,
    );
    await runMigrateIfEnabled().catch((e) => {
      console.error(e);
      process.exit(1);
    });

    const initMCPManager = await import("./lib/ai/mcp/mcp-manager").then(
      (m) => m.initMCPManager,
    );
    await initMCPManager();
  }
}
