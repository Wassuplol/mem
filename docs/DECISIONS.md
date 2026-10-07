# Locked decisions

_2026-10-07 (updated post-research)_

1. **Language:** TypeScript end-to-end.
2. **Bot library:** discord.js (latest — 14.27.0 installed).
3. **Dashboard:** integrated web app (Next.js); works self-hosted via Docker Compose (localhost) and hosted in cloud.
4. **Data:** PostgreSQL + Redis; ORM: **Drizzle** (chosen 2026-10-07). (see open questions re SQLite "lite mode")
5. **Repo:** pnpm monorepo — `apps/bot`, `apps/web`, `packages/core` (+ `packages/db`). Plugin/module architecture; modules can ship dashboard pages.
6. **Pricing:** all features free — no premium tiers, ever.
7. **License:** **MIT** (owner call, 2026-10-07) — fully permissive; forks may even monetize; must keep the copyright notice. Name/logo not covered (brand reserved). Supersedes the earlier FSL/PolyForm discussion.
8. **Deployment:** one-command self-host + optional hosted mode.
9. **Name:** **Mem** — renamed 2026-10-07. Repo: github.com/Wassuplol/mem · folder: C:\Users\dodia\mem. Known collisions (all non-blocking): mem.ai product, tiny 2019 top.gg bot, npm `mem` lib.
10. **Infra:** Cloudflare R2 — transcripts, user uploads, asset CDN.
11. **AI (first-class module):** bring-your-own OpenAI-compatible endpoint — base URL + API key + model, configurable per guild (OpenAI, Ollama, LM Studio, OpenRouter, NanoGPT, vLLM, ...). Features: chat, summaries, moderation assist.
12. **Branding & assets:** UI icons = Lucide (MIT; ships with shadcn/ui). Brand logo = original SVG pack designed in-repo. Emoji extras = open-license sets (Twemoji CC-BY / OpenMoji CC BY-SA / Noto Apache-2.0). AI image generation for concept art. Third-party assets tracked in `CREDITS.md`.

## Research takeaways (applied 2026-10-07)

- **Auth:** Better Auth 1.7.x (Auth.js v5 still beta). — `research/03`, `05`
- **Realtime:** SSE-first for dashboard streams. — `research/03`
- **AI moderation:** OpenAI omni-moderation (Perspective API EOL Dec 31, 2026). — `research/03`
- **Scale:** sharding not needed until ~2,500 guilds; privileged-intent review gates at 10k users. — `research/03`
- **Music (P5):** Lavalink + youtube-source; datacenter-ASN restrictions; DAVE E2EE mandatory. — `research/03`
- **Dashboard kit:** shadcn/ui + Recharts + Better Auth + @melloware/react-logviewer; avoid Tremor (frozen) and old discord-dashboard libs. — `research/05`
- **Adoption wedge:** importer for MEE6/Carl/Dyno configs & XP. — `research/01`
- **Plugin sandboxing (P5):** not vm2 (escaped, CVE-2026); options: isolated-vm / Deno subprocess / WASM. — `research/02`
- **Market:** free-first bots top the ratings (Sapphire 1.85M servers, 96/100); incumbents bleed users over paywalls & paywalled tickets. — `research/01`
- **Tooling:** pnpm 11 requires build-script approvals via `allowBuilds` in `pnpm-workspace.yaml` (esbuild approved).

## Open questions
- SQLite "lite mode" for tiny single-node hosts? (Postgres stays default; revisit at P5.)
- Plugin sandboxing level — decided at P5.
- OAuth wiring needs: Mem Discord app (client id/secret) + Postgres running.
