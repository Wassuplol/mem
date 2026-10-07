# Hosting Mem for free (2026 edition)

Mem is built to run anywhere Docker runs. This guide covers the genuinely-free options,
ranked by how well they fit a 24/7 Discord bot + dashboard + Postgres + Redis.

## TL;DR

| Rank | Option | What you get | Catch |
| --- | --- | --- | --- |
| 🥇 | **Oracle Cloud Always Free** | 1 ARM VM (2 OCPU / 12 GB RAM / 200 GB disk) — runs the **entire** stack via `docker compose` | Signup can be grumpy ("out of host capacity"); you manage Linux yourself |
| 🥈 | **Northflank (Developer Sandbox)** | 2 always-on services + 1 database + 2 cron jobs — no sleeping | 0.2 vCPU / 512 MB per service (fine for the bot; tight for Postgres+Redis) |
| 🥉 | **Split free stack** | Neon (Postgres) + Upstash (Redis) + any free host for bot/web | More moving parts, external latency on every query |
| ⚠️ | Render free / Railway trial | Quick to try | Render sleeps after 15 min + free DB **expires in 30 days**; Railway is a one-time $5 credit |
| ❌ | Fly.io / Koyeb free | — | Fly killed its free tier (Oct 2024); Koyeb closed free signups (acquired by Mistral AI, 2026) |

## 🥇 Oracle Cloud Always Free — recommended

One VM runs **everything**: bot, dashboard, Postgres, Redis. Zero cost, forever, no sleeping.

1. Sign up at <https://signup.cloud.oracle.com> (credit card required for identity check, never charged).
2. **Compute → Instances → Create instance.**
   - Shape: **Ampere → VM.Standard.A1.Flex** — assign all 2 OCPU / 12 GB.
   - Image: **Ubuntu 24.04** (ARM).
   - Paste your SSH public key.
3. If you get *"out of host capacity"*: try another availability domain, or retry in a few hours. It is temporary, not a rejection.
4. Open the firewall for the dashboard (bot needs no inbound ports):
   ```bash
   # In Oracle: Networking → VCN → Security Lists → add ingress 0.0.0.0/0 TCP 3000
   # On the VM (Ubuntu images ship iptables rules):
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
   sudo netfilter-persistent save
   ```
5. Install Docker and deploy:
   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER && newgrp docker
   git clone https://github.com/Wassuplol/mem.git && cd mem
   cp .env.example .env   # fill in DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, BETTER_AUTH_SECRET
   docker compose up -d
   ```
6. Set `BETTER_AUTH_URL=http://<vm-ip>:3000` in `.env` and add the matching OAuth2 redirect
   (`http://<vm-ip>:3000/api/auth/callback/discord`) in the Discord Developer Portal.

The ARM VM handles this stack with enormous headroom (the bot idles around 60-100 MB).

## 🥈 Northflank Developer Sandbox — managed alternative

Always-on free compute, no credit card for the sandbox, Git-based deploys.

1. Sign up at <https://northflank.com> → **Developer Sandbox** (2 services, 1 database, 2 cron jobs).
2. Create a **PostgreSQL** database from the sandbox add-ons.
3. Create two services from the GitHub repo:
   - **bot** — build from `apps/bot` (or a Dockerfile), start command: `pnpm --filter @mem/bot start`, env: `DISCORD_TOKEN`, `DATABASE_URL` (from the add-on), `DISCORD_CLIENT_ID`.
   - **web** — `apps/web`, start: `pnpm --filter @mem/web start`, env: `DATABASE_URL`, `DISCORD_CLIENT_ID/SECRET`, `BETTER_AUTH_URL` (public URL), `BETTER_AUTH_SECRET`.
4. Skip Redis on the free plan (Mem only uses it for future features; the bot runs fine without it).

## 🥉 Split free stack — serverless-ish

| Piece | Free service | Limits |
| --- | --- | --- |
| Postgres | [Neon](https://neon.tech) | 0.5 GB storage, autosuspend |
| Redis | [Upstash](https://upstash.com) | 10K commands/day, 256 MB |
| Bot host | Northflank service / Oracle VM | see above |
| Web | Vercel Hobby | personal projects, serverless |

Only worth it if you already have a Vercel/Neon account. The single-VM Oracle setup is simpler
and has no cold starts anywhere in the stack.

## Notes

- **Memory floor**: Mem's bot targets ~50-100 MB RSS; Postgres+Redis add ~150-250 MB. Any option above fits.
- **Uptime**: Discord gateways reconnect automatically; the durable scheduler (tempbans, giveaways) survives restarts because every pending task lives in Postgres.
- **Scaling out**: past ~2,500 guilds you shard the bot; the kernel already loads modules lazily, and all state is external (Postgres/Redis), so nothing blocks sharding later.
