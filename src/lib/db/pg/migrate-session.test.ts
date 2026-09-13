import { describe, expect, it, vi } from "vitest";
import { migrateWithSessionLock } from "./migrate-session";
import type { PoolClient } from "pg";
import { MIGRATION_LOCK_KEY } from "./migrate-mode";

function makeClient() {
  const queries: string[] = [];
  const client = {
    query: vi.fn(async (text: string) => {
      queries.push(text);
      return { rows: [] };
    }),
  } as unknown as PoolClient;
  return { queries, client };
}

describe("migrateWithSessionLock", () => {
  it("uses the client holding the advisory lock for migration", async () => {
    const { client, queries } = makeClient();
    const migrate = vi.fn(async () => {
      queries.push("migration statement");
    });

    await migrateWithSessionLock(client, migrate, MIGRATION_LOCK_KEY);

    expect(queries[0]).toContain("pg_advisory_lock");
    expect(queries[1]).toBe("migration statement");
    expect(queries[2]).toContain("pg_advisory_unlock");
    expect(migrate).toHaveBeenCalledTimes(1);
  });

  it("always unlocks after a migration failure", async () => {
    const { client, queries } = makeClient();
    const migrate = vi.fn(async () => {
      throw new Error("failed migration");
    });

    await expect(
      migrateWithSessionLock(client, migrate, MIGRATION_LOCK_KEY),
    ).rejects.toThrow("failed migration");

    expect(queries.at(-1)).toContain("pg_advisory_unlock");
  });
});
