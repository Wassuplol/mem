# 03 — Discord Platform & Tech Stack State of the Art (October 2026)

*Research date: 2026-10-07. Method: live verification against primary sources — `registry.npmjs.org` (npm dist-tags, Oct 7 2026), GitHub release APIs, raw markdown from `discord/discord-api-docs` (the docs' source of truth), Discord developer support articles, OpenAI/Node/Postgres/Redis official pages. Anything not verified this way is flagged as such. No fabricated version numbers.*

---

## 1. Platform capabilities for bots

**Components v2 (messages) — GA since April 22, 2025, recommended path for new apps.** Messages sent with flag `IS_COMPONENTS_V2` (`1 << 15`) replace `content`/`embeds` with a component layout system: Text Display, Container (accent color, nested children), Section (text + one accessory), Separator, Media Gallery, Thumbnail, File, plus buttons/select menus. Limits: up to 40 total components per message; `poll`/`stickers` disabled on flagged messages; attachments only visible via File components. Legacy `content`+`embeds` messages still work ("legacy component behavior") but are the inferior path for new apps. New in Oct 2026: "component embeds" let *websites* add a `discord:component-embed` JSON to control their link previews in Discord. discord.js has full builder support (`ContainerBuilder`, `TextDisplayBuilder`, etc.); anecdotal community reports suggest adoption is still spotty ("Components V2 is underused", r/Discordjs), i.e. a competitive window: look/feel of v2 UIs can differentiate us from lazy MEE6-style embeds.

**Modals — upgraded Feb 12, 2026.** Three new modal-only components: **Radio Group** (single choice, up to 10 options), **Checkbox Group** (multi-select, min/max values), and **Checkbox** (boolean). They must sit inside a **Label** wrapper; modals allow max 5 top-level components. discord.js ships `LabelBuilder`/`RadioGroupBuilder`/`CheckboxGroupBuilder`/`CheckboxBuilder` (14.26+; current 14.27.0). This removes the classic modal limitation for config wizards (e.g. boolean toggles without abusing selects).

**User-installable apps — GA since June 27, 2024.** Apps can install to users (`USER_INSTALL`) in addition to guilds (`GUILD_INSTALL`); user-installed commands run in servers where the user has access, in bot DMs, and private channels. Command-level `integration_types` and `contexts` (GUILD=0, BOT_DM=1, PRIVATE_CHANNEL=2) control where each command works; user installs only support the `applications.commands` scope; user-installed apps are capped at 5 follow-up messages per interaction; the Application object exposes an approximate user-install count; installs fire an `Application Authorized` **webhook** event (not Gateway). Worth shipping for "use our bot anywhere without adding it to a server" features.

**Embedded Apps / Activities.** Activities are iframe web apps ("single page web apps") using the **Embedded App SDK** (`@discord/embedded-app-sdk` 2.4.0) for client communication — voice/identity/Rich Presence integration, multiplayer instance management, Discord proxy for network calls, iOS/Android support, monetization hooks. High effort, high ceiling; treat as a later flagship module, not V1.

**AutoMod API — mature, stays server-side.** Trigger types: KEYWORD (1), SPAM (3), KEYWORD_PRESET (4), MENTION_SPAM (5), MEMBER_PROFILE (6, checks member bios/profiles). Actions: BLOCK_MESSAGE (with `custom_message` override), SEND_ALERT_MESSAGE, TIMEOUT, BLOCK_MEMBER_INTERACTION (quarantine; MEMBER_PROFILE-only). Limits: 1,000 keywords × 60 chars; 10 regex patterns × 260 chars; mention limit ≤ 50 with `mention_raid_protection_enabled`; SPAM and MENTION_SPAM rules max **1 per guild each**; exempt roles/channels supported. Strategy implication: AutoMod does free, pre-execution filtering; our bot should *manage AutoMod rules via API* and layer its own detection (needs message-content access, see §2) for the gaps (image spam, cross-channel spam, raid heuristics).

**Scheduled events & onboarding.** Guild Scheduled Events are a long-standing API; since **Feb 23, 2026** bots need the `CREATE_EVENTS` permission to create events (`MANAGE_EVENTS` alone is no longer sufficient). Guild Onboarding is exposed via `GET`/`PUT /guilds/{id}/onboarding` (prompts, `enabled`, `mode`), with member flags for started/completed onboarding — usable for "server setup wizard" features our dashboard can surface.

**Other 2026 platform changes that touch a moderation bot:** a **Search Guild Messages** endpoint (Mar 19, 2026; requires `READ_MESSAGE_HISTORY` + approval-gated `MESSAGE_CONTENT`); message forwarding now requires message-content access (Apr 14, 2026); **channel obfuscation mandatory Nov 16, 2026** — bots stop receiving names/metadata for unviewable channels (`"___hidden___"`, CHANNEL_OBFUSCATED flag, omitted from HTTP listing) — a breaking change for "audit the whole server" features; **`shard` param required** on `GET /users/@me/guilds` under large-bot sharding (Sep 15, 2026); age-assurance rollout (Sep 22, 2026 — apps keep working).

## 2. Policies & scale

**Verification (required past 100 servers).** Developer Portal → **App Verification** tab shows a checklist; when green, click "Verify App". Hard requirement: the **team owner verifies identity through Stripe**. Verification unlocks scaling past 100 servers and precedes privileged-intent review. Community sources say submission is possible from ~75 servers — not confirmed by the support article (see Confidence).

**Message Content / privileged intents — big June 2026 change.** As of **June 10, 2026**, the review threshold moved from *100 servers* to **10,000 unique users** (users who can see the app across all its servers). Below 10k, all three privileged intents (Message Content, Guild Members, Guild Presences) are self-serve toggles. At 10k+: apply within **90 days** (app keeps working and joining servers during review); grants now require **annual re-application**. Message Content approval requires a specific, documented use case that *requires* reading content — automod/filters and passive-analysis features are approvable; "prefix commands"/"better UX" style justifications get rejected. How big moderation bots get it: verified app + documented automod/logging/AI use cases + intents enabled only where needed + compliance artifacts (ToS/privacy) ready; rejections are a known industry pain (a Jul 2026 write-up documents three rejections for a 190k-member bot).

**Rate limits (documented best practice).** Global limit: **50 requests/second per bot** (applied per IP without auth); **interaction endpoints are exempt** from the global bot limit — interactions-heavy slash-command bots get slack for free. Per-route buckets are identified by `X-RateLimit-Bucket`; apps must **not hardcode limits** — parse `X-RateLimit-*` headers and `Retry-After`/`retry_after`, and back off per bucket. Cloudflare "invalid request" limit: **10,000 invalid requests per 10 minutes per IP** (invalid = 401/403/429) → temporary bans; large apps (~16-17 rps sustained) should log/track invalid-request rates. 429s with `X-RateLimit-Scope: shared` don't count against you. General route limits may vary per endpoint.

**Sharding.** Hard rule: **each shard supports max 2,500 guilds; sharding is mandatory at 2,500+ guilds**. Routing: `shard_id = (guild_id >> 22) % num_shards`; guild-less events (DMs, entitlements) go to **shard 0**. Start shards respecting `max_concurrency` buckets (rate-limit key = `shard_id % max_concurrency`) and never exceed **1,000 IDENTIFYs per 24h globally** (breach = all sessions terminated + token reset). `GET /gateway/bot` returns the recommended shard count. In discord.js: (a) **ShardingManager** — spawns one child process/worker per shard on one machine, easiest; (b) **internal sharding** — multiple WebSocket connections from one process via Client options; (c) custom multi-machine — pass explicit shard options per container / use `@discordjs/ws` (2.0.4) directly, the low-level gateway library discord.js itself is built on. The discord.js guide recommends *starting sharding work around ~2,000 guilds* and roughly ~1,000-2,500 guilds per shard. **Cross-shard state patterns:** shared PostgreSQL as the single source of truth; Redis pub/sub as an inter-shard event bus (not `broadcastEval`, which serializes across processes and is painful in hot paths); singleton background jobs (giveaways, scheduled posts) guarded by a Redis lock so exactly one shard runs them; the dashboard reads/writes the DB and never queries shards directly. Design every module shard-agnostic from day one (never assume a user and their guild are on the same shard).

## 3. Monetization rules (Developer Policy)

- **Ads: not allowed.** The Developer Policy: "Do not target users with advertisements or marketing"; no sharing API data with ad networks/data brokers; no selling/licensing/commercializing API data or Discord services.
- **Premium features: allowed, but Discord-first.** Via **Premium Apps** (SKUs — one-time durable/consumable or subscriptions; Entitlements; purchase flows in-app). Eligibility: verified app owned by a team, owner 18+, 2FA, ToS link, payouts configured. Since Oct 7, 2024: where Discord supports monetization, developers offering paid features **must also sell them through Discord's Premium Apps at prices no higher than elsewhere**.
- Our project is all-free + source-available, so this is a constraint checklist: no ads ever, no data monetization; if we ever charge for anything (e.g. managed hosting), Premium Apps routing may become mandatory in supported regions. Donations are a grey area — legal review item, not V1.

## 4. Music landscape (2026 reality)

**Stack:** Lavalink **4.2.2** (Mar 2026); YouTube support lives in the separate **youtube-source** plugin (**1.18.2**, Jul 27, 2026) — the built-in YouTube source is deprecated and off by design. **LavaSrc 4.8.3** (May 2026) adds Spotify (metadata + mirroring to a playable source), Apple Music, Deezer, Yandex, VK.

**YouTube situation 2025-2026:** YouTube bans whole **datacenter ASNs** (Hetzner, OVH, Oracle Cloud, etc.), producing "Sign in to confirm you're not a bot" / "This video requires login" / 403s. Workarounds in use: **poToken + visitorData** (helps non-banned IPs; IP-bound, must refresh); **OAuth with a burner Google account + the TV client** (works from datacenter IPs; against YouTube ToS in spirit — accounts risk flagging/termination — and YouTube has periodically broken it; plugin regressions like the 1.18.1→1.18.2 TV/403 issue show the arms race); **remote cipher servers** (e.g. kikkia/yt-cipher, public instance `cipher.kikkia.dev`) for player-signature parsing; **IPv6 rotation** via Lavalink's route planner; **residential proxies** as the last resort. Practical posture: treat YouTube as best-effort. Default to SoundCloud + Spotify-link metadata mirroring; ship a documented self-host OAuth path for operators who insist on YouTube; log `TrackExceptionEvent`s and surface per-guild toggles.

**Voice encryption — DAVE is mandatory now.** Discord enforces the DAVE E2EE protocol on (non-stage) voice; clients without it get close code **4017**. Use a DAVE-capable stack: **@discordjs/voice 0.19.x** (bundles `@snazzah/davey`, needs **Node ≥ 22.12**; 0.19.2 current). Many music bots broke/rewrote over this. Working examples today: **Lavamusic** (discord.js + lavalink-client, Docker, active), **WaveMusic** (Shoukaku), assorted self-host templates (BeatDock etc. — note public Lavalink nodes "manage their own tokens" and are constantly YouTube-blocked; a private node is the reliable path). JMusicBot (Java) went through an OAuth/poToken crisis and development limbo — evidence that the OSS music niche is fragile without a maintained node.

## 5. AI integration & costs

**Moderation / toxicity:**
- **Google Perspective API is sunsetting** — no new key/quota requests since Feb 2026, service ends Dec 31, 2026. Do not build on it.
- **OpenAI Moderation API** (`omni-moderation-latest`, text+image, no audio) is **free** to use; its rate limits scale with your account usage tier (Free tier: 250 RPM / 5,000 RPD; Tier 1: 500 RPM / 10k RPD; up to Tier 5: 5,000 RPM / 500k RPD). Free ≠ unconstrained: sustained multi-thousand-RPM scanning requires tier progression (spend history), so a big bot should either selectively scan (keyword-hit, suspicious signals) or self-host.
- Self-hosted: Llama Guard 3/4 via vLLM/Ollama, or Detoxify — zero marginal cost, some GPU bill; good fallback posture.

**Chatbot models & realistic pricing (OpenAI, per 1M tokens, list price Oct 2026):** `gpt-5-nano` $0.05/$0.40; `gpt-6-luna` $0.10/$0.50; `gpt-5-mini` $0.25/$2.00; `gpt-5.4-mini` $0.75/$4.50; cached input ≈ 10× cheaper; batch ≈ 50% off. **Scenario (estimate/assumption):** 10k servers, 10% use AI chat, ~200 msgs/day each → 200k msgs/day at ~700 in / 150 out tokens → 140M in + 30M out tokens/day. Cost/day: gpt-5-nano ≈ **$19**; gpt-6-luna ≈ **$29**; gpt-5-mini ≈ **$95** (≈$2,900/mo) — before caching (~10× cheaper input). Implications: default to a nano/luna-class model, enable caching, hard per-guild quotas, BYO-API-key mode. Gate this module; free unlimited AI chat burns money fastest.

## 6. Deployment & ops

**How large public bots host, in practice:** VPS + Docker is the industry default (Hetzner/OVH/DO classes); **Pterodactyl** remains the standard panel used by budget bot-hosting providers (still maintained; widely used for discord.js "eggs"); Kubernetes appears only at genuine multi-region scale (not needed until we run many shards across regions). For our project: a single **Docker Compose** reference stack — `bot`, `web` (Next.js), `postgres`, `redis`, `lavalink`, optional `yt-cipher` sidecar, reverse proxy (Caddy/Traefik) — is the right self-host story; compose profiles toggle modules (music, AI). Best practices worth encoding: multi-stage builds with pnpm + frozen lockfile; run as non-root with an init (tini/dumb-init); healthchecks per service; explicit memory limits (Lavalink JVM heap especially); named volumes for PG/Redis data; secrets via env/secret files; pinned image digests; automated nightly `pg_dump` + restore test. **Node base image: pin an explicit major** (`node:24-*` today, move to `node:26-*` after Oct 28) — floating `node:lts`/`node:current` tags flip on their own this month.

**Observability:** Sentry Node SDK **11.4.0** (errors/perf; free dev tier); OpenTelemetry JS (api 1.9.1, sdk-node 0.223.0 — 0.x is normal) via OTLP; Prometheus + Grafana for shard-level metrics (gateway ping, 429s per bucket, queue depths, Lavalink exceptions); pino (10.4.0) for structured logs. Alert on shard disconnects, 429 spikes, node downtime, and invalid-request rate (stay far below 10k/10min).

## 7. Dashboard realtime & auth

- **Realtime pattern: SSE first, WebSocket when needed.** Use **Server-Sent Events** for one-way server→browser pushes (guild config changes, module toggles, queue/status feeds, live logs) — trivial with Next.js route handlers returning a `ReadableStream`, survives proxies, auto-reconnects. Use **WebSocket** only where the browser must push interactively (live editors, chat bridges, collaborative views). Either way the source of truth is **Redis pub/sub** (bot publishes "guild X changed"; dashboard API subscribes and fans out). Mutations go over normal HTTP/Server Actions — don't tunnel writes through the realtime channel. Never proxy a Discord gateway connection into the browser.
- **Discord OAuth2 scopes for a dashboard:** `identify` (user object) + `guilds` (list user's guilds) are the core pair; add `email` only if account emails are needed, `guilds.join` only for a "join our server" flow, `guilds.members.read` for per-user member data. Verify the user's `MANAGE_GUILD`-style permissions from `/users/@me/guilds` before showing server settings. Watch the Sep 2026 requirement: with large-bot sharding, `GET /users/@me/guilds` requires the `shard` query param.
- **Auth stack:** **Auth.js v5 is still beta** (`next-auth@5.0.0-beta.32`, Jul 20, 2026; `next-auth@4.24.15` remains "latest" on npm; v5 has been in beta for 3+ years and *is* the actively-used production line per maintainers, with periodic breaking changes → pin exact versions). Alternatives: **Better Auth 1.7.7** (fast-growing in 2026, stable semver, has a Discord provider) or Clerk (paid). Either Auth.js v5 or Better Auth works for us; if avoiding beta tags matters, Better Auth is the honest choice. **Next.js 16** (GA Oct 21, 2025; current line 16.4.0) is the base: Turbopack default (webpack builds fail unless `--webpack`), `middleware.ts` → `proxy.ts` rename, Cache Components/`use cache` opt-in, async request APIs mandatory; stay ≥ 16.2.6 for the May 2026 security batch.

## Current versions (verified 2026-10-07)

| Component | Version (verified) | Source of truth |
|---|---|---|
| Node.js | **24.x = Active LTS until Oct 20, 2026; 26.x becomes Active LTS Oct 28** (22.x EOL Apr 2027) | nodejs.org release schedule |
| TypeScript | **7.0.2** (Go-native compiler, GA Jul 8, 2026) | npm dist-tag |
| discord.js | **14.27.0** (Jul 15, 2026); v15 dev-only builds exist, no stable release | npm + GitHub releases |
| @discordjs/ws | **2.0.4** | npm |
| @discordjs/voice | **0.19.2** (DAVE E2EE; needs Node ≥ 22.12) | npm + discord.js changelog |
| @discord/embedded-app-sdk | 2.4.0 | npm |
| Next.js | **16.4.0** (16 GA 2025-10-21; Turbopack default) | npm |
| React | 19.3.0 | npm |
| next-auth (Auth.js v5) | **beta: 5.0.0-beta.32**; stable line 4.24.15 | npm dist-tags |
| Better Auth | 1.7.7 | npm |
| @auth/core | 0.41.3 | npm |
| PostgreSQL | **18.6** (Aug 13, 2026); 19 beta 4 out, GA expected Oct 2026 | postgresql.org |
| Redis (OSS) | 8.6.x line (8.2 GA Aug 2025; 8.6.2 current per Redis releases) | redis.io release notes |
| pnpm | 12.9.1 | npm |
| Prisma | 7.10.0 stable; 8.0.0-rc.20 on `latest` tag (RC!) | npm dist-tags |
| Drizzle ORM | 0.45.3 | npm |
| Lavalink | **4.2.2** (Mar 6, 2026) | GitHub releases |
| youtube-source plugin | **1.18.2** (Jul 27, 2026) | GitHub releases |
| LavaSrc plugin | 4.8.3 (May 22, 2026) | GitHub releases |
| Sentry (Node) | 11.4.0 | npm |
| OpenTelemetry JS | api 1.9.1 / sdk-node 0.223.0 | npm |
| pino | 10.4.0 | npm |
| Zod | 4.6.5 | npm |

## Implications for our build (concrete)

1. **Runtime:** pin **Node 24** in Dockerfiles/CI today; schedule the Node 26 bump for after Oct 28, 2026. Pin explicit major tags (no `node:lts` floating tags — they flip this month). Voice features require ≥ 22.12 anyway.
2. **Discord library:** **discord.js 14.27.0 + @discordjs/ws 2.0.4**; do not wait for v15 (dev builds only). Build UI **Components-v2-first** (Container/TextDisplay/Section) with legacy fallback for edge cases; use the new modal components (Label/RadioGroup/Checkbox) for config flows — this alone will out-polish competitors stuck on embeds.
3. **Intents strategy:** start with non-privileged (Guilds, GuildModeration, GuildMembers*, voice/message/reaction intents as modules need). Plan from day zero for **Message Content** justification (automod, logging, AI) with a privacy policy + ToS; keep a compliance folder for the verification + intent reviews. Expect **annual re-application** once granted. Never request Presence.
4. **Scale path:** single process until ~2k guilds; then built-in **ShardingManager** (process/worker per shard, `totalShards: 'auto'`); adopt **Redis pub/sub** as the inter-shard bus and Postgres as shared state from the beginning; only move to multi-machine sharding (custom shards via Client options or `@discordjs/ws`) when a single box can't hold shards. Honor `max_concurrency` buckets, IDENTIFY budget, and the large-bot `shard` param requirement for the dashboard.
5. **Verification:** prepare the portal checklist early (team, 2FA, ToS/privacy pages, Stripe-ready owner) — it gates growth past 100 servers and intent review.
6. **Music module:** optional plugin shipped as its own containers (Lavalink + youtube-source 1.18.2 + LavaSrc 4.8.3 + optional yt-cipher). SoundCloud-first + Spotify metadata mirroring; YouTube via documented self-host OAuth (burner account) only; DAVE-compliant voice via @discordjs/voice 0.19.2. Budget for periodic breakage; log track exceptions per guild.
7. **AI module:** moderation via `omni-moderation-latest` (free, tier-capped) + local rules; chatbot with BYO-key + quotas and a nano/luna-class default (~$19-29/day at 10k-server scenario, less with caching). Never Perspective. This module is pure differentiator with a real cost curve — gate it behind per-guild quotas.
8. **Ops:** Docker Compose reference stack (bot/web/pg/redis/lavalink/proxy); Sentry 11 + OTel + Prometheus/Grafana + pino; alert on shard disconnects, 429s and invalid-request rates. Pterodactyl/k8s are not needed for the flagship deployment; keep the Compose story first-class for self-hosters.
9. **Dashboard:** Next.js 16.4 (App Router, proxy.ts naming), Auth.js v5 (pin beta versions) or Better Auth 1.7.7 with the Discord provider; scopes `identify`+`guilds` (+`email` optional); SSE for live updates with a Redis pub/sub bridge; Server Actions for writes.
10. **Monetization:** everything free; no ads (policy-prohibited); no API-data commercialization. Document this stance in README (aligns with source-available "no monetized clones" license).

## Sources

Primary (verified during this research):
- Discord changelog, 2024-2026 entries (Components v2; user-install GA; modal components; Search Guild Messages; channel obfuscation; shard param; age assurance) — https://discord.com/developers/docs/change-log + raw mdx at github.com/discord/discord-api-docs
- Components reference — https://discord.com/developers/docs/components/reference
- User-installable apps tutorial — https://discord.com/developers/docs/tutorials/developing-a-user-installable-app
- Activities overview — https://discord.com/developers/docs/activities/overview; SDK — https://www.npmjs.com/package/@discord/embedded-app-sdk
- AutoModeration resource — https://docs.discord.com/developers/resources/auto-moderation; AutoMod FAQ — https://support.discord.com/hc/en-us/articles/4421269296535
- Gateway & sharding — https://discord.com/developers/docs/events/gateway
- Rate limits — https://discord.com/developers/docs/topics/rate-limits
- OAuth2 scopes — https://discord.com/developers/docs/topics/oauth2
- Privileged Intent review guide — https://docs.discord.com/developers/gateway/getting-started-with-privileged-intent-review
- Priv-intent threshold change (Jun 2026) — https://support-dev.discord.com/hc/en-us/articles/40281523410967; https://support-dev.discord.com/hc/en-us/articles/6207308062871
- App verification — https://support-dev.discord.com/hc/en-us/articles/23926564536471
- Developer Policy — https://discord.com/developers/docs/policy; Monetization — https://discord.com/developers/docs/monetization/overview; https://docs.discord.com/developers/monetization/enabling-monetization
- discord.js guide (sharding, modals, display components) — https://discordjs.guide/sharding; https://discordjs.guide/guide/interactions/modals
- npm registry dist-tags (discord.js, next, typescript, @discordjs/ws, @discordjs/voice, next-auth, @auth/core, prisma, sentry, otel, pino, zod, pnpm, better-auth, drizzle-orm) — https://registry.npmjs.org
- GitHub releases: Lavalink 4.2.2, youtube-source 1.18.2, LavaSrc 4.8.3, discord.js 14.27.0 — github.com repositories
- youtube-source README (OAuth/poToken/clients) — https://github.com/lavalink-devs/youtube-source
- Node.js release schedule / model change — https://nodejs.org/en/blog/announcements/evolving-the-nodejs-release-schedule; https://github.com/nodejs/Release
- PostgreSQL releases/roadmap — https://www.postgresql.org/; https://www.postgresql.org/developer/roadmap/
- Redis release notes — https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/release-notes/redisce/redisos-8.2-release-notes/
- OpenAI pricing & moderation — https://developers.openai.com/api/docs/pricing; https://developers.openai.com/api/docs/guides/moderation
- Perspective API sunset — https://www.perspectiveapi.com/
- TypeScript 7 announcement — https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/
- Next.js 16 — https://nextjs.org/blog/next-16
- Vercel/Discord help pages as cited inline

Secondary (flagged, used for context only): JMusicBot issue threads on YouTube blocking (github.com/jagrosh/MusicBot#1588), DAVE ecosystem snapshot (github.com/sessionhelper/sessionhelper-hub), community sharding discussions (discordjs deepwiki), Pterodactyl (pterodactyl.io).

## Confidence & gaps

**High confidence:** all version numbers (read directly off npm/GitHub APIs on Oct 7, 2026); Components v2 semantics & limits, AutoMod limits, rate-limit numbers (50 rps, 10k invalid/10min), sharding rules (2,500/shard, mandatory), 10k-user privileged-intent threshold + annual reapply, verification requiring Stripe identity, monetization policy language, OpenAI moderation free/tier limits, Perspective sunset, Node/PG/Redis release states, DAVE requirement & @discordjs/voice 0.19.x support.

**Medium confidence / flagged:**
- The "~75 servers" verification-application floor is from community sources, not the support article (portal checklist is the primary path).
- Exact DAVE enforcement date for non-stage voice is from third-party snapshots (2026-03-02); by now it is simply mandatory. `@discordjs/voice` 0.19.x had DAVE-era receive-path bugs per one snapshot — verify the issue tracker before shipping voice receive (we're mostly send-side, lower risk).
- Prisma's npm `latest` tag currently points at an 8.0 RC — pin Prisma 7.10 or use Drizzle 0.45 until 8.0 GA. Redis 8.6.x detail comes from Redis Software compatibility tables; verify on redis.io/download before pinning.
- Verification/intent-review timelines and pass rates are anecdotal (Discord doesn't publish them).

**Gaps to close later:** in-portal App Verification checklist items; any Components-v2 adoption stat (none found); Pterodactyl's current release; large-bot hosting benchmarks (no public source); per-shard memory footprints (self-measure); YouTube OAuth viability (recheck at build time); Auth.js v5 vs Better Auth (spike both).
