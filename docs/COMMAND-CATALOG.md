# Mem — command catalog & coverage strategy

_Research pass 2026-10-07 (autonomous sprint). Owner-requested. Updated as commands ship._

Goal: design Mem's **first-party command set (~100 top-level commands)** and the strategy for growing
past Discord's command limits — using patterns from the bots we intend to beat
(MEE6 · Dyno · Carl-bot · Wick · YAGPDB) and the Red-DiscordBot cog ecosystem.

**Status legend:** ✅ live (in `apps/bot`) · 🔜 next (sprint target, shippable in single runs) · 📅 planned (P3+ per `docs/MASTER-PLAN.md`) · 🧩 plugin candidate.

**Coverage: 30 live · 59 next · 11 planned = 100 target.** (live = registered top-level names; subcommand coverage grows within them)

## 1. The limit problem (and how big bots dodge it)

Discord's hard caps per application scope:

- **100 global `CHAT_INPUT`** commands, **15 `USER`** + **15 `MESSAGE`** context menus, 1 entry point.
- The **same counts are available per-guild** (guild commands live in their own scope).
- **Subcommands and subcommand groups do NOT count** toward the cap: `/role add` and `/role remove`
  cost exactly one top-level name — `/role`.

Strategies for going past 100 (each used by market leaders):

1. **Families first** — bundle related actions as subcommands: `/role add|remove`, `/case view|list|reason`.
2. **Per-guild registration** — optional commands (feeds, music, tickets…) are registered only in guilds
   that enable those modules → each guild gets its own 100-command budget; the global set stays minimal.
3. **Searchable help hub** — as families deepen, `/help` becomes a category browser with pagination +
   search (the "commandhub" pattern from community cog collections).
