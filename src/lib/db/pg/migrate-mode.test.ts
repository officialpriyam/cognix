import { describe, it, expect } from "vitest";
import {
  parseMigrationMode,
  computePendingMigrations,
  MIGRATION_MODE_ENV,
} from "./migrate-mode";

describe("parseMigrationMode", () => {
  it("defaults to smart when unset or blank", () => {
    expect(parseMigrationMode(undefined)).toBe("smart");
    expect(parseMigrationMode("")).toBe("smart");
    expect(parseMigrationMode("   ")).toBe("smart");
  });

  it("maps truthy values to smart", () => {
    expect(parseMigrationMode("true")).toBe("smart");
    expect(parseMigrationMode("TRUE")).toBe("smart");
    expect(parseMigrationMode("1")).toBe("smart");
    expect(parseMigrationMode("on")).toBe("smart");
    expect(parseMigrationMode("yes")).toBe("smart");
  });

  it("maps falsey values to never", () => {
    expect(parseMigrationMode("false")).toBe("never");
    expect(parseMigrationMode("0")).toBe("never");
    expect(parseMigrationMode("off")).toBe("never");
    expect(parseMigrationMode("no")).toBe("never");
  });

  it("maps force/always to always", () => {
    expect(parseMigrationMode("force")).toBe("always");
    expect(parseMigrationMode("FORCE")).toBe("always");
    expect(parseMigrationMode("always")).toBe("always");
  });

  it("maps check/dry-run to check", () => {
    expect(parseMigrationMode("check")).toBe("check");
    expect(parseMigrationMode("Check")).toBe("check");
    expect(parseMigrationMode("dry-run")).toBe("check");
  });

  it("throws on invalid values with a helpful message", () => {
    expect(() => parseMigrationMode("bogus")).toThrow(
      new RegExp(`Invalid ${MIGRATION_MODE_ENV}`),
    );
    expect(() => parseMigrationMode("bogus")).toThrow(/true, false, force, check/);
  });
});

describe("computePendingMigrations", () => {
  const migrations = [
    { hash: "aaa", folderMillis: 1000 },
    { hash: "bbb", folderMillis: 2000 },
    { hash: "ccc", folderMillis: 3000 },
  ];

  it("returns all migrations when nothing has been applied", () => {
    expect(computePendingMigrations(migrations, null)).toEqual(migrations);
  });

  it("returns only migrations newer than the last applied timestamp", () => {
    expect(computePendingMigrations(migrations, 2000)).toEqual([
      { hash: "ccc", folderMillis: 3000 },
    ]);
  });

  it("returns nothing when the last applied migration is the newest", () => {
    expect(computePendingMigrations(migrations, 3000)).toEqual([]);
    expect(computePendingMigrations(migrations, 9999)).toEqual([]);
  });

  it("matches drizzle's rule for out-of-order timestamps (strictly greater)", () => {
    // Drizzle applies folderMillis > last created_at; equal timestamps are skipped.
    expect(computePendingMigrations([{ hash: "x", folderMillis: 2000 }], 2000)).toEqual(
      [],
    );
  });
});
