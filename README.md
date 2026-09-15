# Cognix

A self-hostable, open-source AI chatbot platform — Next.js 16 + React 19 + the Vercel AI SDK
— with agents, MCP tool management, workflows, image generation, multi-provider chat, i18n,
and a first-party **Cognix Desktop** companion app that signs in via Cognix and syncs chats to
the cloud.

- Repo: https://github.com/officialpriyam/cognix
- Deploy: https://vercel.com/new/clone?repository-url=https://github.com/officialpriyam/cognix
- License: MIT

---

## Features

- **Multi-provider chat** — OpenAI, Anthropic, Google, Groq, xAI, OpenRouter, Ollama, NVIDIA,
  and any OpenAI‑compatible endpoint. Tool calling, streaming, reasoning, and image output.
- **Agents** — reusable system prompts, model + tool bindings, and shareable agent definitions.
- **Tools** — built‑in web search & content (Exa), HTTP fetch, JavaScript & Python execution, and
  chart/table generation; extensible via **MCP** servers.
- **Tools Management** — a DB‑backed MCP registry with per‑server connection status, cached tool
  info for **lazy connections**, and per‑user enable/disable + custom instructions.
- **Workflows** — a visual node editor (LLM, HTTP, condition, and data nodes) for multi‑step pipelines.
- **Auth & accounts** — powered by **better‑auth** (email/password, OAuth social providers,
  sessions), plus an **admin** area and role‑based access control.
- **Internationalized** UI and **theming**.
- **Cognix Desktop** — an Electron app that logs in through this server (OAuth) and backs up
  sessions + memory to the cloud.

## Tech stack

| Concern        | Tech |
| -------------- | ---- |
| Framework      | Next.js 16 (App Router), React 19 |
| AI             | Vercel AI SDK 5, Model Context Protocol (MCP) |
| Auth           | better‑auth |
| Database       | PostgreSQL (Neon or **Supabase**) via Drizzle ORM |
| Cache / realtime | Redis (optional) |
| File storage   | Vercel Blob or S3‑compatible (optional) |
| Styling / UI   | Tailwind CSS 4, shadcn/ui, Radix, Framer Motion |
| Language       | TypeScript (strict) |

## Database

PostgreSQL only. The app talks to it through a connection string (`POSTGRES_URL`) via
`drizzle-orm/node-postgres`; migrations are Drizzle SQL in `src/lib/db/migrations/pg`.

**Supabase works** (it is Postgres) — use the **session pooler / direct connection (port 5432)**
for the app, and a non‑pooler URL for `DB_MIGRATION_URL`. The **transaction pooler (6543)**
breaks node‑postgres prepared statements. Supabase URLs need `?sslmode=require`.

## Getting started

```bash
git clone https://github.com/officialpriyam/cognix
cd cognix
pnpm install
cp .env.example .env        # fill in at least BETTER_AUTH_SECRET + one LLM key
pnpm db:migrate             # apply schema/migrations to your Postgres/Supabase DB
pnpm dev
```

### Key environment variables

| Var | Required | Notes |
| --- | --- | --- |
| `BETTER_AUTH_URL` / `NEXT_PUBLIC_BASE_URL` | yes | Public base URL (used as OAuth issuer). |
| `BETTER_AUTH_SECRET` | yes | Auth signing secret. |
| `POSTGRES_URL` | yes | App DB connection (session pooler / port 5432 for Supabase). |
| `DB_MIGRATION_URL` | yes | Direct (non‑pooler) URL for `pnpm db:migrate`. |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` / … | one+ | LLM providers. |
| `EXA_API_KEY` | for web search | Enables the web‑search & web‑content tools. |
| `REDIS_URL` | optional | Cache / realtime. |
| `FILE_BASED_MCP_CONFIG` | optional | `true` = file‑backed MCP config; default `false` = DB‑backed. |
| `COGNIX_DESKTOP_*` | optional | Overrides for the desktop OAuth client (see below). |

---

## Cognix Desktop — authentication & cloud sync

Cognix Desktop is a first‑party **OAuth2 client**. Login uses **Authorization Code + PKCE**
(no client secret). The web app is the **authorization server**.

### Endpoints exposed by this app

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `GET`  | `/oauth/authorize` | Consent screen. Requires a logged‑in web session (redirects to `/sign-in` otherwise). On approve → `302` to `redirect_uri` with `code` + `state`. |
| `POST` | `/oauth/token` | Exchanges `code` + `code_verifier` for an `access_token` (a better‑auth **session token**) + signed `id_token`. |
| `POST` | `/oauth/revoke` | Revokes the desktop's session. |
| `POST` | `…/oauth/authorize/deny` | Cancel → `302` back with `error=access_denied`. |

The returned `access_token` is a real session token, so the desktop authenticates every
`/api/*` route with `Authorization: Bearer <token>` (the better‑auth **bearer** plugin).

### Authorize request (what the desktop builds)

```
GET https://<your-host>/oauth/authorize
  ?response_type=code
  &client_id=cognix-desktop
  &redirect_uri=cognix://oauth/callback
  &scope=openid profile email
  &state=<random>
  &code_challenge=<S256(code_verifier)>
  &code_challenge_method=S256
```

Callback: `cognix://oauth/callback?code=…&state=…` → desktop `POST`s
`grant_type=authorization_code&code&code_verifier&client_id&redirect_uri` to `/oauth/token`.

### Cloud chat backup + memory APIs (bearer‑authenticated)

| Method | Path | Purpose |
| ------ | ---- | ------- |
| `POST`/`GET` | `/api/cognix/sessions` | Upsert / list a user's Cognix Desktop sessions (full transcript). Triggers auto‑summary. |
| `GET`/`DELETE` | `/api/cognix/sessions/[id]` | Fetch or delete one session with its messages. |
| `POST`/`GET` | `/api/cognix/memory` | Store / read per‑session **memory** (`summary` \| `note` \| `fact`). |

Backing tables: `cognix_session`, `cognix_session_message`, `cognix_chat_memory` (created by the
Drizzle migrations). Chats are stored **locally on the desktop and in the cloud** here.

Configurable via env: `COGNIX_DESKTOP_CLIENT_ID`, `COGNIX_DESKTOP_REDIRECT_URI`,
`COGNIX_DESKTOP_SCOPES`.

## Development

```bash
pnpm lint           # Biome
pnpm check-types    # tsc --noEmit
pnpm test           # Vitest
pnpm test:e2e       # Playwright
pnpm db:generate    # create a migration from schema changes
pnpm db:push        # push schema (dev)
pnpm db:migrate     # apply migrations
```

## Contributing

See `CONTRIBUTING.md` and `AGENTS.md`. Log notable changes in `update-logs/`.

## License

MIT © Priyam