4. **Context menus** — 15+15 free slots for right-click actions (e.g. "Report message", "Warn user").
5. **Plugins** — community modules register their own commands, also per-guild scoped.
6. **Escape routes** when brushing the cap: fold into an existing family (Discord error **30032** is the
   wall), or move rare admin tools to dashboard-only actions (we have a dashboard; incumbents mostly don't).

Engineering gotchas (from builders who hit the wall):

- Discord **ignores `default_permissions` on subcommands** — it applies at top-level only. Stricter gating
  for one subcommand must live in the command body (e.g. `/logging set`-style admin subs later).
- Global commands propagate with read-repair (up to ~1h); guild commands update instantly — use guild
  commands for dev/testing.
- Command names are unique per scope; a guild command can shadow a same-named global one (useful for
  per-guild overrides later).

## 2. Reference scan (the receipts)

- **Red-DiscordBot core + community cogs** — modularity benchmark. Core cogs: admin, mod, modlog, mutes,
  warnings, general, trivia, cleanup, customcom, filter, streams, economy… Community repos add starboard,
  ServerStats, retrigger (regex automations), xorole (self-assignable role sets), scheduler, tags, quotes.
  _Takeaway:_ one module boundary per feature family; commands are thin, services hold logic.
- **Carl-bot** — the reaction-roles king: `rr make/add/remove/addmany/move/clear/unique`; modes: normal,
  unique, binding, verify, drop, reversed, limit, whitelist/blacklist, **temporary (Patreon-only)**,
  self-destruct, lock. Plus moderation + utility parity (whois, roleinfo, tag, remind, giveaway).
  _Takeaway:_ RR modes are paywalled all over the market — our v1 flips that free.
- **Dyno** — clean taxonomy: manager set (addmod, addrole, announce, customs, giveaway, ignore\*, module(s),
  prefix, purge, role, rolecolor, setnick…) + moderator set (ban, case, clean, deafen, lock, lockdown,
  note(s), rolepersist, softban, star…). _Takeaway:_ `/case`, `/note`, `/rolepersist` are table stakes.
- **YAGPDB** — richest single command list we found. Tools: calc, poll, undelete/snipe, custom embeds,
  listroles, viewperms, timezone, whois. Fun: 8ball, catfact, dadjoke, dogfact, define/urban, dictionary,
  forex, roast, roll, topic, weather, wouldyourather, xkcd, **rep**, soundboard, **trivia**, CAH. Mod:
  warnings family, clean with regex filters, report, giverole/removerole with expiry, **automod**
  rulesets/logs/violations, **rolemenu**, tickets, events. _Takeaway:_ our closest command-for-command
  benchmark; `/rep`, `/rolemenu`, `/poll`, `/snipe` all earn spots.
- **MEE6** — thin slash surface (~24): /rank, /levels, moderation basics, music, and an external-API fun
  pack (anime, manga, pokemon, urban, imgur, youtube, twitch, crypto…). Custom commands capped at 500.
  _Takeaway:_ free "API fun" pack = cheap crowd-pleaser, coverable with zero-key public APIs.
- **Wick** — security-first: automod heat system, anti-nuke, panic mode, join gate, verification, backups.
  _Takeaway:_ security is the paid edge — our planned `/antinuke` + free `/verification` flip it.
- **Fun-bot aisle (top.gg scan)** — Geri-style game+image bots (2048, battleship, connect4, hangman,
  minesweeper, typeracer, 60+ image filters), Erisly-style content bots (memes, xkcd, reddit images,
  weather, currency). _Takeaway:_ games are engagement gold but each is a mini-project; image manipulation
  needs native canvas deps and is CPU-heavy → defer to a plugin or P4. V1 fun = thin API-wrapper families.

## 3. The target catalog (100 top-level commands)

### A. Core & meta — 7

| Command | Notes | Status |
| --- | --- | --- |
| `/help` | Command browser; grows into searchable hub | ✅ |
| `/ping` | Gateway latency | ✅ |
| `/botinfo` | Uptime, RAM (target <200 MB), latency | ✅ |
| `/invite` | Bot invite + support links | 🔜 |
| `/stats` | Public bot stats + opt-in server stats block | 🔜 |
| `/feedback` | Bug/idea → dev-guild thread | 🔜 |
| `/language` | Per-guild language toggle (i18n scaffold) | 🔜 |

### B. Moderation — 18

| Command | Notes | Status |
| --- | --- | --- |
| `/ban` `/unban` `/kick` | + reason, DM notify | ✅ |
| `/warn` `/warnings` `/removewarn` | Case-linked warnings in Postgres | ✅ |
| `/timeout` `/untimeout` `/mute` `/unmute` | Timed restrictions | ✅ |
| `/purge` `/slowmode` | Bulk delete, rate limits | ✅ |
| `/lock` `/unlock` | channel lock/unlock (server-wide = `/lockdown`) | ✅ |
| `/softban` | Ban+unban to clear messages (1-7d purge, case-logged) | ✅ |
| `/case` | v1 live: view / list — reason / edit next | ✅ |
| `/note` | sub: add / list / remove — mod notes (Dyno parity) | ✅ |
| `/modstats` | Per-moderator action counts (30d + all-time) | ✅ |
| `/report` | Member → staff report, routed to mod-log channel | 🔜 |

### C. Logging & audit — 3

| Command | Notes | Status |
| --- | --- | --- |
| `/logchannel` | sub: set / off / status | ✅ |
| `/logging` | Per-event toggles (messages, members, voice, roles, channels, invites) | 🔜 |
| `/modlogs` | Full mod history for a user (cases + notes + durations) | 🔜 |

### D. Welcome & growth — 6

| Command | Notes | Status |
| --- | --- | --- |
| `/welcome` | sub: set / off / test; `{user}` `{server}` vars; embed support next | ✅ |
| `/autorole` | sub: add / remove / list; humans\|bots; optional delay | 🔜 |
| `/boost` | Boost & unboost messages (free — MEE6 charges) | 🔜 |
| `/verification` | Button/select gate → role (Wick-parity, free); account-age gate later | 🔜 |
| `/invites` | Who-invited-whom + leaderboard + fake-invite filters | 🔜 |
| `/birthday` | sub: set / remove / next + daily announcements (paid elsewhere) | 🔜 |

### E. Roles, reaction roles & menus — 7

| Command | Notes | Status |
| --- | --- | --- |
| `/role` | sub: add / remove (ManageRoles gate + hierarchy guard) | ✅ |
| `/reactionrole` | sub: create / add / remove / list — select-menu toggles with live repaint + emoji labels (v1 ✅; classic reactions, clear, modes: normal/unique/drop/verify later — Carl parity, free) | ✅ v1 |
| `/rolemenu` | Grouped self-assignable role menus (YAGPDB parity) | 🔜 |
| `/temprole` | Grant role for N, auto-expire (needs scheduler) | 🔜 |
| `/rolepersist` | Re-grant roles after rejoin (Dyno-paywalled — free) | 🔜 |
| `/massrole` | Bulk assign/remove across members | 🔜 |
| `/rolecolor` | Change an existing role's color | 🔜 |

### F. Utility & info — 22

| Command | Notes | Status |
| --- | --- | --- |
| `/serverinfo` `/userinfo` `/avatar` `/membercount` `/servericon` | Info pack | ✅ |
| `/poll` | create (modal form) / end / list — live bar results, multi-select, lazy auto-close, ‹End› button | ✅ |
| `/say` | Echo as bot (ManageMessages gate) | ✅ |
| `/announce` | Embed announcement to a channel | ✅ |
| `/embed` | Custom embed builder (free — premium elsewhere) | 🔜 |
| `/pin` | Pin/unpin the latest message (or by ID) | ✅ |
| `/serverstats` | Live cached stats; saved counter snapshots + goals later | ✅ v1 |
| `/snipe` `/editsnipe` | Recent deleted / edited messages (per-channel capped buffer) | ✅ |
| `/reminder` | sub: set / list / delete / channel; natural durations (`1h30m`) | 🔜 |
| `/calc` | Math expression (safe parser, no eval) | ✅ |
| `/timestamp` | Generate copy-paste Discord timestamp formats | 🔜 |
| `/roleinfo` | Role details + hierarchy check | 🔜 |
| `/permissions` | Effective permissions of a user in a channel (viewperms) | 🔜 |
| `/emoji` | sub: list / steal server emojis | 🔜 |
| `/nick` | Manage nicknames | 🔜 |
| `/afk` | AFK status + auto-reply on mention | 🔜 |
| `/countdown` | Live countdown message to a date | 🔜 |
| `/inviteinfo` | Peek an invite code before joining | 🔜 |

### G. Messaging extras — 2

| Command | Notes | Status |
| --- | --- | --- |
| `/sticky` | Sticky message per channel (paywalled elsewhere) | 🔜 |
| `/autopublish` | Auto-publish announcement-channel posts | 🔜 |

### H. Fun & social — 19

| Command | Notes | Status |
| --- | --- | --- |
| `/8ball` | Magic 8-ball | 🔜 |
| `/gif` | Tenor search (free API key) | 🔜 |
| `/meme` | Meme templates (imgflip API) | 🔜 |
| `/cat` `/dog` | Random images + facts | 🔜 |
| `/roll` | Dice incl. `2d6` syntax | 🔜 |
| `/coinflip` | — | 🔜 |
| `/wouldyourather` | — | 🔜 |
| `/trivia` | sub: start / stop / rank / leaderboard (DB-backed) | 🔜 |
| `/rps` | vs bot or user (buttons) | 🔜 |
| `/roast` | sub: roast / compliment | 🔜 |
| `/xkcd` | Comic lookup (JSON API) | 🔜 |
| `/weather` | Open-Meteo (no key needed) | 🔜 |
| `/define` | sub: dictionary / urban | 🔜 |
| `/quote` | sub: add / list / random — server quotes | 🔜 |
| `/translate` | Free translate endpoint; AI polish later | 🔜 |
| `/topic` | Conversation starters | 🔜 |
| `/soundboard` | Play sound files in voice (YAGPDB parity) | 🔜 |
| `/choose` | Decision picker | 🔜 |

### I. Feeds & notifications — 1

| Command | Notes | Status |
| --- | --- | --- |
| `/feed` | sub: add / remove / list; RSS/YouTube/Twitch; per-guild interval poller (Redis-backed; no gateway growth) | 🔜 |

### J. Reputation — 1

| Command | Notes | Status |
| --- | --- | --- |
| `/rep` | sub: give / take / check / top / log (YAGPDB parity, free) | 🔜 |

### K. Leveling — 4

| Command | Notes | Status |
| --- | --- | --- |
| `/rank` | Progress-bar card + rank + XP | ✅ |
| `/leaderboard` | Paged (10/page) + prev/next buttons | ✅ |
| `/levels` | sub: channel / toggle / addrole / removerole / config | ✅ |
| `/level` (v1.1) | sub: set / reset; XP importer (MEE6/Carl/Dyno) | 📅 |

### L. Giveaways — 1

| Command | Notes | Status |
| --- | --- | --- |
| `/giveaway` | sub: start / end / reroll; button entry, requirements, DM winner | 🔜 |

### M. Tickets — 1

| Command | Notes | Status |
| --- | --- | --- |
| `/ticket` | sub: panel / open / close / claim / add / remove / rename / staffrole / log / config | ✅ |

### N. Temp voice — 1

| Command | Notes | Status |
| --- | --- | --- |
| `/voice` | sub: setup / claim / lock / limit / rename | 📅 |

### O. Starboard — 1

| Command | Notes | Status |
| --- | --- | --- |
| `/starboard` | sub: set / threshold / ignore | 📅 |

### P. Tags — 1

| Command | Notes | Status |
| --- | --- | --- |
| `/tag` | sub: create / delete / list / info — server + user tags | 📅 |

### Q. Automod & security — 2

| Command | Notes | Status |
| --- | --- | --- |
| `/automod` | sub: enable / disable / mentions / spam / words / alertchannel / timeoutminutes / status — native Discord AutoMod (presets, custom words, mention + message spam, adopt-takeover) — **shipped** | ✅ |
| `/verification` | sub: setup / joinrole / off / config — button join gate + unverified role + role swap — **shipped** | ✅ |
| `/security` | anti-spam (auto-timeout) / anti-raid / anti-nuke + trust / screening / quarantine / alert channel — **shipped** | ✅ |
| `/lockdown` | panic mode: FREEZE every channel (per-channel overwrite snapshots, exact restore on end) — **shipped** | ✅ |
| `/antinuke` | Wick-style guardian: mass-action detection, quarantine, panic mode, backups (audit-log driven) | 📅 |

### R. AI — 1

| Command | Notes | Status |
| --- | --- | --- |
| `/ai` | sub: ask / summarize / translate / thread-summary; BYO OpenAI-compatible endpoint per guild (`research/03`) | 📅 |

### S. Music — 1

| Command | Notes | Status |
| --- | --- | --- |
| `/play` `/skip` `/stop` `/pause` `/nowplaying` `/queue` `/volume` `/loop` | Lavalink node (docker service) + youtube / soundcloud / bandcamp / twitch sources; buttons on the now-playing card — **shipped** | ✅ |

### T. Importers — 1

| Command | Notes | Status |
| --- | --- | --- |
| `/import` | MEE6/Carl/Dyno configs + XP — the adoption wedge (`research/01`) | 📅 |

### U. Command management — 1

| Command | Notes | Status |
| --- | --- | --- |
| `/command` | Enable/disable commands & modules per guild (Dyno/Red parity; pairs with per-guild registration strategy) | 🔜 |

## 4. Prerequisite: component interactions — ✅ shipped

The interaction kernel landed in run 1.5 (`@mem/core` component handlers keyed by custom-id prefix,
plus autocomplete passthrough). Live handlers: `help:` (category browse + pagination + search),
`poll:` (modal create + vote buttons + end button) and `rrole:` (reaction-role select toggles).
Next consumers: `/rolemenu`, `/verification`, games (`/trivia`, `/rps`) — all reuse the per-module
pattern: pick a custom-id scheme, register one `ComponentHandler`, keep heavy state in Postgres.

## 5. Implementation notes

- **RAM discipline carries over:** every catalog entry is a thin wrapper; heavy logic belongs in shared
  services (`@mem/db` + lib) so the dashboard API can reuse it. No caches; feeds poll on intervals, not
  gateways; games keep per-session state in memory only (bounded, deleted on end).
- **Shared infra items** surfaced by the catalog: a small **scheduler** service (needed by `/reminder`,
  `/temprole`, `/giveaway`, `/birthday`) — Redis-backed due-jobs; and an **outbound HTTP helper** with
  timeouts + per-command rate caps for the API-wrapper commands.
- **Explicitly deferred:** Geri-style image manipulation (native canvas deps, CPU-heavy) → plugin/P4;
  anime/manga/crypto packs → plugin candidates (niche, API-churn risk).
- **Suggested order for sprint runs** (each ≈ one batch): 1) `/say` + `/announce` ✅ + `/role` ✅ (no
  components needed) → 2) kernel interaction registry ✅ → 3) `/poll` ✅ (run 3: modal + buttons + live
  results + lazy auto-close) → 3b) reaction-roles v1 ✅ (run 4: `rrole:` select toggles + `/reactionrole
  create|add|remove|list`) → 4) `/snipe` + `/case` ✅ → dashboard server page → README/DECISIONS refresh.

