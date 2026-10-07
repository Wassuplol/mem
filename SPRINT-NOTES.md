# Mem - autonomous build sprint (2026-10-07, ~15:20-19:00 Istanbul)

The owner is away until ~19:00 local. Hermes runs continuation sessions via cron
(every 30 min, ~6 runs until ~19:00; the last one = comprehensive wrap-up report).

## Ground rules for every run
1. Read this file first, then `git log --oneline -10` to see what landed.
2. Pick the next unchecked backlog batch (fit for ~25 min of work). Quality over quantity.
3. Keep the repo green: `pnpm -r typecheck` MUST pass; run smokes for DB changes.
4. Commit + push every batch (recipe below). ALWAYS commit before the run ends - never leave the tree dirty.
5. Update this file: tick checkboxes + append a line to the Run log.
6. Final response = SHORT Discord progress message (what shipped, what is next).
   The LAST run (if starting at/after 18:15 local, or if the backlog is empty) = comprehensive wrap-up instead.

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
- bot boot smoke (expect `N command(s) across M module(s)` then clean missing-token exit):
  `cd /c/Users/dodia/mem && env -u DISCORD_TOKEN pnpm --filter @mem/bot exec tsx src/index.ts`
- web build: `pnpm --filter @mem/web build`
- web runtime smoke: start `pnpm --filter @mem/web start` in background, curl the endpoints, then kill via `taskkill //F //PID $(netstat -ano | grep ':3000' | grep LISTENING | head -1 | awk '{print $5}')`.

## Environment / ops notes (learned the hard way)
- Docker Desktop RUNNING; postgres+redis up (never stop). psql: `docker exec mem-postgres-1 psql -U mem -d mem`.
- The account/user/session tables use SNAKE_CASE column names (account_id, user_id, access_token...). Raw SQL must use those; the drizzle schema maps camelCase properties onto them, so app code is unaffected.
- For raw SQL in bash, use a quoted heredoc piped to `docker exec -i ... psql` - avoid escaped-quote -c strings.
- Root `.env` is filled; NEVER commit or print secrets. Shell's DISCORD_TOKEN = Hermes's own bot - always `env -u DISCORD_TOKEN` for bot tests.
- Automation Chrome (CDP 9222) may run; leave it alone.
- Next 16 `cacheComponents`: dynamic pages need `await connection()` inside a `<Suspense>` boundary (route handlers are fine).

## What already exists (do not rebuild)
- Kernel `@mem/core`: defineModule, ModuleRegistry (commands + EVENTS), tests 5/5.
- DB `@mem/db`: guilds, guild_settings, mod_cases, auth tables; services (ensureGuild, get/setModuleConfig, createCase, listActiveWarnings, clearActiveWarnings); smokes (auth-smoke, mod-smoke).
- Bot apps/bot: 24 commands, 5 modules, 6 events. Modules: ping, moderation (warn, warnings, removewarn, timeout, mute, untimeout, unmute, kick, ban, unban, purge, slowmode), utility (serverinfo, userinfo, avatar, membercount, servericon, botinfo, help, say, announce), logging (ban/unban/message-delete/member-add-remove events + /logchannel), welcome (member-join event + /welcome set/off/test).
- RAM discipline: no message/presence/reaction caches; member/user caches capped at 100; partials for events; nothing grows in memory.
- Web apps/web: Better Auth live, `/api/guilds` route (session -> account access token -> discord.com/users/@me/guilds -> filter MANAGE_GUILD), `/servers` page, dashboard shell + Servers link. Verified: 401 no-session / 409 no-token / 401 discord_token_expired (real outbound call).
- Server Members intent is OPTIONAL via `ENABLE_MEMBERS_INTENT=1` (also toggle in Dev Portal). Off by default so login never breaks.

## Backlog (priority order)
- [~] Command catalog @ 300+ (OWNER DIRECTIVE, supersedes 100/250): expand docs/COMMAND-CATALOG.md to 300+ first-party commands without plugins. ~260 top-level slots (100 global + 100 guild-tier + ~60 context menus) + subcommand families (25/command, 25x25 groups); count subcommands as commands. Include navigation + platform-squeeze + tutorial plan.
- [ ] EPIC NAVIGATION (first-class requirement): searchable /help hub (category menus, pagination, autocomplete search), consistent family naming; dashboard command explorer later.
- [ ] EPIC ONBOARDING: /tutorial module + AI concierge (BYO endpoint) + button-driven wizard; Components V2 where valuable; hero art for help/onboarding.
- [ ] SPIKE (note only, do NOT build yet): Discord Activities (Embedded App SDK) as the true-3D path - web app inside voice channels, reusing dashboard tech.
- [ ] Platform squeeze (as fits): autocomplete, modals, native polls, AutoMod API, guild onboarding API, scheduled events, forums/threads, soundboard, user-install commands, i18n-ready strings, command permission defaults.
- [ ] More utility/mod commands (pick 2-4 per run): ✅ /say + /announce shipped (run 1). Remaining: /poll (needs kernel component hook), /role add|remove user role (ManageRoles), /pin, /serverstats (member/goal counts), /case lookup (case by number).
- [ ] Reaction roles v1 - needs button/select handling (component interactions); kernel may need a components hook. Design first, then `/reactionrole create|add|remove|list`.
- [ ] Dashboard: per-server page `/servers/[id]` using /api/guilds data + module cards reading guild_settings via a new `/api/guilds/[id]/settings` route (session -> verify user manages that guild!).
- [ ] README + DECISIONS update: command list (24), events, API routes, RAM targets, "HTTP interactions / serverless command mode" as a documented future deployment option.
- [ ] Perf: when the real bot token lands, run the bot, hit /botinfo, record RSS numbers in README.
- [ ] Later phases (P3): leveling, tickets, temp-voice, starboard, tags, importers (MEE6/Carl/Dyno XP), AI module (BYO OpenAI-compatible endpoint), music (Lavalink).

## RAM budget (owner requirement)
- Target < 200 MB RSS with a handful of guilds; commands are thin wrappers, heavy logic lives in shared services so the dashboard API can reuse it. Verify via /botinfo once the real bot runs.

## Run log
- Run 0 (live, ~15:20-16:00): mod_cases + services + migration; moderation x9 + utility x7 suites; RAM cache config; auth-smoke + mod-smoke.
- Run 0.5 (live, ~16:00-16:50): kernel events; logging + welcome modules (events + commands); removewarn/mute/unmute; /api/guilds + /servers page (verified full chain: 401 -> 409 -> 401 discord_token_expired); ops notes above.
- Run 1 (cron, ~16:27-17:00): docs/COMMAND-CATALOG.md (100-cmd target = 24 live / 65 next / 11 planned; Discord-cap + families/per-guild/plugins strategy; receipts); /say + /announce shipped in utility (24 cmds total; typecheck + boot smoke green: "24 command(s) across 5 module(s)"); fixed push-recipe line.
