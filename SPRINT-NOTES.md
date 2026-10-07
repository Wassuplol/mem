# Mem - autonomous build sprint (2026-10-07, ~15:20-19:00 Istanbul)

The owner is away until ~19:00 local. Hermes runs continuation sessions via cron
(every ~60 min, 3 runs: ~16:20 / 17:20 / 18:20 local; the last one = wrap-up report).

## Ground rules for every run
1. Read this file first, then `git log --oneline -10` to see what landed.
2. Pick the next unchecked backlog batch (1-2 items that fit one session). Keep quality high.
3. Keep the repo green: `pnpm -r typecheck` MUST pass; run smokes for DB changes.
4. Commit + push every batch (recipe below). Do not break `auth-smoke` / `mod-smoke`.
5. Update this file: tick checkboxes + append a line to the Run log.
6. Final response = SHORT Discord progress message (what shipped, what is next).
   The last run (~18:20 local / 15:20 UTC) = comprehensive wrap-up instead.

## Push recipe
```bash
cd /c/Users/dodia/mem
git add -A && git commit -m "<message>"
TOKEN=$(grep '^MCP_GITHUB_API_KEY=' "$HOME/AppData/Local/hermes/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d '\r')
GIT_TERMINAL_PROMPT=0 git -c credential.helper= push "https://x-access-token:${TOKEN}@github.com/Wassuplol/mem.git" main
```

## Verify commands
- typecheck: `pnpm -r typecheck`
- migrations: `pnpm --filter @mem/db exec drizzle-kit generate && pnpm --filter @mem/db exec drizzle-kit migrate`
- db smoke: `pnpm --filter @mem/db exec tsx scripts/mod-smoke.ts`
- bot boot smoke (expect a `N command(s) ...` line, then clean missing-token exit):
  `cd /c/Users/dodia/mem && env -u DISCORD_TOKEN pnpm --filter @mem/bot exec tsx src/index.ts`
- web build: `pnpm --filter @mem/web build`

## Environment state
- Docker Desktop RUNNING; `docker compose up -d postgres redis` already up (both healthy). Do not stop them.
- Root `.env` is filled (Discord creds, BETTER_AUTH_SECRET). NEVER commit `.env`.
- Automation Chrome (CDP 9222) may be running - leave it alone; do not touch the main Chrome.
- The shell env injects a `DISCORD_TOKEN` belonging to Hermes itself - always use `env -u DISCORD_TOKEN` for bot tests.

## What already exists (do not rebuild)
- Kernel `@mem/core` (`defineModule`, registry) | DB `@mem/db` (guilds, settings, mod_cases, auth tables + services + smokes)
- Bot: env/config/embed/permissions/services libs; RAM-conscious cache config; modules: ping, moderation (warn, warnings, timeout, untimeout, kick, ban, unban, purge, slowmode), utility (serverinfo, userinfo, avatar, membercount, servericon, botinfo, help)
- Web: dashboard shell, Better Auth live, sign-in UI, auth-smoke script
- 17 slash commands total as of this writing

## Backlog (priority order)
- [ ] **Kernel: module events support** - extend `ModuleManifest` with `events?: { name, once?, execute }[]` and wire in index.ts; then:
- [ ] **Logging module v1**: guildMemberAdd/Remove, guildBanAdd/Remove, messageDelete (no content needed for deletes; note: message EDIT content requires Message Content intent - log edits as "content changed" only, or skip edits in v1). Config via settings key `logging` = { channelId }. Add `/logchannel set #channel` / `/logchannel off` commands (ManageGuild).
- [ ] **Welcome module v1**: guildMemberAdd -> settings `welcome` = { channelId, message } with {user} {server} {count} placeholders; commands `/welcome set #channel message` / `/welcome off` / `/welcome test`.
- [ ] **Dashboard API: `/api/guilds`** - session-authenticated route; fetch user's Discord guilds using the OAuth access token saved by Better Auth in the `account` table (GET https://discord.com/api/v10/users/@me/guilds), filter MANAGE_GUILD, return JSON. Small client page later. (This is the "API stuff" the owner asked for.)
- [ ] **More commands** (pick 2-4 that fit): `/poll` (2-10 options, buttons), `/say` (ManageMessages echo), `/role add|remove user role` (ManageRoles), `/pin`/`/unpin`, `/announce` (embed send). Defer `/remind` (needs a jobs table).
- [ ] **Perf pass**: when the owner provides the bot token and the bot runs for real, capture `/botinfo` RSS numbers and jot them in README + DECISIONS.
- [ ] Update README status + DECISIONS with the new command list + any new modules.

## RAM budget (owner requirement - cannot use lots of RAM)
- No message/presence/reaction caches; member/user caches capped (see cacheWithLimits in apps/bot/src/index.ts); message sweeper on.
- All durable state in Postgres/Redis - nothing grows in bot memory.
- Target: well under 200 MB RSS idle. Verify via /botinfo once the bot runs.

## Run log
- Run 0 (live, ~15:20-16:00 local): mod_cases schema + services + migration; moderation x9 + utility x7 command suites; env/config/embed/permissions libs; RAM cache config; auth-smoke + mod-smoke scripts; ready for cron continuation.