## 6. Sources (accessed 2026-10-07)

- Red core cogs: <https://docs.discord.red/en/stable/cog_guides/core.html> · community:
  <https://github.com/TrustyJAID/Trusty-cogs> · <https://github.com/calebj/calebj-cogs> ·
  <https://github.com/Cog-Creators/Red-DiscordBot>
- Carl-bot: <https://docs.carl.gg/roles/reaction-roles>
- Dyno: <https://dyno.gg/en/commands>
- YAGPDB: <https://help.yagpdb.xyz/docs/core/all-commands>
- MEE6: <https://wiki.mee6.xyz/> · <https://github.com/Mee6/Mee6-documentation>
- Wick: <https://docs.wickbot.com/intro/features>
- Discord limits: <https://discord.com/developers/docs/interactions/application-commands>
- Fun-bot aisle: top.gg (fun/game tags), Geri, Erisly listings

---

# 7. v2 - OWNER DIRECTIVE: the 300+ first-party plan

Supersedes the ~100 target in section 3. Master list below: **319 targets** - `34` live, `226` next, `59` planned. All first-party, no plugins required for any of it.

## 7.1 How 300+ fits inside Discord's limits (verified)

- Top-level slots per server: **100 global** chat commands + **100 more in guild scope** (registered per-guild) + context menus (up to **15 user + 15 message per scope**) = **~260 top-level slots**, all ours.
- Depth: one command can carry **25 subcommands** (or 25 subcommand groups x 25 subcommands = up to 625 sub-actions).
- Counting rule (industry standard): **subcommands count as commands** (e.g. `/poll create`, `/poll end`, `/poll list` = 3).
- Tiers: **G** = global core (always registered) - most of the list. **X** = extended pack, registered per-guild when the server enables it in the dashboard. **M** = context menus. Assignment happens during the build; heavy/niche items can shift to X.
- Optional surfaces (not needed for the 300): prefix text commands (self-host only, needs Message Content intent) and user-install commands (same budget, appear in DMs).

