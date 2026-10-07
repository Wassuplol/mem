# MASTER PLAN — v0.3 *(research digested — P1 underway)*

**Working title:** **Mem** (renamed; repo github.com/Wassuplol/mem) · **Date:** 2026-10-07 · **Status:** P1 — foundation (scaffold in place)

> One-liner: The community-management Discord bot done right — Red-style modularity + a first-class web dashboard + everything free + a modern, maintained stack. *Your server's memory.*

---

## 1. Positioning

- **vs MEE6 / Dyno / Carl-bot:** we don't paywall core features — their entire premium feature list ships free in our core.
- **vs Wick:** security suite included (anti-nuke with rollback, anti-raid, verification) — not a subscription.
- **vs YAGPDB:** visual configuration for everything; no arcane command syntax to memorize.
- **vs Red-DiscordBot:** we have a real dashboard, a maintained modern stack, and a plugin SDK that can ship UI.
- **Openness:** fully open source — **MIT** license. Anyone can use, modify and redistribute (commercial included); keep the copyright notice. The Mem name/brand stays reserved.

## 2. Principles

1. **Dashboard-first** — every feature configurable in the web UI, not only via commands.
2. **Zero paywalls** — donations or optional hosted service, never feature locks.
3. **Self-host-first** — `docker compose up` yields the FULL product locally; hosted mode runs the same code.
4. **Boring reliability** — Postgres + Redis, migrations, backups, graceful restarts, least-privilege bot permissions.
5. **Quality bar** — TypeScript strict, tests for kernel + modules, CI on every PR, docs treated as a product.
6. **Modular** — small core; features are modules; community modules can ship their own dashboard pages.

## 3. Stack (locked)

- **Language:** TypeScript end-to-end
- **Bot:** discord.js v14 (latest stable; v15 when stable), on a custom kernel layer
- **Web:** Next.js 16 + Tailwind + shadcn/ui + Better Auth · SSE for realtime
- **Data:** PostgreSQL (source of truth) + Redis (cache, BullMQ queues, pub/sub for realtime) · ORM: Drizzle
- **AI:** bring-your-own OpenAI-compatible endpoint (base URL + key + model per guild) — chat, summaries, mod-assist; local models (Ollama, LM Studio) work
- **Assets & branding:** UI icons = Lucide · original SVG brand pack in-repo · open-license emoji sets · user uploads → R2 · `CREDITS.md` tracks third-party assets
- **Monorepo:** pnpm workspaces + Turborepo → `apps/bot`, `apps/web`, `packages/core`, `packages/db`, `packages/ui`, `plugins/*`
- **Deploy:** Docker Compose (bot, worker, web, postgres, redis); optional reverse proxy for TLS. Same images for local and cloud.
- **Assets storage:** Cloudflare R2 — transcripts, welcome-card images, CDN

## 4. Architecture (v0.1)

- **bot process:** gateway connection + interaction handling; module loader; per-guild config served from Postgres, cached in Redis.
- **worker process:** BullMQ jobs — ticket transcripts, image rendering (welcome cards), scheduled sends, giveaways, AI jobs.
- **web process:** OAuth2 (identify + guilds) dashboard; API; live streams via SSE; Discord permissions checked per request.
- **Event flow:** gateway → kernel → module handlers; heavy side effects queued; UI state updates via Redis pub/sub.
- **Module contract (sketch):**

```ts
export interface ModuleManifest {
  id: string;                 // "moderation"
  name: string;
  version: string;
  commands?: SlashCommand[];
  events?: EventHandler[];    // gateway listeners
  jobs?: JobDefinition[];     // queued work
  settings?: ZodSchema;       // per-guild config shape
  dashboard?: DashboardPage[];// pages shipped to the web UI
}
```

- **Sharding:** deferred — single process first; shard when needed (~2,500 guilds per Discord policy).

## 5. Modules (v1 targets — all free)

Moderation · Automod · Security (anti-nuke w/ rollback, anti-raid, verification) · Logging · Roles & onboarding (reaction roles, autoroles, welcome) · Leveling · Tickets & modmail · Utility (custom commands, embed builder, scheduled sends, polls, giveaways, reminders, starboard, temp VC) · Fun/economy · **Music** (plugin, Lavalink; legal landscape per research #3) · **AI** (core module: BYO OpenAI-compatible endpoint — chat, summaries, mod-assist)

## 6. Dashboard IA (v0.1)

Servers list → Modules (cards with status + quick toggle) · per-module config pages · Embed Builder · Logs/Audit viewer (live) · Leaderboards & analytics · Settings (bot permissions, backups, export, AI endpoints) · Plugin manager page.

## 7. Roadmap

- ✅ **P0 — Decisions locked** (stack, dashboard-first, all-free, license intent, name)
- 🔜 **P1 — Foundation (in progress):** scaffold landed 2026-10-07 — pnpm workspace, `@mem/core` kernel, bot skeleton + `/ping`, Docker Compose (pg + redis), CI (typecheck green). Remaining: OAuth login wiring + guild picker (dashboard shell now in place). *Done = a test module works end-to-end through the dashboard.*
- **P2 — MVP:** moderation, logging, reaction roles, welcome, automod v1 + dashboard config for each. *Done = daily-driver usable on a real server.*
- **P3 — Community:** leveling, tickets, modmail, custom commands, polls, embed builder.
- **P4 — Security:** anti-nuke rollback, anti-raid, verification, phishing detection.
- **P5 — Plugins & extras:** module SDK docs + example plugin, music, AI, docs site, i18n.
- **P6 — Hosted mode:** optional public bot + SaaS, migration importers (MEE6/Carl/Dyno), launch checklist.

## 8. Open items

1. ✔ **License: MIT** (decided 2026-10-07)
2. **P1 remainder** — Better Auth wiring (needs Discord app creds + Postgres up), OAuth login, guild picker
3. Plugin sandboxing choice — P5
4. SQLite "lite mode" — P5 decision (Postgres stays default)

## 9. Artifacts

- Repo: github.com/Wassuplol/mem (private) · local: `C:\Users\dodia\mem`
- `research/01..06` — six research reports (~150KB) ✔
- `docs/DECISIONS.md` · `docs/MASTER-PLAN.md` (this file)
- `apps/` + `packages/` — P1 scaffold (typecheck green)
