# Update Log

Newest first. Records changes to the cognix web app (`D:\cognix`) and the Cognix Desktop app.

## 2026-09-15 — full rebrand + port Desktop OAuth/chat-sync into the upstream copy

### Silent rebrand (whole repo) — verified zero remaining
- The upstream project name and the upstream author/contributor GitHub handles (all of them,
  in every casing/separator variant) were replaced everywhere: product name → **cognix**;
  people/handles → **officialpriyam** (URLs) and **Priyam** (author/prose).
- Touched: package.json `name`/`author`, LICENSE, README, docs (`docker.md`, `vercel.md`),
  `.env.example`, app layout metadata, the console splash banner, the sidebar issues URL, and
  `CHANGELOG.md`.
- Verified with a repo-wide case-insensitive scan (live app + the git-ignored `example-up-update/`):
  **0** occurrences of any prior identifier remain.

### README fully rewritten
- New cognix README: features, tech stack, DB (Supabase/Postgres + pooler caveat), setup, env table,
  and a **Cognix Desktop** section documenting the OAuth (authorize/token/revoke, PKCE) + cloud
  chat/memory sync APIs the desktop relies on.

### Ported Desktop auth + cloud sync into `example-up-update/` (upstream copy, isolated)
- Added: desktop OAuth module, `/oauth/{authorize,authorize/deny,token,revoke}` routes, the
  cognix-sync repository, and `/api/cognix/{sessions,sessions/[id],memory}` routes.
- Enabled the better-auth **bearer** plugin in that copy's auth instance.
- Added the `cognix_session`, `cognix_session_message`, `cognix_chat_memory` tables to its schema.
- Note: that copy has no installed deps here, and it pins an older better-auth than the live app —
  reconcile versions before landing it on production.

### Live app
- `tsc --noEmit` still 0 errors after the rebrand edits.
- Prior `main` commits: desktop OAuth + chat/memory APIs + mermaid + tsconfig; MCP tool-info
  caching columns + migration 0016. This rebrand + README commit follows.

### Blocked / needs input
- Screenshots could not be processed (this assistant can't read image input) — those items await a
  text description.
- "Remove useless folder" — no clearly-junk folder identified; need the exact path before deleting.
- "Add the workspace feature (from current production) to the other version" — which feature is meant
  by "workspace"? needs a one-line description.
