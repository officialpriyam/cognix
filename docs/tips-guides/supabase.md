# Switching from Neon to Supabase

This guide migrates a Vercel deployment of Cognix from Neon to Supabase.
The app supports Supabase out of the box — no code changes needed, only
environment variables.

---

## Step 1 — Get your Supabase connection strings

In the Supabase dashboard: **Project Settings → Database → Connection string**.

You need two different URLs (this trips everyone up — Supabase has three):

| Supabase option | Port | Use for | Why |
|---|---|---|---|
| **Transaction pooler** | `6543` | The app at runtime (`DATABASE_URL`) | Serverless-friendly, survives Vercel's churn |
| **Session pooler / Direct** | `5432` | Migrations (`DB_MIGRATION_URL`) | Migrations use advisory locks, which don't survive transaction pooling |
| Direct connection (db.*.supabase.co) | `5432` | Only if NOT using the pooler at all | Fine too, just fewer pooled connections |

Both URLs look like:

```
postgres://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
postgres://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
```

> Note: the pooler hostname is `aws-0-<region>.pooler.supabase.com`, **not**
> `db.<ref>.supabase.co`. Copy both from the dashboard to be safe.

---

## Step 2 — Update Vercel environment variables

### Delete all of these (Neon leftovers)

| Variable | Reason |
|---|---|
| `DATABASE_URL` (the Neon one) | Dead URL — and our resolver reads `DATABASE_URL` **first**, so a stale value would silently shadow Supabase |
| `POSTGRES_PASSWORD` | Neon split var, unused |
| `POSTGRES_DATABASE` | Neon split var, unused |
| `POSTGRES_HOST` | Neon split var, unused |
| `PGUSER` | libpq fallback, unused |
| `PGPASSWORD` | libpq fallback, unused |
| `PGDATABASE` | libpq fallback, unused |
| `PGHOST_UNPOOLED` | Neon-specific, unused |
| `POSTGRES_URL_NO_SSL` | Unused — and never run without SSL in prod |
| `NEON_PROJECT_ID` | Neon metadata |

Fastest cleanup: **Vercel → Settings → Integrations → remove the Neon
integration** — it removes its variables automatically. The "Needs Attention"
flags on those variables are just failed Neon syncs; irrelevant after removal.

### Keep these

| Variable | Reason |
|---|---|
| `BETTER_AUTH_SECRET` | Auth signing secret |
| `OPENROUTER_API_KEY` | Model provider |

### Add these

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase **transaction pooler** URL, port `6543` |
| `DB_MIGRATION_URL` | Supabase **session/direct** URL, port `5432` |
| `DB_AUTO_MIGRATE` | `true` (default — smart migrations; see below) |

Set them for **all environments** (Production / Preview / Development).

---

## Step 3 — Bring your data across (optional but likely)

Supabase won't have your old Neon data. Two options:

**Fresh start** (new project, no data to keep):
1. Point the app at Supabase and start it — migrations run automatically.
2. Sign up again; the first user becomes admin.

**Migrate existing data** (keep chats/users):
1. Dump from Neon:
   ```bash
   pg_dump --no-owner --no-privileges --exclude-schema=drizzle \
     "$NEON_URL" > backup.sql
   ```
2. Restore into Supabase:
   ```bash
   psql "$SUPABASE_SESSION_POOLER_URL" -f backup.sql
   ```
   (Use the port-5432 URL for the restore; the dump skips Neon's
   `drizzle.__drizzle_migrations` bookkeeping table.)
3. Start the app — it detects no migration history and applies all
   migrations idempotently... **but only if the schema is absent**. If you
   restored the full schema, also restore the bookkeeping table instead:
   ```bash
   pg_dump --no-owner --no-privileges \
     --table=drizzle.__drizzle_migrations "$NEON_URL" > bookkeeping.sql
   psql "$SUPABASE_SESSION_POOLER_URL" -f bookkeeping.sql
   ```
   Then the app sees the schema as current and skips migrations.

---

## Step 4 — Verify

```bash
pnpm db:status   # shows mode, applied/total migrations, pending state
pnpm db:migrate  # force a migration run if you want one
```

Then deploy / restart on Vercel. On boot you should see:

```
✅ Database schema is up to date (15/15 migrations) — checked in 12ms
```

or, on a fresh database:

```
⏳ 15 pending PostgreSQL migration(s) detected...
✅ PostgreSQL migrations completed in 830 ms
```

---

## Troubleshooting

**`advisory lock` errors or migrations hanging** — you pointed
`DB_MIGRATION_URL` (or `DATABASE_URL` when it doubles as the migration URL)
at the transaction pooler (6543). Use the port-5432 session/direct URL for
`DB_MIGRATION_URL`.

**`prepared statement "..." already exists` / `does not exist`** — same
cause: transaction pooling breaks named prepared statements. The runtime
pool already disables them; make sure you didn't force a 6543 URL into
`DB_MIGRATION_URL`.

**`self signed certificate` / SSL errors** — the app auto-adds
`sslmode=require` for remote hosts. If your local network strips TLS,
add `?sslmode=require` explicitly or route through the pooler URLs
provided by Supabase, which handle TLS correctly.

**App connects but tables missing** — `DB_AUTO_MIGRATE=false` is set, or
migrations failed at startup. Run `pnpm db:status`, then `pnpm db:migrate`.

---

## Local development with Supabase

`.env`:

```
DATABASE_URL=postgres://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
DB_MIGRATION_URL=postgres://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
DB_AUTO_MIGRATE=true
```

Or keep local Postgres for dev (`pnpm docker:pg`) and only point Vercel at
Supabase — `POSTGRES_URL=postgres://...@localhost:5432/...` still works and
is much faster for iterating on schema changes.