## 7.2 Navigation & discovery (first-class requirement)

- SHIPPED: `/help` hub - category browser, pagination, autocomplete search.
- Next: emoji per category, `/help <command>` deep view, dashboard command explorer, docs site.
- Naming conventions: families are verbs/nouns by domain (`mod`, `role`, `voice`, `ticket`...); consistent option names (`user`, `reason`, `duration`).
- Philosophy: autocomplete-first - type 3 letters, find anything; nobody memorizes 300.

## 7.3 Onboarding, tutorial & the 3D question

- `/tutorial` module: interactive walkthrough (buttons), per-module setup guides.
- AI concierge (BYO endpoint): answers "how do I..." and walks admins through setup conversationally; can pre-fill config suggestions.
- 3D: impossible inside Discord messages. Real path = **Discord Activity** (Embedded App SDK, web app in voice channels) - SPIKE ONLY, later phase, reuses dashboard tech.
- In-Discord epic: Components V2 rich layouts, generated hero art for help/onboarding, polished button/select/modal flows everywhere.

## 7.4 Platform-squeeze checklist

- [x] Components (buttons/selects) + modals - kernel shipped, 3 reference patterns live (`help:`, `poll:`, `rrole:`)
- [x] Autocomplete - kernel shipped (help search)
- [ ] Context menus (both scopes) - designed (section W), next batch
- [ ] Components V2 layouts - evaluate for help/onboarding panels
- [ ] Native Discord polls - augment /poll output
- [ ] AutoMod API - drives the automod module
- [ ] Guild onboarding API - welcome flow integration
- [ ] Scheduled events API - create/manage events
- [ ] Forums/threads - ticket system core
- [ ] Soundboard - fun/notification integration
- [ ] User-install commands - personal commands in DMs
- [ ] i18n-ready strings - localization pass
- [ ] Command permission defaults - per-command locking

