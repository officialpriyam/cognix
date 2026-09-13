import type { PoolClient } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";

/**
 * Runs `migrate` on the exact client holding the session advisory lock.
 *
 * Drizzle's node-postgres migrator executes through the client attached to
 * its database instance. If the pool has max=1 and that one client has
 * already been checked out for the lock, Drizzle waits forever for a second
 * client and eventually times out. Constructing Drizzle around `client`
 * guarantees every migration statement shares the locked session.
 */
export async function migrateWithSessionLock(
  client: PoolClient,
  migrate: (db: NodePgDatabase) => Promise<void>,
  lockKey: number,
): Promise<void> {
  await client.query("select pg_advisory_lock($1)", [lockKey]);
  try {
    await migrate(drizzle(client));
  } finally {
    await client.query("select pg_advisory_unlock($1)", [lockKey]);
  }
}
