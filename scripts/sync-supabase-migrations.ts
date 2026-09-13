import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * Syncs Drizzle Postgres migrations into the Supabase CLI folder so that
 * `supabase db push` / `supabase migration up` can apply them.
 *
 * Supabase expects `<timestamp>_<tag>.sql` files ordered lexicographically.
 * Each journal entry's `tag` already matches its on-disk SQL filename
 * (e.g. "0000_past_nebula"), and its `when` timestamp becomes the
 * Supabase-style `<timestamp>_<tag>.sql` name.
 */
const root = process.cwd();
const pgDir = join(root, "src/lib/db/migrations/pg");
const journalPath = join(pgDir, "meta/_journal.json");
const outDir = join(root, "supabase/migrations");

interface JournalEntry {
  idx: number;
  tag: string;
  when: number;
}

const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
  entries: JournalEntry[];
};

mkdirSync(outDir, { recursive: true });

let synced = 0;
for (const entry of journal.entries) {
  const src = join(pgDir, `${entry.tag}.sql`);
  if (!existsSync(src)) {
    console.warn(`[sync-supabase-migrations] missing source: ${src}`);
    continue;
  }
  const ts = new Date(entry.when)
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);
  const dest = join(outDir, `${ts}_${entry.tag}.sql`);
  if (existsSync(dest)) {
    console.log(`[sync-supabase-migrations] exists: ${dest}`);
    continue;
  }
  writeFileSync(dest, readFileSync(src, "utf8"));
  synced += 1;
  console.log(`[sync-supabase-migrations] wrote: ${dest}`);
}

console.log(
  `[sync-supabase-migrations] synced ${synced}/${journal.entries.length} migration(s)`,
);