## 7.5 The master list (319 targets)

Status: L = live, N = next (buildable in current phases), P = planned (later/infra first).

### A. Core & meta - 12

- [L] `/ping` - gateway latency + uptime
- [L] `/help` - THE hub: categories + pagination + autocomplete search
- [L] `/botinfo` - uptime, RAM (RSS/heap), guilds, node
- [N] `/uptime` - uptime + restart history
- [N] `/stats` - command usage stats (from DB counter)
- [N] `/invite` - bot invite link + permissions summary
- [N] `/support` - support server + docs links
- [N] `/changelog` - latest changelog entries
- [N] `/privacy` - what data Mem stores + deletion flow
- [N] `/terms` - usage terms
- [P] `/feedback` - modal -> support/GitHub issue
- [P] `/vote` - top.gg voting reminder + rewards hook

### B. Moderation - 34

- [L] `/warn` - case-numbered warning
- [L] `/warnings` - list active warnings
- [L] `/removewarn` - clear active warnings
- [L] `/timeout` - timeout member
- [L] `/mute` - alias of timeout
- [L] `/untimeout` - remove timeout
- [L] `/unmute` - alias
- [L] `/kick` - kick with case
- [L] `/ban` - ban with case
- [L] `/unban` - unban by ID
- [L] `/purge` - bulk delete w/ filters
- [L] `/slowmode` - channel slowmode
- [L] `/case view` - lookup case by number
- [L] `/case list` - recent cases
- [N] `/softban` - ban+unban purge pattern
- [N] `/tempban` - scheduler-backed ban expiry
- [N] `/unbanall` - bulk unban
- [N] `/lock` - channel lockdown
- [N] `/unlock` - lift lockdown
- [N] `/hide` - hide channel from @everyone
- [N] `/unhide` - unhide channel
- [N] `/nuke` - clone channel (reset chat)
- [N] `/note add` - private staff note on member
- [N] `/notes` - list staff notes
- [N] `/history` - full case history for a member
- [N] `/raidmode` - one-switch raid lockdown
- [N] `/voicemute` - server-mute member
- [N] `/voicedeafen` - server-deafen member
- [N] `/voicekick` - disconnect from voice
- [N] `/move` - move member to channel
- [N] `/moveall` - move all voice members
- [N] `/inrole` - list members with a role
- [P] `/jail` - quarantine role + channel
- [P] `/unjail` - release from quarantine

### C. Logging & audit - 9

- [L] `/logchannel` - set/off/status + event feed
- [N] `/logs events` - toggle event categories
- [N] `/logs recent` - recent events from DB log
- [N] `/snipe` - last deleted message
- [N] `/editsnipe` - last edited message
- [N] `/audit recent` - human-readable audit log reader
- [N] `/audit user` - audit entries for a user
- [P] `/logs export` - CSV/JSON export
- [P] `/logs ignore` - channel/role filters

