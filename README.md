# Mem

A next-generation community-management Discord bot — **your server's memory** 🧠 — Red-DiscordBot-style modularity + an integrated web dashboard + zero paywalls.

> Goal: beat the field — MEE6 · Dyno · Carl-bot · Wick · YAGPDB. See [`research/`](research/) for the receipts.

*(Bootstrapped under the codename "sonion" on 2026-10-07; renamed to **Mem** the same day.)*

## Core decisions (locked)
- **TypeScript** end-to-end · **discord.js** bot · **Next.js** dashboard
- **PostgreSQL + Redis** · **pnpm monorepo** (`apps/bot`, `apps/web`, `packages/core`)
- **One-command self-host** (Docker Compose) *and* optional cloud hosting
- **Plugin system** — community modules can ship their own dashboard pages
- **AI built-in** — bring-your-own OpenAI-compatible endpoint (chat, summaries, mod-assist)
- **Everything free** — no paywalled core features, ever
- **License (proposed):** FSL-1.1-MIT + trademark — clone freely with credit; no monetized clones; every release becomes MIT after 2 years
- **Branding:** UI icons = Lucide; original SVG brand pack in-repo; open-license emoji sets; user uploads → Cloudflare R2

## Status
🛠️ **P1 — foundation scaffold:** `@mem/core` kernel (module contract + registry), bot skeleton with a working `/ping` module, Docker Compose (Postgres 18 + Redis 8), CI with typecheck. Six research reports in [`research/`](research/); master plan in [`docs/MASTER-PLAN.md`](docs/MASTER-PLAN.md).

## Quick start
```bash
pnpm install
cp .env.example .env   # fill in DISCORD_TOKEN + DISCORD_APP_ID
pnpm infra:up          # Postgres + Redis via Docker
pnpm dev:bot           # bot login (+ instant /ping in your dev guild)
```

## Layout
```
apps/bot        # Discord bot (discord.js, TypeScript)
apps/web        # Web dashboard (Next.js) — P1 next
packages/core   # kernel: module contract, registry, shared types
packages/db     # schema + migrations — P2
research/       # 6 research reports (2026-10-07)
docs/           # DECISIONS.md · MASTER-PLAN.md
```
