# Locked decisions

_2026-10-07_

1. **Language:** TypeScript end-to-end.
2. **Bot library:** discord.js (latest).
3. **Dashboard:** integrated web app (Next.js); works self-hosted via Docker Compose (localhost) and hosted in cloud.
4. **Data:** PostgreSQL + Redis.
5. **Repo:** pnpm monorepo — `apps/bot`, `apps/web`, `packages/core` (+ `packages/db`). Plugin/module architecture; modules can ship dashboard pages.
6. **Pricing:** all features free — no premium tiers, ever.
7. **License intent:** cloning allowed with visible credit; no monetizing clones; full independent rewrites always OK. Exact license under research (see `research/04-licensing-and-branding.md` when ready).
8. **Deployment:** one-command self-host + optional hosted mode.
9. **Name:** TBD — brainstorm in progress (see `research/06-naming-candidates.md`).
10. **Infra available:** Cloudflare R2 (free tier) — candidate for transcripts / asset storage / CDN later.

## Open questions
- Final license pick (§7) and final name (§9).
- Sharding strategy & dashboard auth scope — see `research/03`.
