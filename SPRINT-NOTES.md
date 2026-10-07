# Mem - autonomous build sprint (2026-10-07, ~15:20-19:00 Istanbul)

The owner is away until ~19:00 local. Hermes runs continuation sessions via cron
(now firing every ~10 min until ~19:00 - owner asked for continuous updates; final run ~18:45+ = comprehensive wrap-up).

## Ground rules for every run
1. Read this file first, then `git log --oneline -10` to see what landed.
2. Pick the next unchecked backlog batch (fit for ~10 min of work). Quality over quantity. Overlap guard: if `git status` shows dirty files modified <3 min ago, another session is mid-write - skip the batch, post nothing, end quietly.
3. Keep the repo green: `pnpm -r typecheck` MUST pass; run smokes for DB changes.
4. Commit + push every batch (recipe below). ALWAYS commit before the run ends - never leave the tree dirty.
5. Update this file: tick checkboxes + append a line to the Run log.
6. Final response = SHORT Discord progress message (what shipped, what is next).
   The FINAL run (the one starting ~18:45+, or if the backlog is empty) = comprehensive wrap-up instead.

## Push recipe
```bash
cd /c/Users/dodia/mem
git add -A && git commit -m "<message>"
TOKEN=$(grep '^MCP_GITHUB_API_KEY=' "$HOME/AppData/Local/hermes/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d '\r')
GIT_TERMINAL_PROMPT=0 git -c credential.helper= push "https://x-access-token:${TOKEN}@github.com/Wassuplol/mem.git" main
```
**If the push is REJECTED (remote moved - parallel sessions):**
```bash
URL="https://x-access-token:${TOKEN}@github.com/Wassuplol/mem.git"
GIT_TERMINAL_PROMPT=0 git -c credential.helper= fetch "$URL" main
git -c credential.helper= rebase FETCH_HEAD   # "skipped previously applied" is fine
GIT_TERMINAL_PROMPT=0 git -c credential.helper= push "$URL" main
```

## Verify commands
- typecheck: `pnpm -r typecheck`
- migrations: `pnpm --filter @mem/db exec drizzle-kit generate && pnpm --filter @mem/db exec drizzle-kit migrate`
- db smoke: `pnpm --filter @mem/db exec tsx scripts/mod-smoke.ts`
- bot boot smoke (expect `N command(s) across M module(s)` then clean missing-token exit):
  `cd /c/Users/dodia/mem && env -u DISCORD_TOKEN pnpm --filter @mem/bot exec tsx src/index.ts`