### D. Welcome & growth - 16

- [L] `/welcome` - set/off/test + placeholders
- [N] `/goodbye` - leave messages
- [N] `/autorole` - add/remove/list auto roles
- [N] `/invites list` - who invited a member
- [N] `/invites codes` - all active codes + uses
- [N] `/invites rewards` - invite-count role rewards
- [N] `/boosterrole` - self-serve booster role
- [N] `/boosters` - list active boosters
- [N] `/onboarding intro` - DM welcome toggle + copy
- [N] `/joingate` - account-age gate + kick
- [N] `/greet dm` - DM greeting
- [N] `/stickyroles` - reapply roles on rejoin
- [P] `/growth stats` - joins/leaves trends
- [P] `/milestones` - member milestone announcements
- [P] `/vanity` - vanity URL tracking
- [P] `/birthdays` - birthday announcements

### E. Roles & menus - 17

- [L] `/reactionrole create` - select-menu role panel
- [L] `/reactionrole add` - add panel entry (emoji/role)
- [L] `/reactionrole remove` - remove entry
- [L] `/reactionrole list` - list panels
- [L] `/role add` - give role (hierarchy-safe)
- [L] `/role remove` - take role
- [N] `/role all add` - give role to everyone
- [N] `/role all remove` - remove from everyone
- [N] `/role create` - create role
- [N] `/role delete` - delete role
- [N] `/role rename` - rename role
- [N] `/role color` - recolor role
- [N] `/role icon` - set role icon
- [N] `/roleinfo` - role details + member count
- [N] `/selfrole` - build button/select role menus
- [N] `/temp role` - scheduler-backed temporary roles
- [P] `/role request` - request/approval flow

### F. Utility & info - 22

- [L] `/serverinfo` - server overview
- [L] `/userinfo` - user/member overview
- [L] `/avatar` - avatar (+guild avatar)
- [L] `/membercount` - human count
- [L] `/servericon` - server icon
- [L] `/serverstats` - cached counts (channels/roles/emojis/boosts)
- [N] `/banner` - user banner
- [N] `/serverbanner` - server banner
- [N] `/channelinfo` - channel details + perms summary
- [N] `/threadinfo` - thread details
- [N] `/emoji info` - emoji details
- [N] `/emoji list` - server emojis
- [N] `/sticker info` - sticker details
- [N] `/color` - color preview from hex
- [N] `/snowflake` - timestamp from any ID
- [N] `/permissions` - effective perms of user in channel
- [N] `/vcinfo` - voice channel occupants
- [P] `/time` - timezone converter
- [P] `/weather` - weather lookup
- [P] `/define` - dictionary
- [P] `/convert` - unit conversion
- [P] `/qr` - QR code generator

### G. Messaging - 12

- [L] `/say` - send as Mem (no-ping)
- [L] `/announce` - titled embed announcement
- [L] `/poll` - modal create, live bars, multi, auto-close
- [N] `/embed` - modal embed builder
- [N] `/sticky` - sticky message per channel
- [N] `/remind` - scheduler-backed reminders
- [N] `/reminders list` - my reminders
- [N] `/reminder remove` - delete reminder
- [N] `/autoresponder` - add/remove/list triggers
- [N] `/quote` - quote a message
- [P] `/bookmark` - save messages
- [P] `/tts read` - read message as audio

### H. Fun & social - 31

- [N] `/8ball` - classic magic 8-ball
- [N] `/roll` - dice roll (NdM)
- [N] `/dice` - full dice set
- [N] `/coinflip` - heads or tails
- [N] `/choose` - let Mem pick
- [N] `/ship` - compatibility fun
- [N] `/rate` - x/10 rating
- [N] `/hug` - anime-style action GIF
- [N] `/pat` - action GIF
- [N] `/slap` - action GIF
- [N] `/kiss` - action GIF
- [N] `/cuddle` - action GIF
- [N] `/meme` - meme from API
- [N] `/joke` - random joke
- [N] `/fact` - random fact
- [N] `/inspire` - motivational quote
- [N] `/would-you-rather` - WYR question
- [N] `/truth-or-dare` - classic game
- [N] `/trivia` - start/stop/leaderboard
- [N] `/rps` - rock-paper-scissors vs Mem
- [N] `/tictactoe` - buttons game vs Mem
- [N] `/connect4` - buttons game
- [N] `/hangman` - word game
- [N] `/wordle` - daily word game
- [N] `/scramble` - word scramble
- [N] `/slots` - casino fun (fake fake)
- [N] `/blackjack` - cards vs Mem
- [N] `/roulette` - spin
- [N] `/highlow` - card guessing
- [N] `/pokedex` - pokemon lookup (API)
- [P] `/anime` - anime/manga lookup

