export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Startup tasks are intentionally best-effort. A transient database
    // outage, a failed migration, or an MCP init error must never take down
    // the whole server — that previously caused repeated 500s / "Routing
    // Middleware has crashed" on every request and a crash loop on restart.
    try {
      const runMigrateIfEnabled = await import("./lib/db/pg/migrate.pg").then(
        (m) => m.runMigrateIfEnabled,
      );
      await runMigrateIfEnabled();
    } catch (error) {
      console.error(
        "[instrumentation] startup migration failed; continuing without it:",
        error,
      );
    }

    try {
      const initMCPManager = await import("./lib/ai/mcp/mcp-manager").then(
        (m) => m.initMCPManager,
      );
      await initMCPManager();
    } catch (error) {
      console.error(
        "[instrumentation] MCP manager init failed; continuing without it:",
        error,
      );
    }
  }
}
