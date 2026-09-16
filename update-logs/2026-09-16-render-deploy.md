# Update Log — Render deploy excluding apps/desktop

## Added: `render.yaml` (Render Blueprint, web service only)
- `buildCommand: NODE_ENV=development pnpm install --filter web... && pnpm --filter web build`
- `startCommand: pnpm --filter web start`
- `NODE_VERSION` deliberately **omitted** so Render always uses its current default
  (repo requires >=20 via `engines`; pinning a number would freeze it in time).
- Secrets (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  filled in the Render dashboard (never committed).
- No `healthCheckPath` on purpose: Render falls back to a TCP check on `$PORT`
  (`next start` binds `$PORT` automatically). No public 200-for-anonymous route exists
  to check against.

## Why this excludes desktop (verified, not assumed)
- Render has no ignore-file mechanism for native Node environments, so exclusion is done
  via pnpm workspace filters instead of file deletion.
- `pnpm --filter web... list` proves the deploy graph: only `web` + the 4 workspace
  packages it needs (`auth-contracts`, `mcp-core`, `mcp-router`, `mcp-types`) — zero
  `desktop` references (nothing in the repo depends on `apps/desktop`).
- `pnpm --filter web build` runs only `apps/web`'s own `next build`; workspace deps resolve
  to source (`main: ./src/index.ts`) and are transpiled via `transpilePackages`, so no
  prebuild step is skipped by bypassing turbo. `next`, `typescript`, `tailwindcss`, `eslint`
  are all direct deps of `apps/web`, so the build is self-contained.
- `NODE_ENV=development` is scoped to the install step only: pnpm would otherwise skip
  devDependencies (Render sets production env) and `next build` needs them. The build
  step itself runs under Render's normal env.
- App auto-migrates Postgres on boot (unless `SKIP_DB_MIGRATE=1`), so no separate
  migrate step is needed in the blueprint. No dedicated health route exists, hence TCP check.

## Still needs YOU (Render dashboard)
1. Fill the 4 `sync: false` secrets — `BETTER_AUTH_URL` and `NEXT_PUBLIC_BASE_URL` must be
   the public Render URL (e.g. `https://cognix-web.onrender.com`), or auth/OAuth breaks.
2. Pick a plan (omitted from the blueprint on purpose — `free` sleeps, `starter` bills).
3. Optional feature keys (`EXA_API_KEY`, provider keys, `REDIS_URL`, S3_*, etc.) as needed.

## 2026-09-16 — first-deploy log triage (`text/sources` JSON crash)
- `MCP Config Storage: No userId ... loading empty config` → benign by design (logged-out/anon context).
- “Optional integrations not configured” (Inngest/Superlog keys) → benign; features stay local/off.
- `localStorage` / negative-timeout warnings → benign Node/undici noise.
- `Unexpected end of JSON input` in `app/api/projects/[id]/sources/text`: stack shows it fires
  while that route's module graph evaluates on first load. Traced the full 71-file import closure
  (`@/lib/ai/rag/ingest`, `gate`, `project-brain/enqueue`, agentset, models, auth, db, …):
  no unguarded top-level `JSON.parse` in app code, the only env-JSON reader
  (`openaiCompatibleModelsSafeParse`) is try/catch-guarded, and the route imports cleanly both
  locally and under `NODE_ENV=production`. So the trigger is Render-environment-specific.
  Most likely: (a) the Render service is running an **older commit** than this tree, or
  (b) a JSON env var is **set-but-empty** on Render (check `OPENAI_COMPATIBLE_DATA` and any
  custom JSON vars — empty string parses to exactly this error).
- Hardened `POST .../sources/text` to return **400** on empty/unparseable bodies instead of 500
  (covers the truncated-stack variant where the throw is request-time).
- “No open HTTP ports … continuing to scan”: normal during boot; confirm the service reaches
  **Live**. If the deploy timed out instead, that — not the lines above — is the killer.

## 2026-09-16 — root-caused + fixed the `Unexpected end of JSON input` deploy errors
- **Root cause (reproduced locally):** `openaiCompatibleModelsSafeParse`
  (`apps/web/src/lib/ai/create-openai-compatiable.ts`) does `JSON.parse(providers)` whenever
  the input `isString(...)`. On Render, `OPENAI_COMPATIBLE_DATA` is **set-but-empty**, so every
  route importing the model registry (`chat`, `models`, `embeddings`, `inngest`, `export`,
  `agent`, `temporary`, `tools`, `user/*`, `openai-realtime`, `voice/*`, `workflow`, `export`
  page, `chat` page — all via shared chunk `3437`) logged this error at module-evaluation time.
  Locally the var is unset → default `[]` → no parse → silent, which is why it never reproduced
  until all 37 closure env vars were emptied in a probe.
- **Fix:** treat empty/blank input as “not configured” and return `[]` before parsing
  (plus the earlier `request.json()` → 400 hardening on the text-sources route).
- Verified: emptied-env probe no longer logs the error; `tsc --noEmit` clean; transpile clean.
- **Still do on Render:** delete the empty `OPENAI_COMPATIBLE_DATA` var (or set it to `[]`) —
  belt-and-braces alongside the code fix. The `e2b` “critical dependency” warning is benign
  (upstream dynamic require; build succeeds).