### I. Feeds & notifications - 8

- [N] `/youtube` - add/remove/list channel feeds
- [N] `/twitch` - add/remove/list
- [N] `/rss` - add/remove/list
- [N] `/reddit` - add/remove/list
- [N] `/steam deals` - deals feed
- [N] `/freegames` - free game alerts
- [P] `/x relay` - X/twitter relay
- [P] `/github feed` - repo events feed

### J. Reputation - 4

- [N] `/rep give` - give reputation point
- [N] `/rep check` - view reputation
- [N] `/rep leaderboard` - top reputations
- [N] `/rep reset` - admin reset

### K. Leveling - 11

- [L] `/rank` - xp card + progress
- [L] `/leaderboard` - top members (paged, buttons)
- [L] `/levels config` - channel/toggle/role rewards
- [N] `/xp add` - grant xp
- [N] `/xp remove` - remove xp
- [N] `/xp set` - set exact xp/level
- [L] `/levels addrole` - role reward at level
- [L] `/levels removerole` - remove reward
- [L] `/levels config` (panel) - lists rewards
- [N] `/xp multiplier` - role/channel multipliers
- [P] `/level card` - custom rank card setup

### L. Giveaways - 5

- [N] `/giveaway start` - button-entry giveaway
- [N] `/giveaway end` - end early
- [N] `/giveaway reroll` - pick new winner
- [N] `/giveaway list` - active giveaways
- [N] `/giveaway delete` - remove giveaway

### M. Tickets - 9

- [L] `/ticket panel` - post setup panel (button)
- [L] `/ticket open` - open ticket (private threads)
- [L] `/ticket close` - close + auto transcript to log
- [L] `/ticket claim` - claim as staff
- [L] `/ticket add` - add member to ticket
- [L] `/ticket remove` - remove member
- [L] `/ticket rename` - rename ticket
- [N] `/ticket transcript` - save transcript
- [L] `/ticket staffrole / log / config` - settings (ManageGuild)
- [P] `/ticket categories` - multi-panel routing

### N. Temp voice - 8

- [N] `/voice hub` - join-to-create setup
- [N] `/voice lock` - lock my channel
- [N] `/voice unlock` - unlock
- [N] `/voice limit` - user limit
- [N] `/voice rename` - rename
- [N] `/voice kick` - kick from my channel
- [N] `/voice claim` - take ownership
- [P] `/voice ban` - ban from my channel

### O. Starboard - 4

- [N] `/starboard set` - channel + star threshold
- [N] `/starboard off` - disable
- [N] `/starboard show` - stats
- [P] `/starboard ignore` - exempt channels/roles

### P. Tags & custom commands - 9

- [N] `/tag create` - store named snippet
- [N] `/tag edit` - edit
- [N] `/tag delete` - delete
- [N] `/tag info` - tag details
- [N] `/tag list` - tags by owner
- [N] `/tags` - all server tags
- [N] `/customcmd add` - trigger -> response
- [N] `/customcmd remove` - remove
- [N] `/customcmd list` - list

### Q. Automod & security - 13

- [L] `/security` - anti-spam / anti-raid / anti-nuke / screening / alertchannel / trust / strip / restore / config · every threshold per-server
- [L] `/lockdown` - panic mode: freeze the server, restore exactly on end
- [L] `/automod enable` - turn on native AutoMod rules (+ adopt takeover)
- [L] `/automod disable` - off
- [L] `/automod status` - current rules
- [L] `/automod words|mentions|spam|alertchannel|timeoutminutes` - words, mention + spam rules, alerts, timeout action
- [N] `/filter words` - word blocklist add/remove/list
- [N] `/antinuke config` - anti-nuke thresholds + actions
- [N] `/antinuke trust` - trusted users/bots
- [N] `/antiraid config` - raid triggers
- [L] `/verification setup` - gate button + role (+ joinrole / off / config)
- [L] `/security strip` - quarantine member (roles stored, /security restore to undo)
- [L] `/security restore` - release
- [P] `/whitelist` - trusted bots immune from antinuke
- [P] `/backup` - server template create/load

### R. AI (BYO endpoint) - 9

- [N] `/ai ask` - one-shot question
- [N] `/ai config` - endpoint/model/persona per guild
- [N] `/ai chat` - channel chat mode
- [N] `/ai summarize` - summarize message/thread
- [N] `/ai image` - image generation
- [N] `/ai translate` - translate text
- [N] `/ai moderate` - AI-assisted mod review
- [P] `/ai lore` - persona/lorebook management
- [P] `/ai voice` - TTS in voice (spike)

### S. Music (Lavalink, phase 3+) - 12

