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
| `/lock` | sub: channel / server (server = lockdown) | 🔜 |
| `/softban` | Ban+unban to clear messages | 🔜 |
| `/case` | v1 live: view / list — reason / edit next | ✅ |
| `/note` | sub: add / list / remove — mod notes (Dyno parity) | 🔜 |
| `/modstats` | Per-moderator action counts | 🔜 |
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
| `/snipe` | Recent deleted messages (per-channel ring buffer) | 🔜 |
| `/reminder` | sub: set / list / delete / channel; natural durations (`1h30m`) | 🔜 |
| `/calc` | Math expression | 🔜 |
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

### K. Leveling — 3

| Command | Notes | Status |
| --- | --- | --- |
| `/rank` | Card rendering (canvas) | 📅 |
| `/leaderboard` | — | 📅 |
| `/level` | sub: set / reset; XP importer (MEE6/Carl/Dyno) | 📅 |

### L. Giveaways — 1

| Command | Notes | Status |
| --- | --- | --- |
| `/giveaway` | sub: start / end / reroll; button entry, requirements, DM winner | 🔜 |

### M. Tickets — 1

| Command | Notes | Status |
| --- | --- | --- |
| `/ticket` | sub: open / close / add / remove / rename + panel (paid in incumbents) | 📅 |

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
| `/automod` | sub: rulesets / toggle / logs / violations; built-in: invites, links, mentions, caps, words, spam (YAGPDB-pattern, free) | 🔜 |
| `/antinuke` | Wick-style guardian: mass-action detection, quarantine, panic mode, backups (audit-log driven) | 📅 |

### R. AI — 1

| Command | Notes | Status |
| --- | --- | --- |
| `/ai` | sub: ask / summarize / translate / thread-summary; BYO OpenAI-compatible endpoint per guild (`research/03`) | 📅 |

### S. Music — 1

| Command | Notes | Status |
| --- | --- | --- |
| `/music` | play/skip/queue/etc. (Lavalink; P5 per MASTER-PLAN) | 📅 |

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
