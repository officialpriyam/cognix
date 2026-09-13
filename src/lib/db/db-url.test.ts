import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resolveDbUrl } from "./db-url";

let originalEnv: Record<string, string | undefined>;

const ALL_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "SUPABASE_DB_URL",
  "POSTGRES_HOST",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_DATABASE",
  "POSTGRES_PORT",
  "PGHOST",
  "PGUSER",
  "PGPASSWORD",
  "PGDATABASE",
  "PGPORT",
];

describe("getMigrationDbUrl (module-cached, isolated)", () => {
  beforeEach(() => {
    vi.resetModules();
    originalEnv = { ...process.env };
    for (const key of ALL_KEYS) delete process.env[key];
    delete process.env.DB_MIGRATION_URL;
  });

  afterEach(() => {
    process.env = originalEnv as unknown as typeof process.env;
  });

  it("DB_MIGRATION_URL overrides the app URL for migrations", async () => {
    process.env.DATABASE_URL =
      "postgres://u:p@aws-0-region.pooler.supabase.com:6543/postgres";
    process.env.DB_MIGRATION_URL =
      "postgres://u:p@db.xxxx.supabase.co:5432/postgres";

    const { getMigrationDbUrl: getMigration } = await import("./db-url");
    const migration = getMigration();
    expect(migration.url).toContain("db.xxxx.supabase.co:5432");
    expect(migration.source).toBe("DB_MIGRATION_URL");
  });

  it("falls back to the app URL when DB_MIGRATION_URL is unset", async () => {
    process.env.POSTGRES_URL = "postgres://u:p@localhost:5432/appdb";

    const { getMigrationDbUrl: getMigration } = await import("./db-url");
    const migration = getMigration();
    expect(migration.url).toBe("postgres://u:p@localhost:5432/appdb");
    expect(migration.source).toBe("POSTGRES_URL");
  });

  it("uses POSTGRES_URL_NON_POOLING when DB_MIGRATION_URL is unset", async () => {
    process.env.DATABASE_URL =
      "postgres://u:p@pooler.supabase.com:6543/postgres";
    process.env.POSTGRES_URL_NON_POOLING =
      "postgres://u:p@db.direct.supabase.co:5432/postgres";

    const { getMigrationDbUrl: getMigration } = await import("./db-url");
    const migration = getMigration();
    expect(migration.url).toContain("db.direct.supabase.co:5432");
    expect(migration.source).toBe("POSTGRES_URL_NON_POOLING");
  });
});

