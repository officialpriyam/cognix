import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("logger", () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("lib/db/db-url", () => ({
  getDbUrl: vi.fn(() => ({ url: "postgres://localhost:5432/x", source: "test", sslInjected: false })),
  getMigrationDbUrl: vi.fn(() => ({ url: "postgres://localhost:5432/x", source: "test", sslInjected: false })),
}));

import { runMigrateIfEnabled } from "./migrate.pg";

describe("runMigrateIfEnabled / DB_DISABLE_MIGRATIONS", () => {
  const original = process.env.DB_DISABLE_MIGRATIONS;
  beforeEach(() => {
    process.env.DB_DISABLE_MIGRATIONS = "true";
    process.env.DB_AUTO_MIGRATE = "force";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.DB_DISABLE_MIGRATIONS;
    else process.env.DB_DISABLE_MIGRATIONS = original;
  });

  it("skips startup migrations entirely when DB_DISABLE_MIGRATIONS=true", async () => {
    await expect(runMigrateIfEnabled()).resolves.toBeUndefined();
  });
});
