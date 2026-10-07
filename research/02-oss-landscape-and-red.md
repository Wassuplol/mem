# 02 — OSS Discord-Bot Landscape & Red-DiscordBot Deep Dive

*Research date: 2026-10-07. Method: GitHub REST API (repo metadata, releases), live fetches of repos/docs/releases, PyPI/npm registries, Red-Index machine data (`index/1-min.json`), community sources. All star counts, dates and versions are as measured on 2026-10-07 unless stated.*

---

## 1. Red-DiscordBot today (Oct 2026)

**Repo state.** `Cog-Creators/Red-DiscordBot` — 5,724 stars, 2,521 forks, ~200 open issues + ~99 open PRs, GPL-3.0, Python. Last commit on `V3/develop`: **Sep 7, 2026**; recent history is ~1–2 commits/month, overwhelmingly maintenance (OS-support churn such as "Support Fedora 44, drop Fedora 42 and RHEL 9.4 derivatives", install-guide fixes, Java-version corrections). The only user-visible feature since spring: [Streams] kick.com support (#6547, May 17, 2026).

**Releases.** Latest stable **3.5.24 (2026-03-06)**; before it 3.5.23 (2026-03-04), 3.5.22 (2025-09-04), 3.5.21 (2025-08-26), with a denser burst earlier in 2025 (3.5.14 Dec 2024 → 3.5.20 May 2025). Pattern: short maintenance bursts, then **~6-month gaps (Sep 2025 → Mar 2026) — and now 7 months with no stable release (Mar → Oct 2026)** while development continues on a `3.5.25.dev` line. The milestone page shows the next breaking release ("Breaking release after the next", i.e. 3.6.0) at **1/51 issues closed, no due date**; the only announced 3.6.0 change is dropping armv7l support. Release credits list 5–13 people: a small volunteer team, maintained reactively.

**Python support — the structural problem.** PyPI metadata for 3.5.24: `requires_python: >=3.8.1, <3.12`. The Ubuntu 24.04 install guide still tells users to install **Python 3.11 via deadsnakes**. With Python 3.14 current (Oct 2026), Red cannot run on any Python released since late 2023 — the clearest case of accumulated platform debt in this ecosystem.

**Security history.** Published advisories: "Incorrect Authorization in commands API" (Jul 10, 2024, Moderate) and "Unauthorized privilege escalation in Mod module" (Oct 27, 2020, Moderate); plus a historical RCE in the Trivia module fixed in 3.3.11. Core-cog bugs are routine — but because third-party code runs with full bot privileges, every bug is a potential bot takeover.

**Praise / why people stay.** Open source, self-hosted, no paywalled tiers — a recurring complaint against MEE6/Dyno is that "they all have paywalls… hide features behind paywalls" — and extreme extensibility: "open source, self-hosted and extensible with Python scripts (called cogs)". The ecosystem is real: Red-Index (fetched today) lists **105 repos / 1,306 cogs**, **605 (46%) updated in the last 12 months**. Docs are excellent: per-release "Read before updating" sections, a versioning/guarantees page, ~20 OS install guides.

**Complaints / why people leave.** (a) No dashboard — the org's dashboard was archived as "completely non-functional" (§1.2). (b) Prefix-command UX and anxiety about Discord API shifts (Discussion #5842: "When slash commands are forced will this bot be impossible to use?"). (c) Setup burden: virtualenvs, the Python ≤3.11 ceiling, and Audio requiring a **Java runtime plus manually updated Lavalink jars** (3.5.23 → Java 17+; 3.5.24 adds Java 21) — the issue tracker is dominated by audio breakage. (d) Slow releases; the dev version is explicitly unsupported. Hosted rivals win on out-of-the-box UX; Red wins on freedom, so migration stories are "I outgrew the paywall", not "Red is easier".

### 1.1 How the cog/plugin system works

- **Unit of distribution:** a cog = a Python package folder (`__init__.py` with `async def setup(bot)`, plus `info.json`) inside a plain git repo (GitHub/GitLab). `info.json` keys: `requirements`, `min_bot_version`, `max_bot_version`, `min_python_version`, `end_user_data_statement`, `tags`, `type` (`COG`/`SHARED_LIBRARY`; shared libraries deprecated since 3.2).
- **Install/update flow (Downloader):** `[p]repo add <name> <url> [branch]` → `[p]cog install <repo> <cog>` → `[p]load <cog>`; updates via `[p]repo update` / `[p]cog update`; per-cog **pin/unpin** and install/update **to a specific git commit**. Cog commands are **bot-owner-only**; local development uses `[p]addpath`.
- **Dependency execution:** `requirements` are **passed to pip at install time** — installing a cog can run arbitrary Python and pull arbitrary PyPI/git dependencies.
- **Runtime model — no sandbox:** cogs are ordinary Python classes imported into the bot process; the only docs warning of this class is "Overriding Permissions specifically is dangerous". A cog sees the data directory, config subsystem and bot token, and can import anything. There is no capability model or isolation. Trust is **social**: "Approved Cog Creator" applications get a QA review ("No cog contains malicious code", "No cog allows for escalation of permissions"; repos broken >1 month get delisted), and everything else is *unapproved* with the banner "Unapproved repositories are provided by the community and have not yet been inspected."
- **RPC (the integration hook):** with `--rpc`, Red opens a localhost WebSocket JSON-RPC server on `127.0.0.1:6133` (deliberately not configurable — "broad access to this server gives anyone complete control over your bot"). Cogs register handlers; external tools subscribe to topics — but the API is *provisional* and may be removed.
- **User-facing permissions:** a core Permissions cog gives per-command/channel/role rules; the README advertises "Customisable command permissions".

### 1.2 Third-party dashboards for Red

- **Red-Dashboard (NeuroAssassin, later moved to the Cog-Creators org):** archived **Mar 2, 2025** with an "EoL Announcement" commit; README now: *"This project is discontinued, is no longer supported, and is known to be completely non-functional. If you are searching for a dashboard, please search the Index for one in active development."* 77 stars, 43 forks, 138 commits, AGPL-3.0. Architecture: separate Flask app over RPC + Discord OAuth. Classic single-maintainer/org-handoff failure.
- **Auttaja:** its Python/discord.py dashboard was central to its 2021 post-mortem ("dashboard sucks… hardly works on mobile… issues loading and saving configuration data"); the bot is now offline (site shows "Coming soon"; listed offline Aug 2026).
- **What exists today:** the de-facto Red dashboard is a cog — `AAA3A-cogs/dashboard` (approved repo; all 79 cogs updated within 12 months): "Interact with your bot through a web Dashboard! Thank you very much to Neuro for the initial work!", with pip requirements `git+AAA3A_utils`, `fernet`, `markdown2`, `wtforms`, `werkzeug`, `markupsafe`, `itsdangerous`. **The dashboard became a Flask/Werkzeug app shipped as a plugin because core Red never exposed a first-class web/API surface.** No modern, maintained, org-backed dashboard exists — an open goal.

---

## 2. Other open-source bots worth learning from

**YAGPDB (`botlabs-gg/yagpdb`) — best "bot + first-party control panel" precedent.** Go, MIT, 1,449 stars, very active (v2.87.1, 2026-09-27). Modular ("for most things plugins exist"), Docker/docker-compose self-hosting, and the repo contains the `web` control-panel code powering `yagpdb.xyz/manage`: the dashboard lives with the bot and serves both the hosted service and self-hosters. Closest existing model to our intent (minus TS and a third-party plugin SDK).

**sushii — serial-rewrite cautionary tale.** The `sushiibot` org (25 repos) went: `sushii-bot` (Rust/serenity-rs, PostgreSQL+diesel) → marked unmaintained; `sushii-2` (Rust rewrite, 22 stars, last push Sep 2025) → now a **third generation in TypeScript** (`sushiibot/sushii`, tags `discordjs`+`bun`, AGPL-3.0, pushed 2026-09-23) with TS satellites (`sushii-modmail`; `sushii-agent` updated Oct 6, 2026; `sushii-analytics`) and an older Next.js+PostGraphile web app last touched Jan 2024. Three stacks in ~4 years; the web app always lagged.

**Loritta — the OSS-reciprocity failure.** A 1M+-guild Kotlin bot (built on the org's JDA fork `DeviousJDA`). On **May 23, 2026** the repo was **archived and the project went closed source**: *"We've decided to change Loritta to be closed source, sorry! … Loritta was not getting anything 'back' from her being open source (users contributing…)"* (expanded in the owner's blog post the same day). Lesson: OSS + hosted service + zero monetization corrodes when external contribution never materializes.

**Auttaja — the decline post-mortem.** Python + discord.py + in-repo dashboard (2018). The owner's 2021 Medium post: unmaintainable, "way too many new features hacked into the codebase", dev team "unmotivated… for almost two years", hosted costs never broke even; the Go rewrite attempt (`Auttaja-OpenSource/Core`) was abandoned (last push Jan 2019). Bot offline; domain is a placeholder.

**Framework-adjacent ecosystems (precedent for markets):** **NoneBot2** (Python, 7,735 stars, active) has an official registry with **942 plugins**; **Koishi** (TypeScript, 6,245 stars) advertises in its README an "online plugin marketplace" installable from its console "even without any programming knowledge". Users already expect install-from-UI marketplaces.

---

## 3. Framework health (Oct 2026)

**TypeScript/JS**
- **discord.js** — 26,818 stars, Apache-2.0. Stable **14.27.0 (2026-07-15)**; **v15.0.0 unreleased: milestone 94% complete** (checked today), nightly `15.0.0-dev.*` builds on npm, "Updating to v15" guide already published (WebSocket fully integrated). Build on 14.x stable; plan the migration.
- **Sapphire** (`sapphiredev/framework`) — 756 stars, MIT, **v5.5.1 (2026-08-22)**, commits this month. Mature discord.js framework layer; small team.
- **seyfert** — 321 stars, MIT, npm **5.1.0**, pushed today. Small, npm-only cadence; thin ecosystem.
- **DiscordX** — 737 stars, npm 11.13.3, but **last GitHub release Jun 2024**, last push 2026-07-29: slowing.

**Python**
- **discord.py** — 16,197 stars, MIT, active. Latest **2.7.1 (2026-03-03)**; v2.7.0 added DAVE voice E2EE, new modal components, `@time` timestamps; already fixing issues "under Python 3.14". Effectively a one-maintainer project.
- **Pycord** — 2,958 stars, **2.8.1 (2026-07-25)**, Python 3.14 supported since 2.8.0; a separate **Pycord v3** (pre-release, install from git) is in development.
- **Nextcord** — 1,263 stars, **3.2.0 (2026-05-21)**, requires Python ≥3.12; maintained, smallest.

**Rust**
- **serenity** — 5,625 stars, latest **0.12.5 (2025-12-20)**, active commits (Oct 3, 2026); still 0.x.
- **twilight** — 879 stars, **0.17.1 (2025-12-13)**, active (pushed Oct 7, 2026); excellent, niche.

**What the biggest bots run:** Red = Python/discord.py; YAGPDB = **Go**; Loritta = **Kotlin** on a JDA fork; sushii = Rust (serenity → twilight-family) now **TypeScript + Bun + discord.js**. The commercial leaders (MEE6, Dyno, Carl-bot, Wick) are **closed source with no first-party stack documentation**; MEE6's public profile suggests a tiny engineering team (~4 engineers) serving 20M+ communities, funded by premium tiers. No top-tier bot runs a sandboxed plugin ecosystem; the two OSS leaders (Red, YAGPDB) both accept in-process plugins with review-based trust.

---

## 4. Plugin-system & sandboxing precedents (and marketplaces)

**Sandboxing:**
- **`node:vm` / vm2 — not safe for adversarial code.** vm2 (4,101 stars) was abandoned after 2023 escapes, then revived by its original author (npm 3.10.0 2025-10-24; 3.11.0 2026-05-01; 3.12.0/3.12.2 Sep 2026) — yet escapes continue: **CVE-2026-26956 "VM2 Has a WASM Sandbox Escape"** (published 2026-05-01) and a JSPI-backed Promise bypass (May 2026). Its README now recommends process/hardware-level isolation. Node's own permissions doc: *"This feature does not protect against malicious code… Node.js trusts any code it is asked to run."*
- **isolated-vm** — 2,934 stars, **v6.0.2 (2025-10-16)**, still receiving commits, 97 open issues; used by Screeps, Fly, Algolia, Tripadvisor. Best in-process isolate isolation (explicit data passing via `Reference`/`ExternalCopy`); vm2's README calls it "in maintenance mode" (competitor claim, contradicted by active commits). Good for limiting pure-logic plugins; not a full trust boundary for a token-holding bot.
- **Process/worker isolation** — `worker_threads`/`child_process` + serialized IPC is Node's honest boundary.
- **Deno subprocess workers** — deny-by-default flags (verified on docs.deno.com): `--allow-read/-write/-net/-env/-run/-ffi/-import/--allow-all`. Running each plugin as a Deno child with a narrow allow-list gives a real capability sandbox; cost is a second runtime (fine in Docker) plus IPC.
- **WASM** — `quickjs-emscripten` (JS in a WASM QuickJS VM; used by TLSNotary's extension for capability-based plugins) and **Extism** (cross-language WASM plugin framework: "off-the-shelf plug-in system") give strong isolation with deliberate host functions.

**Marketplaces:**
- **Red-Index** is the most transferable model: a YAML list in `Cog-Creators/Red-Index` (**58 approved, 49 unapproved repos** today), a **GitHub Action every 15 minutes** cloning every repo and compiling a public JSON (`1-min.json` → **105 repos / 1,306 cogs**), consumed by `index.discord.red` and an in-bot Index cog. Two tiers: *approved* (QA-reviewed Cog Creator applications) and *unapproved* (self-submitted PRs, shipped with the "use at your own risk / not inspected" banner). Weaknesses: human review bottleneck, no signatures/integrity, versioning = track-a-commit, no automated static analysis, abandonware delisted only after visible breakage.
- **Red's in-bot flow proves demand:** two chat commands install third-party code. Copy the UX, add safety rails.
- **Koishi/NoneBot2** — console marketplaces installing npm/PyPI packages; NoneBot2 registry: 942 plugins.
- **HACS (Home Assistant)** — PR-gated curation with a manifest (`hacs.json`); default-store inclusion reviewed by maintainers (`hacs.xyz/docs/publish/*`).
- **Extism** — distribution as signed, pinnable WASM artifacts rather than source.

---

## Lessons to steal

1. **Install-from-chat is the killer UX.** `[p]repo add` + `[p]cog install` turned chat into a package manager; replicate as slash commands *and* one-click dashboard installs, with per-module compat metadata (Red's `min_bot_version`/`min_python_version` is a good primitive).
2. **An auto-maintained public index is cheap and high-leverage.** Red-Index = one YAML + a 15-minute Action + public JSON: a marketplace backend for ~zero ops. Ours should add signature status, last-updated, compat ranges.
3. **Two-tier trust works.** Reviewed tier with real delisting rules + uninspected tier is pragmatic; add automated gates (manifest lint, static scan, permission diff) that Red lacks.
4. **Dashboards must be core, not bolted on.** Red's living dashboard is a Flask app installed as a cog; YAGPDB ships its panel in-repo for hosted + self-host. Version the bot↔web contract from day one.
5. **Ship a control-plane API — safely.** Red's localhost RPC is unauthenticated, provisional and why dashboards were fragile. Ours: authenticated, versioned, documented.
6. **Version guarantees + migration notes** (Red's "Read before updating" sections earn update trust).
7. **OAuth-scoped, per-guild dashboards are table stakes** (Red-Dashboard's best idea).
8. **Free-forever is a real differentiator** — the loudest hosted-bot complaints are paywalls.
9. **Container-first distribution.** Red maintains ~20 OS guides and fights Python/Java versions; YAGPDB offers one docker-compose page.
10. **Ride ecosystem health.** discord.js/Sapphire/discord.py are moving; a TS stack inherits updates Red structurally cannot take (Python <3.12).

## Mistakes to avoid

1. **Don't let the runtime age.** Pin minimums, never maximums; add a runtime-matrix CI.
2. **Don't treat review as a security boundary.** Red cogs are arbitrary in-process code with pip installs; its own advisories show the blast radius. Sandbox (Deno subprocess/WASM/process) or state the trust model loudly + scan + provenance.
3. **Don't let a flagship dashboard be a one-person side project.** Red-Dashboard's death ("completely non-functional") and Auttaja's rot both crippled their platforms; keep the dashboard in-monorepo.
4. **Don't rewrite the bot twice.** sushii's Rust→Rust→TS journey reset its ecosystem each time; pick TS/discord.js once and stabilize the module API.
5. **Don't ship plugin APIs that install arbitrary deps into the bot venv** (AAA3A's dashboard pip-installs Werkzeug/fernet etc.) — allowlist dependencies, lockfiles, vendored SDK.
6. **Don't skip version pinning/rollback.** Give modules exact installs + one-click rollback.
7. **Don't ignore the audio trap.** Java/Lavalink maintenance dominates Red's issue tracker; use `@discordjs/voice`-style stacks with graceful degradation.
8. **Don't assume OSS builds a contributor base.** Loritta's closure and Auttaja's burnout trace to single-team OSS with zero reciprocity; budget CONTRIBUTING, good-first-issues, maintainer roles.
9. **Don't leave Discord API migrations to chance.** Red users literally asked if the bot survives slash-command reality; own deprecation milestones.
10. **Don't pick a license that contradicts the business intent.** Red is GPL-3.0 — anyone may commercially host/modify it. "Clone with credit, no monetized clones" needs a source-available noncommercial license (PolyForm-style) and/or trademark+hosted moats; Loritta shows re-licensing after the fact is painful.

## Implications for our build

- **Module contract first:** mirror Red's `info.json` primitives (id, version, author, `requirements`, `min_bot_version`/`max_bot_version`, min-runtime, end-user-data statement, tags) **plus** declared capabilities (events/intents, DB tables, HTTP endpoints, dashboard pages) and semver.
- **Three execution tiers:** built-in modules = trusted first-party code; community modules = SDK-loaded with declared capabilities enforced at the API layer + static checks; untrusted/experimental = optional Deno-subprocess or WASM worker mode (because Node's own docs say in-process isolation protects nothing).
- **Marketplace v1 = Red-Index + HACS mechanics minus weaknesses:** CI-refreshed public index from a reviewed `modules.yaml`, slash install commands, one-click dashboard install, compat checks at install, signature/checksum verification, automated gates, "unreviewed" badges.
- **Dashboard as a product surface:** Next.js + authenticated, versioned control-plane API, Discord OAuth with per-guild scoping, module pages registered via `packages/core` so UI ships with the module — the thing Red never had and AAA3A hacked into a cog.
- **Ops posture:** Docker Compose primary (YAGPDB model) with Postgres+Redis profile, one-command upgrades + migrations; avoid external runtimes (Java) unless optional and isolated.
- **Governance & funding:** define maintainer roles and a public roadmap (Red's bus factor is the warning); fund via donations/sponsors (Red's README asks for Patreon) rather than paywalled features — and keep the hosted cloud genuinely optional.

## Sources

- Red: https://github.com/Cog-Creators/Red-DiscordBot · https://github.com/Cog-Creators/Red-DiscordBot/releases · https://github.com/Cog-Creators/Red-DiscordBot/commits/V3/develop · https://github.com/Cog-Creators/Red-DiscordBot/milestones · https://github.com/Cog-Creators/Red-DiscordBot/issues · https://github.com/Cog-Creators/Red-DiscordBot/security/advisories · https://github.com/Cog-Creators/Red-DiscordBot/security/advisories/GHSA-5jq8-q6rj-9gq4 · https://github.com/Cog-Creators/Red-DiscordBot/security/advisories/GHSA-mp9m-g7qj-6vqr · https://github.com/Cog-Creators/Red-DiscordBot/security/advisories/GHSA-55j9-849x-26h4 · https://github.com/Cog-Creators/Red-DiscordBot/discussions/5842
- Red docs: https://docs.discord.red/en/stable/changelog.html · https://docs.discord.red/en/stable/guide_cog_creation.html · https://docs.discord.red/en/stable/guide_publish_cogs.html · https://docs.discord.red/en/stable/guide_cog_creators.html · https://docs.discord.red/en/stable/cog_guides/downloader.html · https://docs.discord.red/en/stable/cog_guides/permissions.html · https://docs.discord.red/en/stable/framework_rpc.html · https://docs.discord.red/en/stable/install_guides/ubuntu-2404.html · https://docs.discord.red/en/stable/version_guarantees.html
- Registries: https://pypi.org/project/Red-DiscordBot/ · https://pypi.org/project/discord.py/ · https://pypi.org/project/py-cord/ · https://pypi.org/project/nextcord/ · https://registry.npmjs.org/vm2 · https://www.npmjs.com/package/seyfert
- Dashboards/index: https://github.com/Cog-Creators/Red-Dashboard · https://github.com/Cog-Creators/Red-Dashboard/commit/69771c5270230cafe2547a8ddaf0bf15cc725176 · https://github.com/NeuroAssassin/Toxic-Cogs · https://github.com/AAA3A-AAA3A/AAA3A-cogs · https://index.discord.red/ · https://github.com/Cog-Creators/Red-Index · https://raw.githubusercontent.com/Cog-Creators/Red-Index/master/index/1-min.json · https://raw.githubusercontent.com/Cog-Creators/Red-Index/master/repositories.yaml
- Other bots: https://github.com/botlabs-gg/yagpdb · https://yagpdb.xyz/manage · https://github.com/sushiibot/sushii · https://github.com/sushiibot/sushii-2 · https://github.com/sushiibot/sushii-bot · https://github.com/orgs/sushiibot/repositories · https://github.com/LorittaBot/Loritta · https://mrpowergamerbr.com/br/blog/2026-05-23-open-source-to-closed-source · https://github.com/LorittaBot/DeviousJDA · https://medium.com/auttaja/the-future-of-auttaja-737db19b355f · https://auttaja.io/ · https://alternative.me/discord/bots/auttaja · https://github.com/Auttaja-OpenSource/Core
- Frameworks: https://github.com/discordjs/discord.js · https://github.com/discordjs/discord.js/milestone/141 · https://discordjs.guide/v15 · https://github.com/sapphiredev/framework · https://github.com/tiramisulabs/seyfert · https://github.com/discordx-ts/discordx · https://github.com/Rapptz/discord.py · https://discordpy.readthedocs.io/en/latest/whats_new.html · https://github.com/Pycord-Development/pycord · https://pycord.dev/v3 · https://github.com/nextcord/nextcord · https://github.com/serenity-rs/serenity · https://github.com/twilight-rs/twilight
- Sandboxing/marketplaces: https://github.com/patriksimek/vm2 · https://github.com/patriksimek/vm2/security/advisories/GHSA-6j2x-vhqr-qr7q · https://github.com/advisories/GHSA-ffh4-j6h5-pg66 · https://github.com/laverdet/isolated-vm · https://nodejs.org/api/permissions.html · https://docs.deno.com/runtime/fundamentals/security/ · https://www.npmjs.com/package/@tootallnate/quickjs-emscripten · https://tlsnotary.org/docs/extension/plugins/ · https://extism.org/ · https://github.com/koishijs/koishi · https://registry.nonebot.dev/plugins.json · https://github.com/NoneBot/nonebot2 · https://hacs.xyz/docs/publish/start · https://hacs.xyz/docs/publish/include · https://vulners.com/cve/CVE-2025-26604

## Confidence & gaps

- **High confidence** (primary sources, fetched today): Red's stars/releases/dates/Python ceiling, cog mechanics, RPC, Red-Dashboard EoL text, Red-Index counts and the 46% freshness figure (computed from `1-min.json`), framework versions/dates, Loritta closure, sushii/Auttaja/YAGPDB repo states, vm2/isolated-vm state, Deno flags, NoneBot registry count, discord.js v15 milestone 94%.
- **Medium confidence:** "no sandboxing" is an accurate reading of Red's docs/code model, not an explicit statement; sentiment sections synthesize community threads, docs and issue patterns rather than a systematic survey; `repositories.yaml` (58/49) vs compiled index (58/47) reflects the 15-minute build lag.
- **Gaps / unverified:** exact termination reason for Red-Dashboard beyond the EoL commit; Red's live guild counts (not public); Auttaja's precise shutdown date (site offline, "Coming soon"); MEE6/Dyno/Carl-bot/Wick engineering stacks — no first-party source found, none claimed; Koishi plugin count (marketplace advertised, no authoritative number); isolated-vm's medium-term maintenance runway (contradictory signals noted); CVE-2025-26604 cited via aggregator (Vulners), not re-verified against the vendor advisory.
