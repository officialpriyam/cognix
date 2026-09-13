import { IS_VERCEL_ENV } from "lib/const";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (!IS_VERCEL_ENV) {
      // run DB migration (respects DB_AUTO_MIGRATE: true/false/force/check)
      const runMigrateIfEnabled = await import(
        "./lib/db/pg/migrate.pg"
      ).then((m) => m.runMigrateIfEnabled);
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
}
