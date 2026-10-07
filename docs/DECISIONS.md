# Locked decisions

_2026-10-07 (updated)_

1. **Language:** TypeScript end-to-end.
2. **Bot library:** discord.js (latest).
3. **Dashboard:** integrated web app (Next.js); works self-hosted via Docker Compose (localhost) and hosted in cloud.
4. **Data:** PostgreSQL + Redis (see open questions re SQLite "lite mode").
5. **Repo:** pnpm monorepo — `apps/bot`, `apps/web`, `packages/core` (+ `packages/db`). Plugin/module architecture; modules can ship dashboard pages.
6. **Pricing:** all features free — no premium tiers, ever.
7. **License intent:** cloning allowed with visible credit; no monetizing clones; full independent rewrites always OK. Exact license under research (`research/04-licensing-and-branding.md`).
8. **Deployment:** one-command self-host + optional hosted mode.
9. **Name:** **Mem** (owner pick). Quick checks: minor collisions only — small 2019 top.gg meme bot "Mem", mem.ai notes product, npm `mem` memoize lib (irrelevant: packages stay private). Rename wave (repo, folder, docs) once reports are in.
10. **Infra:** Cloudflare R2 — transcripts, user uploads, asset CDN.
11. **AI (first-class module):** bring-your-own OpenAI-compatible endpoint — base URL + API key + model, configurable per guild (OpenAI, Ollama, LM Studio, OpenRouter, NanoGPT, vLLM, ...). Features: chat, summaries, moderation assist.
12. **Branding & assets:** UI icons = Lucide (MIT; ships with shadcn/ui). Brand logo = original SVG pack designed in-repo. Emoji extras = open-license sets (Twemoji CC-BY / OpenMoji CC BY-SA / Noto Apache-2.0). AI image generation for concept art. All third-party assets tracked in `CREDITS.md`.

## Open questions
- Final license pick (§7). Mem rename wave pending last collision checks (GitHub org, domains).
- Sharding strategy & dashboard auth scope — see `research/03`.
- SQLite "lite mode" for tiny single-node hosts? (Postgres stays default; revisit at P5.)
