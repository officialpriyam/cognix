# Supabase Setup Guide

This app uses Supabase for two things: **Postgres** (all application data) and **Storage** (avatars, chat attachments, and AI-generated media). This guide covers how storage is configured, which environment variables are required, and — the part that has bitten us before — the **public vs. private** expectations per bucket.

---

## 1. Environment Variables

All Supabase vars live in the root `.env` (the web app reads it via the `apps/web/.env` symlink).

| Variable | Required | Purpose |
|---|---|---|
| `POSTGRES_URL` | ✅ | Direct Postgres connection string used by the app (postgres.js). This is the app's *only* database access path — the app never reads data through the Supabase REST API. |
| `SUPABASE_URL` | ✅ (uploads) | Project URL, e.g. `https://<project-ref>.supabase.co`. Used by the server-side storage client. |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ (uploads) | Service-role secret. Bypasses RLS and has bucket-create permission. **Server-only — never expose to the client.** |
| `NEXT_PUBLIC_SUPABASE_URL` | optional | Only needed if browser code ever talks to Supabase directly (currently it does not). |
| `SUPABASE_AI_GENERATED_BUCKET` | optional | Bucket name for generated images/videos. **Default: `ai-generated`.** |
| `SUPABASE_AVATAR_BUCKET` | optional | Bucket for user avatars. **Default: `avatars`.** |
| `SUPABASE_ATTACHMENT_BUCKET` | optional | Bucket for chat file attachments. **Default: `attachments`.** |

> **Why the service-role key?** All storage operations happen server-side through `src/lib/file-storage`. The service role is what allows the storage layer to **auto-create a missing bucket** on first upload (see §3).

---

## 2. Buckets

Three buckets, by purpose:

| Bucket (default name) | Visibility | Contents | URL style returned to the app |
|---|---|---|---|
| `ai-generated` | **Public** | Generated images (Imagine page, chat image tool) and generated videos | Permanent public URL — safe to store in Imagine history |
| `avatars` | **Public** | User profile pictures | Permanent public URL |
| `attachments` | **Private** | User-uploaded chat files (may contain sensitive content) | Short-lived **signed** URL |

### Why `ai-generated` must be public

1. **History permanence.** Imagine history stores plain URLs. Signed URLs expire; public URLs don't. A private bucket makes every history entry go dark after the signature expires.
2. **Video first-frames.** DashScope's video API must be able to `GET` the first-frame image you attach. A private bucket URL (signed or not) can fail their fetch depending on expiry/token handling.
3. **Direct display.** Images/videos render in `<img>`/`<video>` tags in the browser; permanent public URLs keep that simple and cacheable.

---

## 3. Behavior you can rely on (self-healing storage)

The storage layer (`apps/web/src/lib/file-storage/supabase-storage.ts`) is defensive by design:

- **Auto-create.** If an upload targets a bucket that doesn't exist, the layer creates it automatically (public for `ai-generated`/`avatars`, private for `attachments`) and retries the upload once. You never need to create buckets by hand on a fresh project.
- **Visibility-aware URLs.** The layer queries the bucket's *actual* visibility instead of guessing from its name: public bucket → permanent public URL; private bucket → signed URL. A hand-created private bucket therefore still renders (via expiring signed URLs) instead of silently 404ing.
- **Actionable errors.** If an upload still fails (e.g. the key lacks create permission), the error names the bucket: `Supabase upload failed (bucket "ai-generated"): …`.
- **Per-process cache.** Bucket existence and visibility are cached per process, so the happy path adds no extra API calls.

> **Historical note:** an earlier version hard-coded the fallback bucket name `"Gemini Images"` while `.env.example` documented `ai-generated`, and returned public URLs unconditionally. That combination produced the infamous `NoSuchBucket` / "upload works but nothing displays" symptoms. Both are fixed; if you created a bucket manually under another name, either set the matching `SUPABASE_*_BUCKET` var or rename the bucket to the default.

---

## 4. Dashboard checklist (fresh project)

If you prefer to create things manually instead of relying on auto-create:

1. **Storage → New bucket** → `ai-generated` → toggle **Public bucket** ON.
2. **Storage → New bucket** → `avatars` → **Public** ON.
3. **Storage → New bucket** → `attachments` → **Public** OFF (keep private).
4. Set `POSTGRES_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` in `.env`.
5. Restart the dev server (storage clients are cached per process).

**Verifying a bucket is public:** Storage → bucket → ⚙ settings → "Public bucket" toggle. You can also probe: upload any object and open its `/storage/v1/object/public/<bucket>/…` URL — it should return the file, not a 404.

---

## 5. Row Level Security (RLS)

**RLS is enabled on every table in `public`** (migration `0052_enable_rls.sql`). Posture:

- The app connects as the `postgres` role over a direct TCP connection; a permissive `app_full_access` policy keeps that working.
- `service_role` bypasses RLS by default (needed for storage).
- `anon` / `authenticated` roles (the REST/PostgREST path) have **no policies** — every REST read/write is denied. This is intentional: the app has no browser-side Supabase client.

**Caveat:** tables created by *future* migrations do **not** get RLS automatically. Either include `ALTER TABLE … ENABLE ROW LEVEL SECURITY` in each new migration, or re-run the `DO` block from `0052`.

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `NoSuchBucket` / "Bucket not found" on upload | Bucket missing **or** the server process predates the bucket's creation with a stale cached client | Restart the dev server; the storage layer will auto-create the bucket on next upload |
| Upload succeeds, image/video doesn't display | Bucket is **private** but a public URL was stored (legacy entries), or you're inspecting in the dashboard which shows `/object/sign/…` URLs | Make the bucket public (recommended for `ai-generated`); old stored public URLs start working immediately, no data migration needed |
| `Supabase upload failed (bucket "…")` naming a bucket | Service key lacks create permission, or a same-named bucket exists with restrictive policies | Create/fix the bucket in the dashboard as §4 describes |
| New table appears readable via REST despite RLS work | Migration forgot to enable RLS on the new table | Add `ENABLE ROW LEVEL SECURITY` to that migration |

---

## 7. Quick reference

```bash
# .env
POSTGRES_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # server-only secret
SUPABASE_AI_GENERATED_BUCKET=ai-generated # optional, this is the default
SUPABASE_AVATAR_BUCKET=avatars            # optional
SUPABASE_ATTACHMENT_BUCKET=attachments    # optional
```
