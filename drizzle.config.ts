import { defineConfig } from "drizzle-kit";
import "load-env";
import { resolveDbUrl } from "lib/db/db-url";

const dialect = "postgresql";

const url = resolveDbUrl().url;

const schema = "./src/lib/db/pg/schema.pg.ts";

const out = "./src/lib/db/migrations/pg";

export default defineConfig({
  schema,
  out,
  dialect,
  migrations: {},
  dbCredentials: {
    url,
  },
});