describe("resolveDbUrl", () => {
  beforeEach(() => {
    originalEnv = { ...process.env };
    for (const key of ALL_KEYS) delete process.env[key];
  });

  afterEach(() => {
    process.env = originalEnv as unknown as typeof process.env;
  });

  it("prefers DATABASE_URL over POSTGRES_URL", () => {
    process.env.DATABASE_URL = "postgres://u:p@db.supabase.co:5432/postgres";
    process.env.POSTGRES_URL = "postgres://u:p@ep-cool-name.neon.tech:5432/db";

    const r = resolveDbUrl();
    expect(r.url).toContain("db.supabase.co");
    expect(r.source).toBe("DATABASE_URL");
    expect(r.sslInjected).toBe(true);
  });

  it("falls back to POSTGRES_URL (Vercel/Neon convention)", () => {
    process.env.POSTGRES_URL =
      "postgres://u:p@ep-cool-name-123.eu-central-1.aws.neon.tech/neondb";

    const r = resolveDbUrl();
    expect(r.url).toBe(
      "postgres://u:p@ep-cool-name-123.eu-central-1.aws.neon.tech/neondb?sslmode=require",
    );
    expect(r.source).toBe("POSTGRES_URL");
    expect(r.sslInjected).toBe(true);
  });

  it("does not add sslmode to localhost URLs", () => {
    process.env.POSTGRES_URL = "postgres://user:pass@localhost:5432/mydb";
    const r = resolveDbUrl();
    expect(r.url).toBe("postgres://user:pass@localhost:5432/mydb");
    expect(r.sslInjected).toBe(false);
  });

  it("does not add sslmode to private-network hosts", () => {
    process.env.DATABASE_URL = "postgres://user:pass@192.168.1.10:5432/mydb";
    const r = resolveDbUrl();
    expect(r.url).toBe("postgres://user:pass@192.168.1.10:5432/mydb");
    expect(r.sslInjected).toBe(false);
  });

  it("does not duplicate an existing sslmode", () => {
    process.env.DATABASE_URL =
      "postgres://u:p@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?sslmode=disable";
    const r = resolveDbUrl();
    expect(r.url.endsWith("?sslmode=disable")).toBe(true);
    expect(r.sslInjected).toBe(false);
  });

  it("appends sslmode with & when query params already exist", () => {
    process.env.DATABASE_URL =
      "postgres://u:p@myhost.example.com:5432/db?pools=true";
    const r = resolveDbUrl();
    expect(r.url).toBe(
      "postgres://u:p@myhost.example.com:5432/db?pools=true&sslmode=require",
    );
    expect(r.sslInjected).toBe(true);
  });

  it("builds URL from split POSTGRES_* vars (Neon/Vercel)", () => {
    process.env.POSTGRES_HOST = "ep-cool-name.eu-central-1.aws.neon.tech";
    process.env.POSTGRES_USER = "neon_user";
    process.env.POSTGRES_PASSWORD = "s3cret";
    process.env.POSTGRES_DATABASE = "neondb";

    const r = resolveDbUrl();
    expect(r.url).toBe(
      "postgres://neon_user:s3cret@ep-cool-name.eu-central-1.aws.neon.tech:5432/neondb?sslmode=require",
    );
    expect(r.source).toBe("POSTGRES_HOST (ssl injected)");
    expect(r.sslInjected).toBe(true);
  });

  it("builds URL from split PG* vars without SSL for local host", () => {
    process.env.PGHOST = "localhost";
    process.env.PGUSER = "pguser";
    process.env.PGPASSWORD = "pgpass";
    process.env.PGDATABASE = "pgdb";
    process.env.PGPORT = "5433";

    const r = resolveDbUrl();
    expect(r.url).toBe("postgres://pguser:pgpass@localhost:5433/pgdb");
    expect(r.source).toBe("PGHOST");
    expect(r.sslInjected).toBe(false);
  });

  it("encodes special characters in credentials", () => {
    process.env.POSTGRES_HOST = "localhost";
    process.env.POSTGRES_USER = "user@org";
    process.env.POSTGRES_PASSWORD = "p@ss:word";
    process.env.POSTGRES_DATABASE = "mydb";

    const r = resolveDbUrl();
    expect(r.url).toBe(
      "postgres://user%40org:p%40ss%3Aword@localhost:5432/mydb",
    );
  });

  it("POSTGRES_HOST wins over PGHOST", () => {
    process.env.POSTGRES_HOST = "localhost";
    process.env.PGHOST = "remote.example.com";
    process.env.POSTGRES_USER = "u";
    process.env.POSTGRES_DATABASE = "a";

    const r = resolveDbUrl();
    expect(r.url).toContain("@localhost:");
    expect(r.source).toBe("POSTGRES_HOST");
  });

  it("uses POSTGRES_URL_NON_POOLING and SUPABASE_DB_URL as candidates", () => {
    process.env.POSTGRES_URL_NON_POOLING =
      "postgres://u:p@db.direct.supabase.co:5432/postgres";
    expect(resolveDbUrl().source).toBe("POSTGRES_URL_NON_POOLING");

    delete process.env.POSTGRES_URL_NON_POOLING;
    process.env.SUPABASE_DB_URL =
      "postgres://u:p@db.direct.supabase.co:5432/postgres";
    expect(resolveDbUrl().source).toBe("SUPABASE_DB_URL");
  });

  it("throws with a helpful message when nothing is set", () => {
    expect(() => resolveDbUrl()).toThrow(
      /No PostgreSQL connection configuration/,
    );
  });
});