- web build: `pnpm --filter @mem/web build`
- web runtime smoke: start `pnpm --filter @mem/web start` in background, curl the endpoints, then kill via `taskkill /F /PID $(netstat -ano | grep ':3000' | grep LISTENING | head -1 | awk '{print $5}')` (single slash - MSYS doesn't convert here).

## Environment / ops notes (learned the hard way)
- Docker Desktop RUNNING; postgres+redis up (never stop). psql: `docker exec mem-postgres-1 psql -U mem -d mem`.
- The account/user/session tables use SNAKE_CASE column names (account_id, user_id, access_token...). Raw SQL must use those; the drizzle schema maps camelCase properties onto them, so app code is unaffected.
- For raw SQL in bash, use a quoted heredoc piped to `docker exec -i ... psql` - avoid escaped-quote -c strings.
- Root `.env` is filled EXCEPT `DISCORD_TOKEN` (empty - paste the real Mem bot token before the bot can run; login/dashboard + REST probes work without it). NEVER commit or print secrets. Shell's DISCORD_TOKEN = Hermes's own bot - always `env -u DISCORD_TOKEN` for bot tests. `auth-smoke` is an INTEGRATION probe: it needs the web app UP on :3000 (`pnpm --filter @mem/web start`) - an ECONNREFUSED there means 'server not running', not a code failure.
- Automation Chrome (CDP 9222) may run; leave it alone.
- **THE BOT IS LIVE** (2026-10-07 ~19:20): `Mem#1900` running locally, 31 commands registered in 'Professional Community'. Boot cmd: `cd /c/Users/dodia/mem && env -u DISCORD_TOKEN pnpm --filter @mem/bot exec tsx src/index.ts` (background). `env -u` is REQUIRED (shell's DISCORD_TOKEN would shadow .env).
- Docker Desktop can stop on its own (engine pipe vanishes): relaunch `cmd /c start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"`, wait for `docker info`, then `docker start mem-postgres-1 mem-redis-1`.
- pg pool background errors are now handled in createDb (`pool.on('error')`) - a DB blip must never crash the bot again.
- **Stopping the bot on Windows**: `process_manage kill` only kills the wrapper and can hang ~7 min; the tree (sh -> pnpm -> cmd -> tsx -> node) SURVIVES. Kill survivors: `taskkill /F /T /PID <pid>` for each (find via PowerShell `Get-CimInstance Win32_Process`, use string-split patterns like ("ts"+"x src/index.ts") to avoid matching the checker itself), verify zero matches before relaunching.
- Dev Portal intents state: **ALL THREE ENABLED** (Presence, Server Members, Message Content - flags bits 13/15/19 LIMITED + portal screenshot). CORRECTION: an earlier note wrongly said message content was off (checked bits 16/17; correct are 18/19). `ENABLE_MEMBERS_INTENT=1` + `ENABLE_MESSAGE_CONTENT=1` in .env; boot log shows both. Welcome/goodbye + join/leave logs + content in delete logs are LIVE.
- Next 16 `cacheComponents`: dynamic pages need `await connection()` inside a `<Suspense>` boundary (route handlers are fine).
- `git ls-remote` can hang past timeout on this box (network/GCM); the push itself works. To verify a push landed, use the API instead: `curl -s -H "Authorization: Bearer $MCP_GITHUB_API_KEY" https://api.github.com/repos/Wassuplol/mem/git/ref/heads/main` and compare the sha.

## What already exists (do not rebuild)
- Kernel `@mem/core`: defineModule, ModuleRegistry (commands + events + COMPONENTS + autocomplete), tests 6/6. ModuleContext = { client, registry } - use ctx.registry inside modules.
- DB `@mem/db`: guilds, guild_settings, mod_cases, polls + poll_votes, role_panels + role_panel_entries, reminders, auth tables; services (ensureGuild, get/setModuleConfig, createCase, listActiveWarnings, clearActiveWarnings, case lookups, poll services: createPoll/attachPollMessage/getPoll/getPollByMessage/votePoll (toggle + single-choice replace, transactional)/getPollTally/closePoll/listOpenPolls; role panel services: createRolePanel/getRolePanel/getRolePanelByMessage/listRolePanels/getLatestRolePanel/addRolePanelEntry (upsert)/removeRolePanelEntry/listRolePanelEntries/countRolePanelEntries/deleteRolePanel; reminder services: createReminder/getReminder/listDueReminders/markReminderSent/listUserReminders/countUserReminders/deleteUserReminder/purgeSentReminders); smokes (auth-smoke, mod-smoke, poll-smoke, rrole-smoke, reminder-smoke).
- Bot apps/bot: 31 commands, 9 modules, 7 events, 3 component handlers. Modules: ping; moderation (warn, warnings, removewarn, timeout, mute, untimeout, unmute, kick, ban, unban, purge, slowmode, role add|remove, case view|list, pin); utility (serverinfo, userinfo, avatar, membercount, servericon, botinfo, say, announce, serverstats); logging (ban/unban/message-delete/member-add-remove events + /logchannel); welcome (member-join event + /welcome set/off/test); help (epic hub: category select + pagination + autocomplete search; `help:` component handler = reference pattern #1); polls (create modal + vote/end buttons + end/list subs; live bar results, multi-select toggle, lazy auto-close on endsAt, 👑 winners; `poll:` handler = reference pattern #2); roles (reaction roles v1: /reactionrole create|add|remove|list; select-menu toggles via `rrole:` handler, live repaint on entry changes, emoji labels incl. :name: custom-emoji resolution, hierarchy/managed-role guards, addRole/removeRole by user id = works without members intent; = reference pattern #3); reminders (/reminder set|list|remove - duration parser (10s-365d) + 10-pending cap, autocomplete picker on remove, single 30s scan loop: bounded batch 25, channel->DM fallback, marks-sent to avoid retry storms, hourly purge of 30-day-old sent rows; = the pattern for scheduled work until the generic scheduler lands).
- RAM discipline: no message/presence/reaction caches; member/user caches capped at 100; partials for events; nothing grows in memory.
- Web apps/web: Better Auth live, `/api/guilds` route (session -> account access token -> discord.com/users/@me/guilds -> filter MANAGE_GUILD), `/servers` page, dashboard shell + Servers link. Verified: 401 no-session / 409 no-token / 401 discord_token_expired (real outbound call).
- Server Members intent is OPTIONAL via `ENABLE_MEMBERS_INTENT=1` (also toggle in Dev Portal). Off by default so login never breaks.

## Backlog (priority order)
- [x] Command catalog @ 300+ DONE (live, ~18:25): docs/COMMAND-CATALOG.md section 7 = master list of 319 targets (34 live / 226 next / 59 planned) + slot-tier math (G/X/M), navigation, tutorial/3D spike, platform-squeeze checklist, build order.
- [~] EPIC NAVIGATION: /help hub v1 SHIPPED (categories + pagination + autocomplete). Remaining: dashboard command explorer, polish (emoji per category, direct /help links).
- [ ] EPIC ONBOARDING: /tutorial module + AI concierge (BYO endpoint) + button-driven wizard; Components V2 where valuable; hero art for help/onboarding.
- [ ] SPIKE (note only, do NOT build yet): Discord Activities (Embedded App SDK) as the true-3D path - web app inside voice channels, reusing dashboard tech.
- [ ] Platform squeeze (as fits): autocomplete, modals, native polls, AutoMod API, guild onboarding API, scheduled events, forums/threads, soundboard, user-install commands, i18n-ready strings, command permission defaults.
- [ ] More utility/mod commands (pick 2-4 per run): ✅ /say + /announce shipped (run 1). ✅ /role add|remove, /pin, /serverstats, /case view|list shipped (run 2). Remaining fun/utility: /snipe, /calc, /note, /lock, /softban, /modstats. ✅ /reminder shipped (run 5).
- [ ] Scheduler service (catalog build order #2): generalize the reminders scan loop into DB-backed jobs -> unlocks tempban, temp roles, countdown, giveaway endings, sticky refresh.
- [x] Reaction roles v1 - `/reactionrole create|add|remove|list` + `rrole:` select handler SHIPPED (run 4). Next: `/rolemenu` (grouped menus), classic reaction mode, `clear` sub.
- [ ] Dashboard: per-server page `/servers/[id]` using /api/guilds data + module cards reading guild_settings via a new `/api/guilds/[id]/settings` route (session -> verify user manages that guild!).
- [ ] README + DECISIONS update: command list (24), events, API routes, RAM targets, "HTTP interactions / serverless command mode" as a documented future deployment option.
- [ ] Perf: when the real bot token lands, run the bot, hit /botinfo, record RSS numbers in README.
- [ ] Later phases (P3): leveling, tickets, temp-voice, starboard, tags, importers (MEE6/Carl/Dyno XP), AI module (BYO OpenAI-compatible endpoint), music (Lavalink).

## RAM budget (owner requirement)
- Target < 200 MB RSS with a handful of guilds; commands are thin wrappers, heavy logic lives in shared services so the dashboard API can reuse it. Verify via /botinfo once the real bot runs.

## Run log
- Run 7.0 (live, ~22:20): durable scheduler (scheduled_tasks + 30s scan + 3 kinds: tempban_unban, temprole_remove, giveaway_end) · /tempban · /temprole add|list|remove · giveaways module (/giveaway start|end|reroll|list, gw: button entries, throttled live counter, crypto-random auto-draw, reroll-excludes-previous). 34 cmds / 11 modules / 4 components. scheduler+giveaway smokes green; live relaunched.
- Run 6.8 (live, ~22:00): repo made PUBLIC (security sweep clean; desc + 10 topics set; logged-out verified 200). auth-chip: real Discord avatar image + smart initial fallback (skips decorative glyphs).
- Run 6.7 (live, ~20:30-21:40): dashboard redesign v2 - Lucide icon set, glass/gradient design system (globals.css), app shell (sidebar+topbar), redesigned overview/servers/landing; vision-QA'd (8.5/10 servers, landing fixes applied); README dashboard shot refreshed.
- Run 6.6 (live, ~19:30-19:50): /poll polish shipped (author display name instead of raw <@id>; timing moved to embed description: 'Closes <t:R>' / 'No time limit' / 'Closed <t:R>'); members intent ON (portal flags verified, .env ENABLE_MEMBERS_INTENT=1); bot restarted (Windows tree-kill lesson logged above).
- Run 6.5 (live, ~19:10-19:25): MEM BOOTED FOR REAL - first live boot caught a wrong-app token (Nihil) + a crash-on-DB-blip bug (fixed: pool error handler, commit pushed); Docker stack relaunched; bot online as Mem#1900 with 31 guild commands.
- Run 5 (cron, ~18:32-18:55): /reminder set|list|remove - duration parser (10s-365d), 10-pending cap, autocomplete picker on remove; 30s delivery scan (batch 25, channel->DM fallback, marks-sent, hourly purge of 30d-old sent rows); reminders table + 8 services (migration 0005 applied); typecheck + reminder-smoke + boot smoke green (31 cmds / 7 events / 3 components / 9 modules). Run 4.5's staged docs state resolved itself mid-run (sibling committed+pushed fc7e314) - nothing to rescue.
- Run 6 (cron, ~18:53-19:05): WRAP-UP run. Final verification at dd8cd78: `pnpm -r typecheck` OK (4/4 pkgs); ALL 5 db smokes green (auth-smoke PASS end-to-end with web up: signed cookie -> /api/auth/get-session -> user resolved; server stopped after); boot smoke `31 command(s), 7 event(s), 3 component handler(s) across 9 module(s)`; remote main sha == local. Comprehensive owner report + 'when you're home' checklist posted. Next up (build order #2): generic scheduler service -> tempban/temp roles/countdown.
- Run 4.5 (live, ~18:18-18:30): catalog section 7 - 300+ master plan (319 targets, slot math, navigation, tutorial, platform-squeeze, build order). Timer paused during this live chunk.
- Run 0 (live, ~15:20-16:00): mod_cases + services + migration; moderation x9 + utility x7 suites; RAM cache config; auth-smoke + mod-smoke.
- Run 0.5 (live, ~16:00-16:50): kernel events; logging + welcome modules (events + commands); removewarn/mute/unmute; /api/guilds + /servers page (verified full chain: 401 -> 409 -> 401 discord_token_expired); ops notes above.
- Run 1 (cron, ~16:27-17:00): docs/COMMAND-CATALOG.md (100-cmd target = 24 live / 65 next / 11 planned; Discord-cap + families/per-guild/plugins strategy; receipts); /say + /announce shipped in utility (24 cmds total; typecheck + boot smoke green: "24 command(s) across 5 module(s)"); fixed push-recipe line.
- Run 1.5 (live chunk, ~17:15-17:35): interaction kernel (components + autocomplete + ctx.registry; b407b11); epic /help hub module (ad74afb). Boot smoke: 24 cmds / 6 modules / 1 component handler.
- Run 2 (cron, ~17:28-17:50): quick wins batch - /role add|remove (hierarchy + managed-role guards), /pin (latest or by ID, unpin), /serverstats (cached counts), /case view|list (getCaseByNumber + listCases services + smoke coverage). Boot smoke: 28 cmds / 6 modules; mod-smoke extended + green. Catalog: 28 live / 61 next; ticks in rows + sprint order.
- Run 3 (cron, ~17:46-18:10): /poll MVP - polls + poll_votes tables (migration 0003 applied), poll services (toggle vote, single-choice replace in tx, tally, close, list open, lookup by message), polls module: `/poll create` modal form (question + options 2-10), vote buttons with live bar-result edits, multi-select, lazy auto-close (no timers), `/poll end` (author/ManageMessages, edits frozen results + 👑), `/poll list`; poll: component handler = 2nd reference pattern. poll-smoke (toggle off, single-choice move, multi keep, close/list) + extended verifications green. Boot smoke: 29 cmds / 7 modules / 2 component handlers. Catalog: 29 live / 60 next.
- Run 4 (cron, ~18:03-18:25): reaction roles v1 - role_panels + role_panel_entries tables (migration 0004 applied), 10 role-panel services (upsert entry, cascade delete), roles module: `/reactionrole create|add|remove|list`, select-menu toggles with `rrole:` handler (3rd reference pattern): diff selected vs member roles -> addRole/removeRole by user id (works without members intent), guards (managed roles, @everyone, hierarchy, 25-entry select cap), emoji labels incl. :name: custom-emoji lookup, live repaint when entries change. rrole-smoke (upsert, lookups, remove, cascade) green. Boot smoke: 30 cmds / 8 modules / 3 component handlers. Catalog: 30 live / 59 next.