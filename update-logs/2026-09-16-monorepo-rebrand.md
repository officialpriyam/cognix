# Update Log — 2026-09-16 — full monorepo rebrand to Cognix

## What was renamed (working tree only, NOT committed)
- Prior product name (all casings/separators) → `cognix`
- Prior product full name (all casings/separators) → `Cognix`
- Prior owner handle → `officialpriyam`
- Prior domains → `cognix.iampriyam.me` hosts (docs host mapped under `/docs`)
- Prior npm scope (7 packages: audit, auth-contracts, channel-contracts,
  mcp-core, mcp-router, mcp-types, mcp-stdio-filesystem + all imports, tsconfig paths, next.config)
  → the `cognix` scope
- Prior `SCREAMING_SNAKE` env prefix → the `COGNIX_` prefix
- Desktop appId → `com.officialpriyam.cognix`
- Prior contributor handles in CHANGELOG → `by @officialpriyam` (duplicate runs collapsed);
  `LICENSE` holder → officialpriyam (MIT text kept)
- Files renamed: prior codesigning cert → `cognix-codesigning.crt`,
  `scripts/upgrade/from-<old>-1.ts` → `scripts/upgrade/from-cognix-1.ts` (all refs updated)
- DB names: prior product DB names → `cognix[_test]` (templates/CI only)
- Lockfile workspace links updated (registry hashes untouched)

## Verified
- Zero prior-brand tokens repo-wide (code, docs, configs, lockfile, filenames; binaries skipped by nature).
  Final sweep also cleared a fabricated `O=cognix OÜ` cert-subject line in `apps/desktop/certs/README.md`
  (now reads as a placeholder) and sanitized this log file itself.
- `pnpm install --frozen-lockfile`: OK
- `pnpm typecheck` (turbo, all 8 tasks + root tsc): exit 0 (re-verified after final tweaks)
- `pnpm lint`: exit 0 (1 pre-existing suppression warning, untouched file)
- All package.json files parse; workspace names resolve

## Still needs YOU (cannot be derived, would break things if guessed)
1. **Windows signing**: real cert is issued to the old org; `publisherName` is now a placeholder
   `CN=officialpriyam`, and the `.crt` file was renamed but its *content* still says the old
   subject. Provide your cert/DN or signing stays broken.
2. **`docs.<old-host>` → `cognix.iampriyam.me/docs` is a guess** — point it at your real docs URL.
3. **AI Gateway team slug** (old value → `cognix`) — confirm it matches your actual gateway team
   or those calls fail.
4. **DB data**: names changed in templates/CI; existing volumes still hold data under the old DB
   name — migrate or recreate.
5. **App icon/logo PNGs** — binaries I couldn't inspect; swap any still showing old branding.
6. **Protocol bytes** (voice vendor tag, User-Agent) renamed per your instruction — fine unless
   a remote allow-lists the old strings.
7. Nothing committed — run `git add -A` + commit when ready. Lockfile hand-edited (workspace links
   only, no hashes); `pnpm install --frozen-lockfile` passing proves it consistent.
