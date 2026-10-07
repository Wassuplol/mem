# Sonion *(working codename — final name TBD)*

A next-generation community-management Discord bot: **Red-DiscordBot-style modularity + an integrated web dashboard + zero paywalls.**

> Goal: beat the field — MEE6 · Dyno · Carl-bot · Wick · YAGPDB

## Core decisions (locked 2026-10-07)
- **TypeScript** end-to-end · bot on **discord.js** · dashboard on **Next.js**
- **PostgreSQL + Redis** · **pnpm monorepo** (`apps/bot`, `apps/web`, `packages/core`)
- **One-command self-host** (Docker Compose, local use) *and* optional cloud hosting
- **Plugin system** — community modules can ship their own dashboard pages
- **Everything free** — no paywalled core features, ever
- **License intent:** clone freely with visible credit; **no monetized clones** (full independent rewrites always allowed). Exact license TBD.

## Status
🚧 **Research phase** — competitive teardowns, platform research and stack notes live in [`research/`](research/). Master plan in `docs/`.

## Planned layout
```
apps/bot        # Discord bot (discord.js, TypeScript)
apps/web        # Web dashboard (Next.js)
packages/core   # Plugin kernel, shared types
packages/db     # Schema + migrations
research/       # Research reports
docs/           # Plans, specs, decisions
```
