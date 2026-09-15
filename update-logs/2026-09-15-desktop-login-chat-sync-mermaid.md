# Cognix — Update Log

Ongoing record of changes made by the coding assistant to this web app (`D:\cognix`) and the
Cognix Desktop app (`D:\d\cognix-code\desktop`). Newest first. Each entry lists what changed,
why, verification status, and any action required by you (env keys, migrations, restarts).

---

## 2026-09-15 — Desktop login (OAuth + PKCE), cloud chat + memory sync, Mermaid fix

### Cognix Desktop login (web = authorization server)
- New OAuth2 **authorization-code + PKCE** flow so a logged-in web user can authorize the
  Cognix Desktop app (browser → `/oauth/authorize` consent → `cognix://oauth/callback` → token).
- Files (web):
  - `src/lib/auth/desktop-oauth.ts` — client allow-list, single-use codes in the existing
    `verification` table (10-min TTL), S256 PKCE verify, mints a real `session` token returned
    as `access_token` + a signed `id_token`.
  - `src/app/oauth/authorize/route.ts` (+ `authorize/deny/route.ts`), `token/route.ts`, `revoke/route.ts`.
  - `src/lib/auth/auth-instance.ts` — enabled better-auth **`bearer`** plugin (so the desktop's
    `Authorization: Bearer <token>` authenticates cognix APIs as the user).
- Files (desktop): `src/main/cognix-auth.ts` (+ IPC + `window.api.cognixAuth`).
- **No DB migration** for login (reuses `verification` + `session`).
- Action: redeploy so the bearer plugin loads; env optional `COGNIX_DESKTOP_CLIENT_ID`,
  `COGNIX_DESKTOP_REDIRECT_URI` (default `cognix://oauth/callback`).

### Desktop chats saved to web (cloud backup) + local, with memory
- New tables + repo + API (web):
  - `cognix_session`, `cognix_session_message` (full transcript, raw JSON `parts`),
    `cognix_chat_memory` (kind: summary|note|fact) in `src/lib/db/pg/schema.pg.ts`.
  - `src/lib/db/pg/repositories/cognix-sync-repository.pg.ts`.
  - `src/app/api/cognix/sessions/route.ts` (+ `sessions/[id]/route.ts`, `memory/route.ts`), bearer-guarded.
- Desktop push bridge: `src/main/cognix-sync.ts` (+ IPC + `window.api.cognixSync.push/pull...`).
- Auto-push on session idle: `desktop/lib-module/app/context/server-session.ts` (`syncDesktopSession`
  on the `session.execution.*` → idle transition; feature-detected, guarded, non-breaking).
- Auto-summarization: on push, web generates a session summary via `generateText` (default model
  fallback) and stores it in `cognix_chat_memory` once per session.
- Web→desktop **pull**: `window.api.cognixSync.pullSessions()/pullSession(id)/pullMemory()` fetch
  cloud sessions/memories. NOTE: importing a pulled session into the *local* Cognix session store
  is a separate step (needs the cognix backend create-session API) — see "Open items".
- **Migration required:** `src/lib/db/migrations/pg/0015_lush_king_bedlam.sql` (adds the 3 tables).
  Run `pnpm db:migrate` (prod) or `pnpm db:push` (dev).

### Mermaid rendering fix
- `src/components/mermaid-diagram.tsx`: on a parse/render error, retry with `repairMermaid()`
  which auto-quotes node labels containing raw/smart double quotes (escapes inner quotes as
  `#quot;`). Valid charts are untouched; error only shown if the repaired chart also fails.

### Tools not working — diagnosis
- Web search / web content tools fail because **`EXA_API_KEY` is empty in `.env`** → the tool throws
  `EXA_API_KEY is not configured`. Fix = set a valid Exa key and redeploy (not a code bug).
- **Build fix:** the untracked `example-up-update/` folder contained broken types that failed
  `tsc`/`next build` (~25 errors incl. a `src` type clash). Added it to `tsconfig` `exclude`
  (it is never imported by `src`). `tsc --noEmit` is now **0 errors** project-wide.

### Verification
- Web: `tsc --noEmit` = 0 errors in touched code; biome clean on new files; migration reviewed
  (3 CREATE TABLE + FKs + indexes, no drops).
- Desktop: all changed files parse (bun build); **not built/run** here (deps not installed).

### Open items / follow-ups
1. Set `EXA_API_KEY` to restore web search/content tools (only remaining tools issue = config).
2. Item 3 pull → local restore requires the cognix backend session-create API (backend-from-source
   still needs a real build test).
4. Auto-summary currently only writes the first summary per session; add refresh-on-final if wanted.
```
