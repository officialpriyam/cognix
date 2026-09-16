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
