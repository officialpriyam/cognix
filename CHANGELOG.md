# Changelog

## 1.0.0 (2026-09-18)


### Features

* add FastCogni phi-4 LM Studio provider ([254bba4](https://github.com/officialpriyam/cognix/commit/254bba44b44fdc51a7eb4f0faa5f4b46e3cc3049))
* add nvidia model routing and animations ([6c9f258](https://github.com/officialpriyam/cognix/commit/6c9f258f7bf91dae257437cf4dc5b8566c9fc598))
* add nvidia provider and password reset ([fbac420](https://github.com/officialpriyam/cognix/commit/fbac420cb43cfde7a265bb9c20610ba45afce2db))
* add shooting stars background ([24fa057](https://github.com/officialpriyam/cognix/commit/24fa05738cc9996b757e1fabfb1c7ad8bbc98992))
* add Supabase SDK, storage driver, CLI folder, and migration sync ([951adda](https://github.com/officialpriyam/cognix/commit/951adda108fc49955ffbb8dcbc04510f29fac322))
* add workspace panels and richer motion ([3456f5d](https://github.com/officialpriyam/cognix/commit/3456f5d674c07805451f464c1c86438f7a4b1ef3))
* **auth, onboarding, ui:** terms gate, about-you step, motion, locale + projects fixes ([3afd0c2](https://github.com/officialpriyam/cognix/commit/3afd0c207f38dbec3a7c7877b6f56a86b9e14497))
* **auth:** float sign-in side animation in a rounded card ([080a1dd](https://github.com/officialpriyam/cognix/commit/080a1dd066b3dae68991125de60cd443c5eebbcd))
* **brand:** replace app icons and logo with new brand mark ([7f5814b](https://github.com/officialpriyam/cognix/commit/7f5814bb8c1b91e15a3e5b2823d99e45727491fa))
* **browser:** add Browser Automation toolkit with browse-page tool; add desktop release workflow for Windows installer ([4448a2d](https://github.com/officialpriyam/cognix/commit/4448a2d77be2b97e88dfe0e9a5d94c39c72e6b14))
* **cognix:** desktop OAuth login + cloud chat/memory sync, fix Mermaid + build ([860a2e8](https://github.com/officialpriyam/cognix/commit/860a2e878bd20ba62f84ce440365ae7e5e86da69))
* **deploy:** add Render blueprint for web, excluding desktop ([0594512](https://github.com/officialpriyam/cognix/commit/0594512fc7317e07f58ce143d43be16c6c66542e))
* **deploy:** add Vercel config for web, keep Render ([2acec8f](https://github.com/officialpriyam/cognix/commit/2acec8f21a24f00e38de2a7ff0300f4681314c41))
* **imagine:** Grok-style hero prompt bar with toolbar, presets, and voice input ([74cc64a](https://github.com/officialpriyam/cognix/commit/74cc64ac3a352d385b6f75b1865f6d9a3a94029e))
* **imagine:** Qwen image/video section with Wan models plus chat image-tool support ([bde9e21](https://github.com/officialpriyam/cognix/commit/bde9e21156523d56f6eebccd5a6582a54e8db716))
* **mcp:** add tool-info caching columns for lazy-connection architecture ([6b09873](https://github.com/officialpriyam/cognix/commit/6b09873ea66d2628acb27e61aaa7bf3682be6eb4))
* migrate OpenAI realtime API to GA and add Gemini voice chat support ([77f4d0e](https://github.com/officialpriyam/cognix/commit/77f4d0ed93cdc8fb42d791174a54f47912f2d8b7))
* migrate OpenAI realtime API to GA and add Gemini voice chat support2 ([fdc23ab](https://github.com/officialpriyam/cognix/commit/fdc23ab589ec55a50138e826bb6e5e215422333c))
* **models:** add OpenRouter free-tier provider, extend Gemini catalog, hide keyless providers ([593f945](https://github.com/officialpriyam/cognix/commit/593f9450581bb77c0840ba0afc20124dca315687))
* **models:** seed org catalog for new models, free-tier support, Vercel-safe durations ([c3a9468](https://github.com/officialpriyam/cognix/commit/c3a94686841d62b4692817d04176f2d3d5cba62c))
* **organization:** workspace manage UI, create dialog, free billing, browser-automation policy ([5c8f8b6](https://github.com/officialpriyam/cognix/commit/5c8f8b678eaf6d37ea655b40a23a9d5ecf1a3c54))
* Server now tries gemini-3.0-flash-live first, falls back to gemini-live-2.5-flash-native-audio ([9a4e29c](https://github.com/officialpriyam/cognix/commit/9a4e29cb9ffe836b1e0d75c55dfd209c41512a19))
* **tools:** add smart page-reader browse tool (Exa with direct-fetch fallback) ([a45e174](https://github.com/officialpriyam/cognix/commit/a45e174970933c8fe6ea8ad366e9cfe5aebdf96b))
* update favicon and brand logo ([0c3aa6f](https://github.com/officialpriyam/cognix/commit/0c3aa6f69fcefa0ac46e30493023f5f55dfef0c9))
* **user-menu:** group settings into submenu with profile/usage entries ([c6c6236](https://github.com/officialpriyam/cognix/commit/c6c6236f00f3532744fef28d65ae76c4082cf0b9))
* **workspace:** restore localStorage workspace sections deleted Sep 16 ([7562f35](https://github.com/officialpriyam/cognix/commit/7562f35186456ff666f52441e6f3ba13e539ac66))


### Bug Fixes

* **api:** bound DB queries with timeouts, exempt static files from auth gate ([51ffc5c](https://github.com/officialpriyam/cognix/commit/51ffc5c98b7894966ad1f32ecd4630796a4d77b6))
* **api:** return 400 on empty body for text source ingest ([3415099](https://github.com/officialpriyam/cognix/commit/34150995bc25f0e7c4874ae73d2e7663a680033b))
* **build:** exclude example-up-update from typecheck; restore cognix tables migration ([075d5d6](https://github.com/officialpriyam/cognix/commit/075d5d6a5a6cac76fdbacb7d0b7fa641f0e8a6dd))
* **build:** move AI policy schema out of route exports, update Discord invite ([4846adc](https://github.com/officialpriyam/cognix/commit/4846adc9636056734dbad35769c2903479853823))
* **chat:** fail fast without OpenRouter key, tag stream errors with model ([8552831](https://github.com/officialpriyam/cognix/commit/85528312cde64b18904a5a69649e75959060342b))
* **db:** fail closed on non-UUID ids instead of 500 via 22P02 ([090c90e](https://github.com/officialpriyam/cognix/commit/090c90e9463d4d1aa3eeffbe4899221ab79afaa9))
* **db:** run migrations on dedicated client, drizzle() crashes on reserved conns ([e0ab68e](https://github.com/officialpriyam/cognix/commit/e0ab68eabfbdc57ae22143f7de41df92fdbe9f4f))
* fixed bucket ([bb4ec48](https://github.com/officialpriyam/cognix/commit/bb4ec486ba37b1378fe6a5bc7cae4a4e195a16c3))
* harden pg pool for Supabase Supavisor (fix EMAXCONNSESSION) and best-effort startup/storage init ([3dccdc5](https://github.com/officialpriyam/cognix/commit/3dccdc5be3e3e48e088141138b40afb82fd97120))
* **imagine:** fails in saving ([105e06b](https://github.com/officialpriyam/cognix/commit/105e06b12131eaa7af53af71b4a23321956a2c6a))
* **imagine:** move ssr:false dynamic import into client loader ([8a0965f](https://github.com/officialpriyam/cognix/commit/8a0965f5898cb66dac9eddfb119370c50c07b335))
* **imagine:** prevent SSR of ImagineStudio to fix Vercel serialization error ([bb953e0](https://github.com/officialpriyam/cognix/commit/bb953e0d2563ad2a9e517e4fb7e1f5996b0ae7bc))
* **imagine:** repair Qwen image/video APIs, restore model picker, add Discord OAuth ([59dc1d9](https://github.com/officialpriyam/cognix/commit/59dc1d91b6db294a881bb46a7c17ca5cb587b77b))
* **imagine:** repair Qwen image/video APIs, restore model picker, add Discord OAuth ([84b4050](https://github.com/officialpriyam/cognix/commit/84b40500f5e6e39b5911b40b07b57d1a957c6d53))
* improve auth pages and reset flow ([389730d](https://github.com/officialpriyam/cognix/commit/389730d5aaa2e2001ded7eb116c06ed3cdbe39d7))
* migrate on locked Supabase session ([bcfd390](https://github.com/officialpriyam/cognix/commit/bcfd390b3d93d4af1c3eee279209ce0419d2df35))
* **models:** treat empty OPENAI_COMPATIBLE_DATA as unconfigured ([50a86ee](https://github.com/officialpriyam/cognix/commit/50a86ee165a2263dbc2b3a4b7b1eb102e07eca3c))
* prevent migrations from failing pnpm install ([4600f1e](https://github.com/officialpriyam/cognix/commit/4600f1e67b25f6780a1e09990cbf7862536c5df4))
* respect pinned chat model and refresh auth panel ([293401c](https://github.com/officialpriyam/cognix/commit/293401c1804826450d252cbd787a67e99f492843))

## [2.0.0](https://github.com/officialpriyam/cognix/releases/tag/v2.0.0)

cognix is now the community edition of
[Cognix](https://cognix.iampriyam.me), generated from that codebase rather
than maintained as a separate fork. Everything Navigator does is here except
team management and billing.

### Added

* Projects that group chats, documents and tools around a piece of work, with
  retrieval over uploaded documents using pgvector — no external service needed
* Knowledge bases for hosted retrieval with reranking and citations
* Skills: reusable capabilities an agent loads on demand
* Scheduled tasks that run an agent on a schedule and report back
* Sandboxed code execution, published pages, and a model router that can pick a
  model per task
* An Electron desktop app with local (stdio) MCP servers, filesystem access and
  keychain support
* Voice: realtime conversation through the gateway, plus transcription

### Changed

* **Repository layout is now a monorepo.** The app lives in `apps/web`, with
  shared packages alongside it
* **Models are served through the Vercel AI Gateway.** One `AI_GATEWAY_API_KEY`
  replaces the per-provider keys, which are no longer read. Ollama, LM Studio,
  TensorX and any OpenAI-compatible endpoint still work
* **Archives are now projects.** Existing archives are converted, and the
  threads inside them stay linked
* File uploads use Supabase Storage
* Postgres must have the `pgvector` extension

### Upgrading

Back up your database, then:

```bash
pnpm tsx scripts/upgrade/from-cognix-1.ts --dry-run
pnpm tsx scripts/upgrade/from-cognix-1.ts --yes
```

Your users, chats, agents, MCP servers and workflows carry over. The migration
is one way, which is why the backup matters.

## [1.26.0](https://github.com/officialpriyam/cognix/compare/v1.25.0...v1.26.0) (2025-11-07)


### Features

* add LaTeX/TeX math equation rendering support ([#318](https://github.com/officialpriyam/cognix/issues/318)) ([c0a8b5b](https://github.com/officialpriyam/cognix/commit/c0a8b5b9b28599716013c83cac03fa5745ffd403)) by @officialpriyam


### Bug Fixes

* hide MCP server credentials from non-owners ([#317](https://github.com/officialpriyam/cognix/issues/317)) ([#319](https://github.com/officialpriyam/cognix/issues/319)) ([6e32417](https://github.com/officialpriyam/cognix/commit/6e32417535c27f1215f96d68b7302dba4a1b904d)) by @officialpriyam

## [1.25.0](https://github.com/officialpriyam/cognix/compare/v1.24.0...v1.25.0) (2025-10-30)


### Features

* s3 storage and richer file support ([#301](https://github.com/officialpriyam/cognix/issues/301)) ([051a974](https://github.com/officialpriyam/cognix/commit/051a9740a6ecf774bfead9ce327c376ea5b279a5)) by @officialpriyam


### Bug Fixes

* model name for gpt-4.1-mini in staticModels ([#299](https://github.com/officialpriyam/cognix/issues/299)) ([4513ac0](https://github.com/officialpriyam/cognix/commit/4513ac0e842f588a24d7075af8700e3cc7a3eb39)) by @officialpriyam

## [1.24.0](https://github.com/officialpriyam/cognix/compare/v1.23.0...v1.24.0) (2025-10-06)


### Features

* generate image Tool (Nano Banana) ([#284](https://github.com/officialpriyam/cognix/issues/284)) ([984ce66](https://github.com/officialpriyam/cognix/commit/984ce665ceef7225870f4eb751afaf65bf8a2dd4)) by @officialpriyam
* openai image generate ([#287](https://github.com/officialpriyam/cognix/issues/287)) ([0deef6e](https://github.com/officialpriyam/cognix/commit/0deef6e8a83196afb1f44444ab2f13415de20e73)) by @officialpriyam

## [1.23.0](https://github.com/officialpriyam/cognix/compare/v1.22.0...v1.23.0) (2025-10-04)


### Features

* export chat thread ([#278](https://github.com/officialpriyam/cognix/issues/278)) ([23e79cd](https://github.com/officialpriyam/cognix/commit/23e79cd570c24bab0abc496eca639bfffcb6060b)) by @officialpriyam
* **file-storage:** image uploads, generate profile with ai ([#257](https://github.com/officialpriyam/cognix/issues/257)) ([46eb43f](https://github.com/officialpriyam/cognix/commit/46eb43f84792d48c450f3853b48b24419f67c7a1)) by @officialpriyam


### Bug Fixes

* Apply DISABLE_SIGN_UP to OAuth providers ([#282](https://github.com/officialpriyam/cognix/issues/282)) ([bcc0db8](https://github.com/officialpriyam/cognix/commit/bcc0db8eb81997e54e8904e64fc76229fbfc1338)) by @officialpriyam
* ollama disable issue ([#283](https://github.com/officialpriyam/cognix/issues/283)) ([5e0a690](https://github.com/officialpriyam/cognix/commit/5e0a690bb6c3f074680d13e09165ca9fff139f93)) by @officialpriyam

## [1.22.0](https://github.com/officialpriyam/cognix/compare/v1.21.0...v1.22.0) (2025-09-25)

### Features

- admin and roles ([#270](https://github.com/officialpriyam/cognix/issues/270)) ([63bddca](https://github.com/officialpriyam/cognix/commit/63bddcaa4bc62bc85204a0982a06f2bed09fc5f5)) by @officialpriyam
- groq provider ([#268](https://github.com/officialpriyam/cognix/issues/268)) ([aef213d](https://github.com/officialpriyam/cognix/commit/aef213d2f9dd0255996cc4184b03425db243cd7b)) by @officialpriyam
- hide LLM providers without API keys in model selection ([#269](https://github.com/officialpriyam/cognix/issues/269)) ([63c15dd](https://github.com/officialpriyam/cognix/commit/63c15dd386ea99b8fa56f7b6cb1e58e5779b525d)) by @officialpriyam
- **voice-chat:** binding agent tools ([#275](https://github.com/officialpriyam/cognix/issues/275)) ([ed45e82](https://github.com/officialpriyam/cognix/commit/ed45e822eb36447f2a02ef3aa69eeec88009e357)) by @officialpriyam

### Bug Fixes

- ensure PKCE works for MCP Server auth ([#256](https://github.com/officialpriyam/cognix/issues/256)) ([09b938f](https://github.com/officialpriyam/cognix/commit/09b938f17ca78993a1c7b84c5a702b95159542b2)) by @officialpriyam

## [1.21.0](https://github.com/officialpriyam/cognix/compare/v1.20.2...v1.21.0) (2025-08-24)

### Features

- agent sharing ([#226](https://github.com/officialpriyam/cognix/issues/226)) ([090dd8f](https://github.com/officialpriyam/cognix/commit/090dd8f4bf4fb82beb2cd9bfa0b427425bbbf352)) by @officialpriyam
- ai v5 ([#230](https://github.com/officialpriyam/cognix/issues/230)) ([0461879](https://github.com/officialpriyam/cognix/commit/0461879740860055a278c96656328367980fa533)) by @officialpriyam
- improve markdown table styling ([#244](https://github.com/officialpriyam/cognix/issues/244)) ([7338e04](https://github.com/officialpriyam/cognix/commit/7338e046196f72a7cc8ec7903593d94ecabcc05e)) by @officialpriyam

### Bug Fixes

- [#111](https://github.com/officialpriyam/cognix/issues/111) prevent MCP server disconnection during long-running tool calls ([#238](https://github.com/officialpriyam/cognix/issues/238)) ([b5bb3dc](https://github.com/officialpriyam/cognix/commit/b5bb3dc40a025648ecd78f547e0e1a2edd8681ca)) by @officialpriyam

## [1.20.2](https://github.com/officialpriyam/cognix/compare/v1.20.1...v1.20.2) (2025-08-09)

### Bug Fixes

- improve error display with better UX and animation handling ([#227](https://github.com/officialpriyam/cognix/issues/227)) ([35d62e0](https://github.com/officialpriyam/cognix/commit/35d62e05bb21760086c184511d8062444619696c)) by @officialpriyam
- **mcp:** ensure database and memory manager sync across server instances ([#229](https://github.com/officialpriyam/cognix/issues/229)) ([c4b8ebe](https://github.com/officialpriyam/cognix/commit/c4b8ebe9566530986951671e36111a2e529bf592)) by @officialpriyam

## [1.20.1](https://github.com/officialpriyam/cognix/compare/v1.20.0...v1.20.1) (2025-08-06)

### Bug Fixes

- **mcp:** fix MCP infinite loading issue ([#220](https://github.com/officialpriyam/cognix/issues/220)) ([c25e351](https://github.com/officialpriyam/cognix/commit/c25e3515867c76cc5494a67e79711e9343196078)) by @officialpriyam

## [1.20.0](https://github.com/officialpriyam/cognix/compare/v1.19.1...v1.20.0) (2025-08-04)

### Features

- add qwen3 coder to models file for openrouter ([#206](https://github.com/officialpriyam/cognix/issues/206)) ([3731d00](https://github.com/officialpriyam/cognix/commit/3731d007100ac36a814704f8bde8398ce1378a4e)) by @officialpriyam
- improve authentication configuration and social login handling ([#211](https://github.com/officialpriyam/cognix/issues/211)) ([cd25937](https://github.com/officialpriyam/cognix/commit/cd25937020710138ab82458e70ea7f6cabfd03ca)) by @officialpriyam
- introduce interactive table creation and enhance visualization tools ([#205](https://github.com/officialpriyam/cognix/issues/205)) ([623a736](https://github.com/officialpriyam/cognix/commit/623a736f6895b8737acaa06811088be2dc1d0b3c)) by @officialpriyam
- **mcp:** oauth ([#208](https://github.com/officialpriyam/cognix/issues/208)) ([136aded](https://github.com/officialpriyam/cognix/commit/136aded6de716367380ff64c2452d1b4afe4aa7f)) by @officialpriyam
- **web-search:** replace Tavily API with Exa AI integration ([#204](https://github.com/officialpriyam/cognix/issues/204)) ([7140487](https://github.com/officialpriyam/cognix/commit/7140487dcdadb6c5cb6af08f92b06d42411f7168)) by @officialpriyam

### Bug Fixes

- implement responsive horizontal layout for chat mention input with improved UX And generate Agent Prompt ([43ec980](https://github.com/officialpriyam/cognix/commit/43ec98059e0d27ab819491518263df55fb1c9ad3)) by @officialpriyam
- **mcp:** Safe MCP manager init logic for the Vercel environment ([#202](https://github.com/officialpriyam/cognix/issues/202)) ([708fdfc](https://github.com/officialpriyam/cognix/commit/708fdfcfed70299044a90773d3c9a76c9a139f2f)) by @officialpriyam

## [1.19.1](https://github.com/officialpriyam/cognix/compare/v1.19.0...v1.19.1) (2025-07-29)

### Bug Fixes

- **agent:** improve agent loading logic and validation handling in EditAgent component [#198](https://github.com/officialpriyam/cognix/issues/198) ([ec034ab](https://github.com/officialpriyam/cognix/commit/ec034ab51dfc656d7378eca1e2b4dc94fbb67863)) by @officialpriyam
- **agent:** update description field to allow nullish values in ChatMentionSchema ([3e4532d](https://github.com/officialpriyam/cognix/commit/3e4532d4c7b561ad03836c743eefb7cd35fe9e74)) by @officialpriyam
- **i18n:** update agent description fields in English, Spanish, and French JSON files to improve clarity and consistency ([f07d1c4](https://github.com/officialpriyam/cognix/commit/f07d1c4dc64b96584faa7e558f981199834a5370)) by @officialpriyam
- Invalid 'tools': array too long. Expected an array with maximum length 128, but got an array with length 217 instead. [#197](https://github.com/officialpriyam/cognix/issues/197) ([b967e3a](https://github.com/officialpriyam/cognix/commit/b967e3a30be3a8a48f3801b916e26ac4d7dd50f4)) by @officialpriyam

## [1.19.0](https://github.com/officialpriyam/cognix/compare/v1.18.0...v1.19.0) (2025-07-28)

### Features

- Add Azure OpenAI provider support with comprehensive testing ([#189](https://github.com/officialpriyam/cognix/issues/189)) ([edad917](https://github.com/officialpriyam/cognix/commit/edad91707d49fcb5d3bd244a77fbaae86527742a)) by @officialpriyam
- add bot name preference to user settings ([f4aa588](https://github.com/officialpriyam/cognix/commit/f4aa5885d0be06cc21149d09e604c781e551ec4a)) by @officialpriyam
- **agent:** agent and archive ([#192](https://github.com/officialpriyam/cognix/issues/192)) ([c63ae17](https://github.com/officialpriyam/cognix/commit/c63ae179363b66bfa4f4b5524bdf27b71166c299)) by @officialpriyam

### Bug Fixes

- enhance event handling for keyboard shortcuts in chat components ([95dad3b](https://github.com/officialpriyam/cognix/commit/95dad3bd1dac4b6e56be2df35957a849617ba056)) by @officialpriyam
- refine thinking prompt condition in chat API ([0192151](https://github.com/officialpriyam/cognix/commit/0192151fec1e33f3b7bc1f08b0a9582d66650ef0)) by @officialpriyam

## [1.18.0](https://github.com/officialpriyam/cognix/compare/v1.17.1...v1.18.0) (2025-07-24)

### Features

- add sequential thinking tool and enhance UI components ([#183](https://github.com/officialpriyam/cognix/issues/183)) ([5bcbde2](https://github.com/officialpriyam/cognix/commit/5bcbde2de776b17c3cc1f47f4968b13e22fc65b2)) by @officialpriyam

## [1.17.1](https://github.com/officialpriyam/cognix/compare/v1.17.0...v1.17.1) (2025-07-23)

### Bug Fixes

- ensure thread date fallback to current date in AppSidebarThreads component ([800b504](https://github.com/officialpriyam/cognix/commit/800b50498576cfe1717da4385e2a496ac33ea0ad)) by @officialpriyam
- link to the config generator correctly ([#184](https://github.com/officialpriyam/cognix/issues/184)) ([1865ecc](https://github.com/officialpriyam/cognix/commit/1865ecc269e567838bc391a3236fcce82c213fc0)) by @officialpriyam
- python executor ([ea58742](https://github.com/officialpriyam/cognix/commit/ea58742cccd5490844b3139a37171b1b68046f85)) by @officialpriyam

## [1.17.0](https://github.com/officialpriyam/cognix/compare/v1.16.0...v1.17.0) (2025-07-18)

### Features

- add Python execution tool and integrate Pyodide support ([#176](https://github.com/officialpriyam/cognix/issues/176)) ([de2cf7b](https://github.com/officialpriyam/cognix/commit/de2cf7b66444fe64791ed142216277a5f2cdc551)) by @officialpriyam

### Bug Fixes

- generate title by user message ([9ee4be6](https://github.com/officialpriyam/cognix/commit/9ee4be69c6b90f44134d110e90f9c3da5219c79f)) by @officialpriyam
- generate title sync ([5f3afdc](https://github.com/officialpriyam/cognix/commit/5f3afdc4cb7304460606b3480f54f513ef24940c)) by @officialpriyam

## [1.16.0](https://github.com/officialpriyam/cognix/compare/v1.15.0...v1.16.0) (2025-07-15)

### Features

- Lazy Chat Title Generation: Save Empty Title First, Then Generate and Upsert in Parallel ([#162](https://github.com/officialpriyam/cognix/issues/162)) ([31dfd78](https://github.com/officialpriyam/cognix/commit/31dfd7802e33d8d4e91aae321c3d16a07fe42552)) by @officialpriyam
- publish container to GitHub registry ([#149](https://github.com/officialpriyam/cognix/issues/149)) ([9f03cbc](https://github.com/officialpriyam/cognix/commit/9f03cbc1d2890746f14919ebaad60f773b0a333d)) by @officialpriyam
- update mention ux ([#161](https://github.com/officialpriyam/cognix/issues/161)) ([7ceb9c6](https://github.com/officialpriyam/cognix/commit/7ceb9c69c32de25d523a4d14623b25a34ffb3c9d)) by @officialpriyam

### Bug Fixes

- bug(LineChart): series are incorrectly represented [#165](https://github.com/officialpriyam/cognix/issues/165) ([4e4905c](https://github.com/officialpriyam/cognix/commit/4e4905c0f7f6a3eca73ea2ac06f718fa29b0f821)) by @officialpriyam
- ignore tool binding on unsupported models (server-side) ([#160](https://github.com/officialpriyam/cognix/issues/160)) ([277b4fe](https://github.com/officialpriyam/cognix/commit/277b4fe986d5b6d9780d9ade83f294d8f34806f6)) by @officialpriyam
- js executor tool and gemini model version ([#169](https://github.com/officialpriyam/cognix/issues/169)) ([e25e10a](https://github.com/officialpriyam/cognix/commit/e25e10ab9fac4247774b0dee7e01d5f6a4b16191)) by @officialpriyam
- **scripts:** parse openai compatible on windows ([#164](https://github.com/officialpriyam/cognix/issues/164)) ([41f5ff5](https://github.com/officialpriyam/cognix/commit/41f5ff55b8d17c76a23a2abf4a6e4cb0c4d95dc5)) by @officialpriyam
- **workflow-panel:** fix save button width ([#168](https://github.com/officialpriyam/cognix/issues/168)) ([3e66226](https://github.com/officialpriyam/cognix/commit/3e6622630c9cc40ff3d4357e051c45f8c860fc10)) by @officialpriyam

## [1.15.0](https://github.com/officialpriyam/cognix/compare/v1.14.1...v1.15.0) (2025-07-11)

### Features

- Add js-execution tool and bug fixes(tool call) ([#148](https://github.com/officialpriyam/cognix/issues/148)) ([12b18a1](https://github.com/officialpriyam/cognix/commit/12b18a1cf31a17e565eddc05764b5bd2d0b0edee)) by @officialpriyam

### Bug Fixes

- enhance ToolModeDropdown with tooltip updates and debounce functionality ([d06db0b](https://github.com/officialpriyam/cognix/commit/d06db0b3e1db34dc4785eb31ebd888d7c2ae0d64)) by @officialpriyam

## [1.14.1](https://github.com/officialpriyam/cognix/compare/v1.14.0...v1.14.1) (2025-07-09)

### Bug Fixes

- tool select ui ([#141](https://github.com/officialpriyam/cognix/issues/141)) ([0795524](https://github.com/officialpriyam/cognix/commit/0795524991a7aa3e17990777ca75381e32eaa547)) by @officialpriyam

## [1.14.0](https://github.com/officialpriyam/cognix/compare/v1.13.0...v1.14.0) (2025-07-07)

### Features

- web-search with images ([bea76b3](https://github.com/officialpriyam/cognix/commit/bea76b3a544d4cf5584fa29e5c509b0aee1d4fee)) by @officialpriyam
- **workflow:** add auto layout feature for workflow nodes and update UI messages ([0cfbffd](https://github.com/officialpriyam/cognix/commit/0cfbffd631c9ae5c6ed57d47ca5f34b9acbb257d)) by @officialpriyam
- **workflow:** stable workflow ( add example workflow : baby-research ) ([#137](https://github.com/officialpriyam/cognix/issues/137)) ([c38a7ea](https://github.com/officialpriyam/cognix/commit/c38a7ea748cdb117a4d0f4b886e3d8257a135956)) by @officialpriyam

### Bug Fixes

- **api:** handle error case in chat route by using orElse for unwrap ([25580a2](https://github.com/officialpriyam/cognix/commit/25580a2a9f6c9fbc4abc29fee362dc4b4f27f9b4)) by @officialpriyam
- **workflow:** llm structure Output ([c529292](https://github.com/officialpriyam/cognix/commit/c529292ddc1a4b836a5921e25103598afd7e3ab7)) by @officialpriyam

## [1.13.0](https://github.com/officialpriyam/cognix/compare/v1.12.1...v1.13.0) (2025-07-04)

### Features

- Add web search and content extraction tools using Tavily API ([#126](https://github.com/officialpriyam/cognix/issues/126)) ([f7b4ea5](https://github.com/officialpriyam/cognix/commit/f7b4ea5828b33756a83dd881b9afa825796bf69f)) by @officialpriyam

### Bug Fixes

- workflow condition node issue ([78b7add](https://github.com/officialpriyam/cognix/commit/78b7addbba51b4553ec5d0ce8961bf90be5d649c)) by @officialpriyam
- **workflow:** improve mention handling by ensuring empty values are represented correctly ([92ff9c3](https://github.com/officialpriyam/cognix/commit/92ff9c3e14b97d9f58a22f9df2559e479f14537c)) by @officialpriyam
- **workflow:** simplify mention formatting by removing bold styling for non-empty values ([ef65fd7](https://github.com/officialpriyam/cognix/commit/ef65fd713ab59c7d8464cae480df7626daeff5cd)) by @officialpriyam

## [1.12.1](https://github.com/officialpriyam/cognix/compare/v1.12.0...v1.12.1) (2025-07-02)

### Bug Fixes

- **workflow:** enhance structured output handling and improve user notifications ([dd43de9](https://github.com/officialpriyam/cognix/commit/dd43de99881d64ca0c557e29033e953bcd4adc0e)) by @officialpriyam

## [1.12.0](https://github.com/officialpriyam/cognix/compare/v1.11.0...v1.12.0) (2025-07-01)

### Features

- **chat:** enable [@mention](https://github.com/mention) and tool click to trigger workflow execution in chat ([#122](https://github.com/officialpriyam/cognix/issues/122)) ([b4e7f02](https://github.com/officialpriyam/cognix/commit/b4e7f022fa155ef70be2aee9228a4d1d2643bf10)) by @officialpriyam

### Bug Fixes

- clean changlelog and stop duplicate attributions in the changelog file ([#119](https://github.com/officialpriyam/cognix/issues/119)) ([aa970b6](https://github.com/officialpriyam/cognix/commit/aa970b6a2d39ac1f0ca22db761dd452e3c7a5542)) by @officialpriyam

## [1.11.0](https://github.com/officialpriyam/cognix/compare/v1.10.0...v1.11.0) (2025-06-28)

### Features

- **workflow:** Add HTTP and Template nodes with LLM structured output supportWorkflow node ([#117](https://github.com/officialpriyam/cognix/issues/117)) ([10ec438](https://github.com/officialpriyam/cognix/commit/10ec438f13849f0745e7fab652cdd7cef8e97ab6)) by @officialpriyam
- **workflow:** add HTTP node configuration and execution support ([7d2f65f](https://github.com/officialpriyam/cognix/commit/7d2f65fe4f0fdaae58ca2a69abb04abee3111c60)) by @officialpriyam

### Bug Fixes

- add POST endpoint for MCP client saving with session validation ([fa005aa](https://github.com/officialpriyam/cognix/commit/fa005aaecbf1f8d9279f5b4ce5ba85343e18202b)) by @officialpriyam
- split theme system into base themes and style variants ([61ebd07](https://github.com/officialpriyam/cognix/commit/61ebd0745bcfd7a84ba3ad65c3f52b7050b5131a)) by @officialpriyam
- update ToolMessagePart to use isExecuting state instead of isExpanded ([752f8f0](https://github.com/officialpriyam/cognix/commit/752f8f06e319119569e9ee7c04d621ab1c43ca54)) by @officialpriyam

## [1.10.0](https://github.com/officialpriyam/cognix/compare/v1.9.0...v1.10.0) (2025-06-27)

### Features

- **releases:** add debug logging to the add authors and update release step ([#105](https://github.com/officialpriyam/cognix/issues/105)) ([c855a6a](https://github.com/officialpriyam/cognix/commit/c855a6a94c49dfd93c9a8d1d0932aeda36bd6c7e)) by @officialpriyam
- workflow beta ([#100](https://github.com/officialpriyam/cognix/issues/100)) ([2f5ada2](https://github.com/officialpriyam/cognix/commit/2f5ada2a66e8e3cd249094be9d28983e4331d3a1)) by @officialpriyam

### Bug Fixes

- update tool selection logic in McpServerSelector to maintain current selections ([4103c1b](https://github.com/officialpriyam/cognix/commit/4103c1b828c3e5b513679a3fb9d72bd37301f99d)) by @officialpriyam
- **workflow:** MPC Tool Response Structure And Workflow ([#113](https://github.com/officialpriyam/cognix/issues/113)) ([836ffd7](https://github.com/officialpriyam/cognix/commit/836ffd7ef5858210bdce44d18ca82a1c8f0fc87f)) by @officialpriyam

## [1.9.0](https://github.com/officialpriyam/cognix/compare/v1.8.0...v1.9.0) (2025-06-16)

### Features

- credit contributors in releases and changlogs ([#104](https://github.com/officialpriyam/cognix/issues/104)) ([e0e4443](https://github.com/officialpriyam/cognix/commit/e0e444382209a36f03b6e898f26ebd805032c306)) by @officialpriyam

### Bug Fixes

- increase maxTokens for title generation in chat actions issue [#102](https://github.com/officialpriyam/cognix/issues/102) ([bea2588](https://github.com/officialpriyam/cognix/commit/bea2588e24cf649133e8ce5f3b6391265b604f06)) by @officialpriyam
- temporary chat initial model ([0393f7a](https://github.com/officialpriyam/cognix/commit/0393f7a190463faf58cbfbca1c21d349a9ff05dc)) by @officialpriyam
- update adding-openAI-like-providers.md ([#101](https://github.com/officialpriyam/cognix/issues/101)) ([2bb94e7](https://github.com/officialpriyam/cognix/commit/2bb94e7df63a105e33c1d51271751c7b89fead23)) by @officialpriyam
- update config file path in release workflow ([7209cbe](https://github.com/officialpriyam/cognix/commit/7209cbeb89bd65b14aee66a40ed1abb5c5f2e018)) by @officialpriyam

## [1.8.0](https://github.com/officialpriyam/cognix/compare/v1.7.0...v1.8.0) (2025-06-11)

### Features

- add openAI compatible provider support ([#92](https://github.com/officialpriyam/cognix/issues/92)) ([6682c9a](https://github.com/officialpriyam/cognix/commit/6682c9a320aff9d91912489661d27ae9bb0f4440)) by @officialpriyam

### Bug Fixes

- Enhance component styles and configurations ([a7284f1](https://github.com/officialpriyam/cognix/commit/a7284f12ca02ee29f7da4d57e4fe6e8c6ecb2dfc)) by @officialpriyam

## [1.7.0](https://github.com/officialpriyam/cognix/compare/v1.6.2...v1.7.0) (2025-06-06)

### Features

- Per User Custom instructions ([#86](https://github.com/officialpriyam/cognix/issues/86)) ([d45c968](https://github.com/officialpriyam/cognix/commit/d45c9684adfb0d9b163c83f3bb63310eef572279)) by @officialpriyam

## [1.6.2](https://github.com/officialpriyam/cognix/compare/v1.6.1...v1.6.2) (2025-06-04)

### Bug Fixes

- enhance error handling in chat bot component ([1519799](https://github.com/officialpriyam/cognix/commit/15197996ba1f175db002b06e3eac2765cfae1518)) by @officialpriyam
- improve session error handling in authentication ([eb15b55](https://github.com/officialpriyam/cognix/commit/eb15b550facf5368f990d58b4b521bf15aecbf72)) by @officialpriyam
- support OpenAI real-time chat project instructions ([2ebbb5e](https://github.com/officialpriyam/cognix/commit/2ebbb5e68105ef6706340a6cfbcf10b4d481274a)) by @officialpriyam
- unify SSE and streamable config as RemoteConfig ([#85](https://github.com/officialpriyam/cognix/issues/85)) ([66524a0](https://github.com/officialpriyam/cognix/commit/66524a0398bd49230fcdec73130f1eb574e97477)) by @officialpriyam

## [1.6.1](https://github.com/officialpriyam/cognix/compare/v1.6.0...v1.6.1) (2025-06-02)

### Bug Fixes

- speech ux ([baa849f](https://github.com/officialpriyam/cognix/commit/baa849ff2b6b147ec685c6847834385652fc3191)) by @officialpriyam

## [1.6.0](https://github.com/officialpriyam/cognix/compare/v1.5.2...v1.6.0) (2025-06-01)

### Features

- add husky for formatting and checking commits ([#71](https://github.com/officialpriyam/cognix/issues/71)) ([a379cd3](https://github.com/officialpriyam/cognix/commit/a379cd3e869b5caab5bcaf3b03f5607021f988ef)) by @officialpriyam
- add Spanish, French, Japanese, and Chinese language support with UI improvements ([#74](https://github.com/officialpriyam/cognix/issues/74)) ([e34d43d](https://github.com/officialpriyam/cognix/commit/e34d43df78767518f0379a434f8ffb1808b17e17)) by @officialpriyam
- implement cold start-like auto connection for MCP server and simplify status ([#73](https://github.com/officialpriyam/cognix/issues/73)) ([987c442](https://github.com/officialpriyam/cognix/commit/987c4425504d6772e0aefe08b4e1911e4cb285c1)) by @officialpriyam

## [1.5.2](https://github.com/officialpriyam/cognix/compare/v1.5.1...v1.5.2) (2025-06-01)

### Features

- Add support for Streamable HTTP Transport [#56](https://github.com/officialpriyam/cognix/issues/56) ([8783943](https://github.com/officialpriyam/cognix/commit/878394337e3b490ec2d17bcc302f38c695108d73)) by @officialpriyam
- implement speech system prompt and update voice chat options for enhanced user interaction ([5a33626](https://github.com/officialpriyam/cognix/commit/5a336260899ab542407c3c26925a147c1a9bba11)) by @officialpriyam
- update MCP server UI and translations for improved user experience ([1e2fd31](https://github.com/officialpriyam/cognix/commit/1e2fd31f8804669fbcf55a4c54ccf0194a7e797c)) by @officialpriyam

### Bug Fixes

- enhance mobile UI experience with responsive design adjustments ([2eee8ba](https://github.com/officialpriyam/cognix/commit/2eee8bab078207841f4d30ce7708885c7268302e)) by @officialpriyam
- UI improvements for mobile experience ([#66](https://github.com/officialpriyam/cognix/issues/66)) ([b4349ab](https://github.com/officialpriyam/cognix/commit/b4349abf75de69f65a44735de2e0988c6d9d42d8)) by @officialpriyam

### Miscellaneous Chores

- release 1.5.2 ([d185514](https://github.com/officialpriyam/cognix/commit/d1855148cfa53ea99c9639f8856d0e7c58eca020)) by @officialpriyam
