# MASTER PLAN — v0.1 *(draft, pending research reports)*

**Working title:** TBD (name brainstorm in progress) · **Date:** 2026-10-07 · **Status:** pre-research-synthesis

> One-liner: The community-management Discord bot done right — Red-style modularity + a first-class web dashboard + everything free + a modern, maintained stack.

---

## 1. Positioning

- **vs MEE6 / Dyno / Carl-bot:** we don't paywall core features — their entire premium feature list ships free in our core.
- **vs Wick:** security suite included (anti-nuke with rollback, anti-raid, verification) — not a subscription.
- **vs YAGPDB:** visual configuration for everything; no arcane command syntax to memorize.
- **vs Red-DiscordBot:** we have a real dashboard, a maintained modern stack, and a plugin SDK that can ship UI.
- **Openness:** source-available — anyone can clone/use/modify with visible credit; no monetized clones. Exact license: research report #4.

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
- **Web:** Next.js 16 + Tailwind + shadcn/ui
- **Data:** PostgreSQL (source of truth) + Redis (cache, BullMQ queues, pub/sub for realtime)
- **Monorepo:** pnpm workspaces + Turborepo → `apps/bot`, `apps/web`, `packages/core`, `packages/db`, `packages/ui`, `plugins/*`
- **Deploy:** Docker Compose (bot, worker, web, postgres, redis); optional reverse proxy for TLS. Same images for local and cloud.
- **Assets:** Cloudflare R2 — transcripts, welcome-card images, CDN

## 4. Architecture (v0.1)

- **bot process:** gateway connection + interaction handling; module loader; per-guild config served from Postgres, cached in Redis.
- **worker process:** BullMQ jobs — ticket transcripts, image rendering (welcome cards), scheduled sends, giveaways, AI jobs.
- **web process:** OAuth2 (identify + guilds) dashboard; API; WebSocket for live logs/stats; Discord permissions checked per request.
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

- **Sharding:** deferred — single process first; shard when needed (research #3 refines thresholds).

## 5. Modules (v1 targets — all free)

Moderation · Automod · Security (anti-nuke w/ rollback, anti-raid, verification) · Logging · Roles & onboarding (reaction roles, autoroles, welcome) · Leveling · Tickets & modmail · Utility (custom commands, embed builder, scheduled sends, polls, giveaways, reminders, starboard, temp VC) · Fun/economy · **Music** (plugin, Lavalink; legal landscape per research #3) · **AI** (plugin: server summaries, mod assist)

## 6. Dashboard IA (v0.1)

Servers list → Modules (cards with status + quick toggle) · per-module config pages · Embed Builder · Logs/Audit viewer (live) · Leaderboards & analytics · Settings (bot permissions, backups, export) · Plugin manager page.

## 7. Roadmap

- ✅ **P0 — Decisions locked** (stack, dashboard-first, all-free, license intent)
- 🔜 **P1 — Foundation:** repo scaffold, core kernel (commands, events, config, module loader), Docker Compose dev env, dashboard skeleton + OAuth + server list, CI. *Done = a test module works end-to-end through the dashboard.*
- **P2 — MVP:** moderation, logging, reaction roles, welcome, automod v1 + dashboard config for each. *Done = daily-driver usable on a real server.*
- **P3 — Community:** leveling, tickets, modmail, custom commands, polls, embed builder.
- **P4 — Security:** anti-nuke rollback, anti-raid, verification, phishing detection.
- **P5 — Plugins & extras:** module SDK docs + example plugin, music, AI, docs site, i18n.
- **P6 — Hosted mode:** optional public bot + SaaS, migration importers (MEE6/Carl), launch checklist.

## 8. Open items (research-dependent)

1. License pick — 2–3 options + recommendation (report #4)
2. Final name + availability (report #6 + chat)
3. Plugin sandboxing level (report #2)
4. Sharding/scale details, message-content intent strategy (report #3)
5. Dashboard kit + UX patterns (report #5)

## 9. Artifacts

- Repo: github.com/Wassuplol/sonion (private; rename when named)
- `docs/DECISIONS.md` — locked calls
- `docs/MASTER-PLAN.md` — this file
- `research/01..06` — research reports (landing soon)