- [L] `/play` - join + play (search or URL, playlists)
- [L] `/skip` - skip track
- [L] `/stop` - stop + leave
- [L] `/pause` - pause/resume (toggle)
- [L] `/queue` - show queue (paged)
- [L] `/nowplaying` - current track + buttons
- [L] `/loop` - loop modes
- [P] `/shuffle` - shuffle queue
- [L] `/volume` - volume (1-200)
- [P] `/seek` - seek
- [P] `/filter` - audio filters
- [P] `/lyrics` - lyrics lookup
- [P] `/join/leave` - manual join/leave

### T. Importers - 5

- [N] `/import mee6` - import MEE6 levels
- [N] `/import carl` - import Carl tags/roles
- [N] `/import dyno` - import Dyno settings
- [N] `/import config` - generic JSON import
- [P] `/export data` - full data export

### U. Settings & command management - 11

- [N] `/settings view` - guild settings overview
- [N] `/settings edit` - module config editor
- [N] `/module enable` - turn modules on
- [N] `/module disable` - turn modules off
- [N] `/command disable` - disable command in channel/role
- [N] `/command enable` - re-enable
- [N] `/locale set` - language (i18n-ready)
- [N] `/timezone set` - guild timezone
- [N] `/commandperms` - default permissions per command
- [P] `/prefix` - legacy prefix mode (self-host only)
- [P] `/maintenance` - owner-only maintenance mode

### V. Analytics - 6

- [N] `/stats activity` - server activity trends
- [N] `/stats channels` - busiest channels
- [N] `/stats members` - growth/retention flow
- [N] `/stats commands` - command usage
- [P] `/stats voice` - voice time leaderboard
- [P] `/stats export` - export analytics

### W. Context menus (M) - 14

- [N] `/Warn user` - user menu
- [N] `/Timeout user` - user menu
- [N] `/Kick user` - user menu
- [N] `/Ban user` - user menu
- [N] `/User info` - user menu
- [N] `/Avatar` - user menu
- [N] `/Rep give` - user menu
- [N] `/Translate message` - message menu
- [N] `/Quote message` - message menu
- [N] `/Report message` - message menu
- [N] `/Pin message` - message menu
- [N] `/AI summarize` - message menu
- [N] `/Bookmark message` - message menu
- [N] `/Purge to here` - message menu

### X. Extras - 8

- [N] `/afk` - set/clear afk + auto-reply
- [N] `/firstmessage` - oldest message in channel
- [N] `/urban` - urban dictionary
- [N] `/emoji steal` - clone emoji to server
- [N] `/countdown` - scheduler countdown
- [P] `/goal` - server goals with progress bars
- [P] `/bigemoji` - enlarge emoji
- [P] `/screenshot` - website screenshot


### Y. Economy (planned module) - 8

- [P] `/balance` - wallet + bank
- [P] `/daily` - daily reward streak
- [P] `/work` - timed earn
- [P] `/pay` - transfer to user
- [P] `/shop buy` - buy roles/items
- [P] `/inventory` - owned items
- [P] `/eco leaderboard` - richest members
- [P] `/beg` - desperate earnings

### Z. Suggestions & modmail - 7

- [N] `/suggest` - post suggestion (voting buttons)
- [N] `/suggestion setup` - channel + workflow config
- [N] `/suggestion approve` - staff decision + status
- [N] `/suggestion deny` - staff decision + status
- [N] `/modmail setup` - modmail category config
- [N] `/modmail reply` - reply as staff
- [N] `/modmail close` - close thread

### AA. Extra commands - 15

- [N] `/banlist` - list banned users
- [N] `/modstats` - moderator activity stats
- [N] `/roles` - list all server roles
- [N] `/channels` - list channels by category
- [N] `/bots` - list server bots
- [N] `/nickname set` - change nickname
- [N] `/nickname reset` - reset nickname
- [N] `/topic` - conversation starter
- [N] `/roast` - playful roast
- [N] `/compliment` - wholesome compliment
- [N] `/never-have-i-ever` - group game
- [N] `/most-likely` - group game
- [N] `/minesweeper` - buttons game
- [P] `/shard` - shard/process info
- [P] `/dm` - DM a user as Mem (staff)

## 7.6 Build order (sprint runs)

1. Quick wins + kernel + nav + poll + reaction roles - SHIPPED.
2. **Scheduler service** (DB-backed jobs) -> unlocks: tempban, temp roles, remind, countdown, giveaway endings, sticky refresh.
3. Leveling (rank/leaderboard/rewards) -> reputation -> analytics lite.
4. Tickets (threads + panels) -> temp voice -> starboard.
5. Automod + antinuke/antiraid + verification -> quarantine/jail.
6. Feeds (youtube/twitch/rss/reddit) -> fun pack (games + GIFs) -> AI module.
7. Importers -> settings/command management -> context menus batch.
8. Music (Lavalink) -> Activities 3D spike research.

