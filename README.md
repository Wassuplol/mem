# Mem

A next-generation community-management Discord bot — **your server's memory** 🧠 — Red-DiscordBot-style modularity + an integrated web dashboard + zero paywalls.

> Goal: beat the field — MEE6 · Dyno · Carl-bot · Wick · YAGPDB

*(Name: **Mem** — owner pick 2026-10-07. Repo/folder rename wave in progress; some paths may still say "sonion".)*

## Core decisions (locked 2026-10-07)
- **TypeScript** end-to-end · bot on **discord.js** · dashboard on **Next.js**
- **PostgreSQL + Redis** · **pnpm monorepo** (`apps/bot`, `apps/web`, `packages/core`)
- **One-command self-host** (Docker Compose, local use) *and* optional cloud hosting
- **Plugin system** — community modules can ship their own dashboard pages
- **AI built-in** — bring-your-own OpenAI-compatible endpoint (chat, summaries, mod-assist)
- **Everything free** — no paywalled core features, ever
- **License intent:** clone freely with visible credit; **no monetized clones** (full independent rewrites always allowed). Exact license TBD.
- **Branding:** UI icons = Lucide; original SVG brand pack in-repo; open-license emoji sets; user uploads → Cloudflare R2

## Status
🚧 **Research phase wrapping** — six research reports live in [`research/`](research/). Master plan in [`docs/MASTER-PLAN.md`](docs/MASTER-PLAN.md).

## Planned layout
```
apps/bot        # Discord bot (discord.js, TypeScript)
apps/web        # Web dashboard (Next.js)
packages/core   # Plugin kernel, shared types
packages/db     # Schema + migrations
research/       # Research reports (01..06)
docs/           # Plans, specs, decisions
```
