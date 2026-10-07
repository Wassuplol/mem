# 05 · Dashboard UX Teardown & Build Accelerators

*Research for the flagship community-management bot. Compiled Oct 7, 2026.*

**Method note:** all library/repo facts in §4 were verified live against the GitHub and npm APIs on Oct 7, 2026 (stars, last push, versions, publish dates, licenses). The dashboards in §1 sit behind Discord OAuth login walls, so their IA was reconstructed from official docs, changelogs, screenshots and walkthroughs — not live logins. Competitor-blog claims are labeled inline; unverifiable items are flagged in §6. Nothing here is fabricated.

---

## 1. Teardown: how the incumbents organize their dashboards

### MEE6
**IA.** Two panes: a left **"Plugin Index"** plus a right-hand plugin configuration area (per MEE6's own Getting Started help article). Plugins are grouped — the wiki lists *Server Management* (Automations, Welcome & Goodbye, Custom Commands, Reaction Roles, Invite Tracker, Moderator, Ticketing), *Utilities* (Polls, Embed Messages, Reminder, Statistics/Temporary Channels…) and *Social Alerts*; the support portal adds newer islands (AI Plugins, Giveaways, Monetize, Web3, Bot Maker, Bot Personalizer).
**Onboarding.** No wizard: log in → "Setup" adds the bot → enable each plugin individually. The Moderator plugin is tabbed (Automod Rulesets, Automated Actions, Admin immunity, Commands with per-role/channel allow/deny).
**Builders.** Reaction Roles supports emoji and button modes with styled embeds; a standalone Embed Messages plugin lives under Utilities.
**Permissions.** Dashboard access rides on Discord admin roles; granular non-admin access exists only via **"Bot Master" — a Premium feature**.
**Sentiment.** 2025's dominant r/discordapp theme is paywall rage — "Literally everything MEE6 is used for is now locked behind a paywall"; "Remember when MEE6 was usable? …$12/month". Even lifetime subscribers say they stopped recommending it; praise is nostalgic.
**Design.** Functional but dated two-pane forms; premium upsell inside config screens.

### Carl-bot
**IA.** One dashboard at carl.gg organized by feature: Reaction Roles, Moderation (modlogs, timed punishments, sticky roles, infraction history), Automod, Logging, Welcome Messages, Suggestions, User Engagement, Custom Commands (TagScript), Utilities.
**Reaction-role builder (the one to study).** "Create new reaction role" → pick a message mode: **Post embed**, **Use message ID**, or **Use most recent message** → choose channel, write content, add emoji→role pairs, set per-message options (allowed/blacklisted members; unique/verify/reversed/binding/temporary). 250 pairs free, 1000 with Premium (~$8/mo).
**Weakness.** Docs and most tutorials still teach the command flow (`!rr add <msgid> 🟢 @Green`) with message-ID copy-paste — a UX smell to eliminate. A competitor comparison (BotGhost, vendor blog) notes the dashboard editor exists but "most muscle memory uses the commands."
**Sentiment.** r/discordapp: *"Carl is definitely way more approachable and less overwhelming"* (vs YAGPDB). A 2026 vendor review calls it "one of the best-organized control panels in the bot ecosystem" (PeakBot — competitor, discount accordingly).

### YAGPDB
**IA.** A server-rendered Control Panel at yagpdb.xyz/manage whose page order *is* the docs order ("features as they appear in the order on the control panel" — official help center): Automod rulesets, Logging, Notification feeds, Custom Commands with a Go-template language, Role Commands, Self-assignable roles, Soundboard.
**Access model.** A dedicated Control Panel Access page: read access by role, "all members" toggle, even "users not part of your server"; write access by role with a blunt warning that holders can edit everything.
**Onboarding.** First-run docs instruct you to enable every command before anything else — friction as ritual.
**Sentiment.** Power users love the scripting; casual admins bounce off. Reddit consistently frames it as dense vs Carl-bot; a 2026 vendor comparison: "functional but denser… you will read [the docs]" (PeakBot, competitor). A 2022 r/discordapp thread recommends against it ("nearly as bad if not worse" — 403 at fetch; title/description only).
**Design.** The oldest-looking panel of the set; no redesign evidenced as of Oct 2026.

### Wick
**IA.** The cautionary tale that became the best case study: V5 (Oct 2022) rebuilt the dashboard "from scratch… as that has been the complaint of several" (official changelog). Left sidebar; an **Overview page** listing "issues to fix" and a systems summary; related settings linked together.
**Onboarding.** Full **Setup Wizard**: auto-setup step provisions essentials, then granular skippable steps (joingate, verification, whitelist, rescue key) with interactive examples of what each mode does. V5.1.0 made most settings **off by default for new servers**.
**Systems.** Custom Permits (enforced vs optional; roles-vs-users split), warns-as-points with punishment ladders, a Discord AutoMod superset panel, appeals site wired to the dashboard, backups panel, mod notes, lockdown panel, Custom Discord Logging across ~30 event types with per-event channels.
**Access.** Owner + Trusted Admins; trusted admins explicitly cannot manage anti-nuke.
**Complaints.** The wizard exists because of real complaints (quoted verbatim in the changelog); third-party 2026 reviews still call the rule system a "full weekend" to learn; r/discordhelp and r/discordapp threads show users confused by verification behavior. Premium pricing appears as both $5 and $8/mo across directories (unresolved).

### Ticket Tool
**IA.** The cleanest single-purpose template. Left nav: **Server Info, Server Configs, Command Configs, Panel Configs (default landing), Custom Commands, Dashboard History, Statistics** (+ Customize Bot), with a documented mobile hamburger menu.
**Panel builder.** Panels are first-class objects: selector with `+`, clone/rename/send-to-channel/set-count/update-in-place/delete; each supports **Buttons or Dropdown**; a "Frequently Used Configs" block (Support Team Roles, Category, Panel Message, Ticket Message) exposes the 20% of settings most admins touch.
**Stats & audit.** Per-panel graphs with adjustable lookback, claimed-ticket stats, active-ticket stats — **beyond 7 days is Premium**. Dashboard History logs every dashboard change with column filters (an underrated trust feature).
**Sentiment.** Praised for depth at scale (docs claim 4.6M+ servers, 435M tickets); criticized for dashboard-heavy setup ("most time wiring up panels" — PeakBot, vendor) and premium pricing changes (r/TicketTool, 2024–2025).

### Newcomer A: SCNX (scnx.app)
**IA.** Module-catalog model: select server → browse **65+ modules** → enable and configure; docs follow a consistent per-module skeleton (Features / Setup / Commands / Configuration).
**Onboarding.** Four explicit steps (login → add server → accept ToS → done), then optional custom-bot creation where you paste a token and SCNX validates it ("Check my token & create bot").
**Standouts.** Message editor with embeds, **live preview while you type**, and variable parameters; Trusted Admins with granular dashboard access; 2FA + sudo mode; v3.24.1 (Aug 2026, "biggest update of the year") rebuilt the **Statistics tab — 40+ views served from the bot's own database, never pooled across servers** (privacy-forward analytics). Modules free; tickets/modmail premium (from €4.99/mo). Mostly German community; polish, not marketing, built its 90K-server base.

### Newcomer B: Sapphire (sapph.xyz)
**IA.** Free and polished; 1.8M+ servers (site, Oct 2026). The dashboard revolves around a **Messages template system**: every message the bot sends is editable in a message editor with Edit and Use tabs, an interactive `+ Embed` editor, a live preview pane, and a **"Load" button that imports a message by pasting its Discord link**. Reaction roles are built as message components (buttons/select menus) inside that editor.
**Depth.** 80+ log types with ignore lists; 10+ automod modules; case system; Twitch/YouTube/TikTok notifications.
**Sentiment.** A top.gg review: *"Better than mee6, Dyno or carl-bot and it's completely free… easy to understand web interface."*
**Weakness.** No public evidence of statistics depth like SCNX's; settings storytelling is spread across modules.

**Cross-cutting takeaway:** the market rewards (1) a wizard that yields a working server fast, (2) an overview page that turns config into a checklist, (3) message editors with Discord-faithful live preview, (4) stats/logs served from the guild's own data. It punishes paywalls inside config, scripting/message-ID-only flows, and unguided density.

---

## 2. Proposed information architecture for our dashboard

### 2.1 Principles
- **Server-scoped shell**: collapsible left sidebar (mobile drawer), server switcher, Cmd+K global search across pages/settings/commands.
- **Modules extend the nav**: `packages/core` module registry → each plugin/module contributes nav groups + pages + settings schema; core nav order never shifts.
- **Guided first run**: wizard + Overview checklist + "most settings off until configured" defaults, with a one-click "recommended defaults" path.
- **Config has provenance**: dashboard-change audit log, backups/export, explain-why-the-bot-acted surfaces.

### 2.2 Sitemap (server scope `/dashboard/[guildId]/…`)

```
Overview                 /overview              setup checklist, health, recent events, quick actions
Moderation
  Cases & Infractions    /moderation/cases      searchable cases, details, appeals
  Punishments            /moderation/punishments warn→punish ladder, temp actions
  Mod Notes              /moderation/notes
  Verification           /moderation/verification channel/DM/modal modes, interactive examples
AutoMod
  Rules                  /automod/rules         trigger → conditions → action builder
  Filters & Exemptions   /automod/filters       words/links/invites/spam; role/channel/user exemptions
  Discord AutoMod Sync   /automod/discord       mirror of Discord's native rules
Security
  Anti-Nuke / Anti-Raid  /security/anti-nuke     limits, whitelists, quarantine
  Join Gates             /security/join-gates   account age, username filters, raid timelines
Logging
  Event Configuration    /logging/config        30+ event types → channels, per-event toggles
  Log Viewer             /logging/viewer        live stream + history (see 2.5)
Role Menus
  Menus                  /roles/menus           buttons/selects, unique/verify/reversed/binding
  Auto Roles             /roles/auto
Leveling & Engagement
  Levels & XP            /levels                rates, role rewards, formulas
  Leaderboard            /levels/leaderboard
  Starboard / Giveaways  /starboard, /giveaways
Welcome & Leave
  Welcome / Goodbye      /welcome               messages, DMs, boost messages, auto-roles
Tickets
  Panels                 /tickets/panels
  Forms & Questions      /tickets/forms
  Snippets               /tickets/snippets
  Transcripts            /tickets/transcripts   in-dashboard HTML transcripts
Modmail                  /modmail                inbox routing, categories, opt-in AI summaries
Temp Voice               /temp-voice             hubs, interface buttons, limits
Custom Commands
  Commands               /commands               blocks/script editor, variables, triggers
  Schedules              /commands/scheduled
Fun & Utility            /fun                    command listing, role/channel gating
Analytics
  Overview               /analytics              members, messages, voice, joins/leaves, moderation
  Tickets                /analytics/tickets      per-panel stats, ungated
  Leaderboards           /analytics/leaderboards
Customization
  Message Studio         /messages               every bot-sendable message, editor + live preview
  Embed Builder          /embeds                 standalone builder + template library
  Branding               /branding               bot profile, embed footer defaults
Settings
  Modules                /settings/modules       enable/disable, health
  Team & Permissions     /settings/team          trusted users, per-area read/write matrix
  Audit Log              /settings/audit         who changed what, when
  Backups                /settings/backups       export/import/auto-backup
  API & Webhooks         /settings/api
(Footer: Help/Docs, Status. No billing — all features free; "Instance" info for self-host vs cloud.)
```

### 2.3 Layout: module config page (the workhorse)
- **Header**: module name, one-paragraph "what this does" (Wick's explanation-first pattern), `Enabled` switch, docs link, status line ("Active on 3 channels").
- **Body**: left sub-nav of module sections (from the settings schema) + form column + **sticky right preview column** for anything that emits a Discord message (SCNX/Sapphire pattern).
- **Controls**: searchable role/channel/user pickers (keyboard-first comboboxes), exemptions as removable chips, inline validation, per-field help, "advanced" disclosures folded by default (keeps YAGPDB-style density out of the default view).
- **Save model**: dirty-state sticky save bar ("Save / Discard", "last saved 2m ago"), navigation guard, optimistic save with rollback toast, no silent autosave.
- **Test affordances**: "Send test message / Run test" wherever preview isn't enough (Wick's interactive-example lesson).

### 2.4 Layout: embed builder ("Message Studio + Embed Builder")
- **Split pane**: left form editor, right **live preview as a real Discord message** (Discord-faithful rendering library, §4).
- Editor: content area with Discord-markdown support and per-field character counters against Discord limits; embed blocks (author, title, description, fields with drag-to-reorder and inline toggle, image/thumbnail with upload, footer, color, timestamp); variable chips (`{user}`, `{server}`, `{count}`) inserted by click; template selector.
- Actions: **import from message link** (Sapphire's "Load"), duplicate, save-as-template, light/dark client previews, "Test-send to channel", pre-send permission warnings (Ticket Tool pattern).
- **Components V2**: Discord's newer component system isn't renderable by mainstream community React libraries yet (§6) — ship classic embeds + buttons/selects first; add a V2 payload mode for the bot separately.

### 2.5 Layout: log & audit viewer
Two modes behind one nav entry:
- **Live Log**: SSE (over Redis pub/sub) stream of normalized events (type, severity, actor, target, channel, summary, payload). Pause/resume, no auto-scroll hijack; filter bar (event type, user, channel, date range); virtualized list (thousands of rows); monospace payloads with safe coloring; row → detail drawer with before/after diff, jump-to-Discord link, "mute this event type".
- **Dashboard Audit**: filterable table of config changes (who/what/when — Ticket Tool pattern), our team-trust feature.
- Day-one scope: event list, filters, detail drawer, CSV export; realtime = live tail with backoff reconnect.

### 2.6 Layout: analytics & leaderboards
- KPI row (members, messages, voice minutes, tickets opened, infractions) with sparklines, time range (24h/7d/30d/90d/custom), compare-to-previous.
- Responsive charts (component-library chart primitives, Recharts under the hood) — line/area for trends, bars for distributions.
- **Leaderboards**: rank, member, primary/secondary metric, sparkline, period selector; deep-linkable (`?period=weekly`) for sharing; per-guild data only, never cross-guild pooling (SCNX's privacy selling point).

---

## 3. UX patterns to copy / avoid

**Copy:**
1. Wizard with granular skippable steps + auto-setup (Wick V5/V5.1).
2. Overview page as health checklist — "issues to fix" + systems summary (Wick).
3. Live preview beside every message editor; interactive examples for invisible behaviors (Wick verification, SCNX editor).
4. Message Studio: every bot-sent message editable (Sapphire, SCNX).
5. Import content by pasting a message link; save-as-template (Sapphire).
6. Visual role-menu builder with message modes, buttons/selects, unique/verify modes — without message-ID pain (Carl-bot, fixed).
7. "Frequently used configs" shortcuts on complex modules (Ticket Tool): expose the 20% that 80% of admins touch.
8. Dashboard change history with filters (Ticket Tool) + backups/export (Wick).
9. Scoped team access: per-area read/write matrix, trusted admins that can't touch security settings (YAGPDB access page, refined by SCNX/Wick permits).
10. Stats from the guild's own DB, rich per-view analytics, ungated (SCNX) — our free-forever differentiator.
11. Responsive/mobile-usable dashboard (Ticket Tool documents mobile nav — table stakes for phone-first admins).
12. Defaults: most settings off until configured, with recommended-defaults preset (Wick 5.1).

**Avoid:**
1. Paywalls/locked toggles inside configuration (MEE6's 2025 reputation) — our UI must visibly have zero premium gates.
2. Scripting languages or message IDs as the *primary* setup path (YAGPDB, Carl-bot docs); offer scripting as an optional power path, GUI-first.
3. Dense single-screen option walls (YAGPDB) — progressive disclosure; advanced stays folded.
4. Dashboard access tied to Discord admin perms or a paid tier (MEE6's Bot Master).
5. Year-long dual-dashboard migrations behind flags (Wick V4→V5) — migrate config automatically, keep old config exportable.
6. Silent config loss: no autosave without feedback; no navigation that discards unsaved work; avoid Ticket Tool-style quirks (re-pasting a message URL just to apply a sent panel's changes).

---

## 4. Build accelerators (all statuses verified Oct 7, 2026)

### 4.1 Dashboard kit & starters
| Candidate | What it is | Verified status | Fit / verdict |
|---|---|---|---|
| **shadcn/ui + Recharts chart component** | Copy-paste component system; chart wrapper built **on Recharts v3** | shadcn docs updated (chart = Recharts v3; sidebar/data-table present); recharts repo 27.6k★, pushed 2026-10-06; recharts@3.10.1 | **Adopt** as UI + charts base; unwrapped Recharts = no lock-in |
| **Kiranism/next-shadcn-dashboard-starter** | Next.js + shadcn admin starter | 7,105★, pushed 2026-09-11 | **Primary shell reference/fork** (sidebar, breadcrumbs, auth wiring) |
| **arhamkhnz/next-shadcn-admin-dashboard** | Next.js 16 + shadcn template | 3,126★, pushed 2026-10-07 | Strong alternative; cherry-pick patterns |
| **satnaing/shadcn-admin** | Admin UI, Vite | 15,623★, pushed 2026-09-10 | Patterns only (we're Next-based) |
| **Qualiora/shadboard** | Next.js admin template | 727★, pushed 2025-12-13 | Backup option; slower cadence |
| **refinedev/refine** | React admin/CRUD framework | 35.7k★, pushed 2026-09-10; @refinedev/core 5.0.12 | Optional; likely heavyweight for a bot config UI |
| **Tremor (@tremor/react)** | Chart/UI components | **Avoid**: Vercel acquired Tremor (Vercel blog); @tremor/react frozen at 3.18.7 (2025-01-13); repo last push 2025-10-10; issue #148 (Sept 2025) reports stagnation | Do not adopt |

### 4.2 Auth (Discord OAuth2)
| Candidate | Verified status | Fit |
|---|---|---|
| **better-auth** | 1.7.7 (2026-09-30); ~12.6M weekly downloads | **Recommended.** First-class Discord provider incl. `bot` scope + permissions; Auth.js has joined Better Auth (banner on authjs.dev) |
| **Auth.js / NextAuth** | next-auth 4.24.15 stable (2026-07-20); v5 still beta (5.0.0-beta.32); repo 28.4k★ active | Fine if Next-idiomatic auth wanted; mind v5-beta risk + Better Auth convergence |

### 4.3 Log viewer & realtime
| Candidate | Verified status | Fit |
|---|---|---|
| **@melloware/react-logviewer** | 6.6.0 (2026-09-27), MPL-2.0, 68.8k weekly dl, repo active (pushed 2026-10-05) | Best ready-made terminal-style log pane (virtualized, streaming rows); MPL-2.0 is file-level copyleft — acceptable unmodified, verify obligations |
| **@tanstack/react-virtual / react-window / react-virtuoso** | 3.14.13 (2026-09-14) / 2.3.3 (2026-09-22) / 4.18.16 (2026-09-29) | For a custom event list; react-window/virtuoso simplest |
| **ansi-to-react** | 6.2.6 (2026-01-24), 599k weekly dl | Render ANSI-colored bot logs in React |
| **socket.io** | 4.8.4 (2026-09-25) | Transport if SSE limits; SSE/EventSource + Redis pub/sub suffices for one-way log tails |

### 4.4 Discord-specific rendering (previews, embeds, transcripts)
| Candidate | Verified status | Fit |
|---|---|---|
| **@skyra/discord-components-core / -react** | 4.0.2 npm (2025-06-18), repo 349★ pushed 2026-10-05, MIT, ~925 weekly dl | **Adopt** for Discord-faithful message previews |
| **@discord/markdown-react + @discord/markdown-wasm** | 0.7.0 (2026-09-22) / 0.10.0 (2026-10-06), MIT, ~62–63k weekly dl, official `@discord` npm scope | **Adopt** for Discord-markdown rendering in editors/previews |
| **discord-markdown-parser** (Derock) | 1.3.1 (2025-12-23), Apache-2.0, 16k weekly dl | Parser alternative if official API doesn't fit |
| **discord-html-transcripts** (Derock) | 3.3.0 (2025-09-12), repo 297★ active, MIT | **Adopt** for ticket transcripts |
| **@penwin/discord-components-react-render** | 4.5.0 (2026-08-27), 114 weekly dl | Community fork; fallback only |
| **@arcscord/components** | 1.0.2 (2026-09-20) | Typed helpers for Components V2 payloads (bot-side), not a React renderer |

### 4.5 The "discord-dashboard" ecosystem (explicit evaluation)
| Candidate | Verified status | Fit |
|---|---|---|
| **discord-dashboard (npm)** | Stable **2.3.62 from 2023-07-03**; v3 betas frozen at `3.0.0-beta.31` (Nov 2022); repo Discord-Dashboard/Core 278★, last push 2026-07-09; **license Shareware/CC BY-NC-SA — non-profit only, paid license for profit use**; ~252 weekly dl | **Do not adopt.** Stale stable + non-commercial license + EJS/server-rendered architecture vs our Next.js stack |
| **@developer.krd/discord-dashboard** | 0.2.0 (2026-02-25), MIT, repo 6★ (created 2026-02-18, idle since 2026-02-25), ~2 weekly dl | Too immature; **watchlist**. Market signal: ships its own "shadcn-magic" theme |
| **dbd-soft-ui (theme)** | Last npm 1.7.40-beta.1 (2024-09-30); repo now Discord-Dashboard/Soft-UI, 40★, beta | Skip — bound to the stalled framework |
| **Discohook (discohook/discohook)** | Repo 185★, pushed 2026-10-06, active | Not a library — **UX reference** for our embed builder |

**Recommended stack:** Next.js + shadcn/ui (Recharts charts) on a starter shell; Better Auth (Discord); skyra discord-components + @discord/markdown-react for previews; @melloware/react-logviewer or virtualized custom list (react-window) for logs; SSE via Redis pub/sub; discord-html-transcripts for ticket transcripts. Zero unmaintained core dependencies.

---

## 5. Sources

**Bots — official docs/pages**
- MEE6: help.mee6.xyz/en/articles/605731-getting-started-with-mee6 · wiki.mee6.xyz/en/plugins · mee6.xyz/en/tutorials/how-to-start-using-moderation-tools-on-your-discord · mee6.xyz/en/plugins/reaction-roles
- Carl-bot: carl.gg · docs.carl.gg
- YAGPDB: help.yagpdb.xyz/docs/welcome/getting-started/ · help.yagpdb.xyz/docs/core/control-panel-access/ · help.yagpdb.xyz/docs/welcome/introduction/
- Wick: docs.wickbot.com/changelog/v5.x/5.0.0/ (also 5.1.0, 5.2.0, 5.3.0) · docs.wickbot.com/faq/
- Ticket Tool: docs.tickettool.xyz/dashboard/within-the-dashboard.md · /dashboard/panel-configs · /beta-docs/dashboard/statistics.md · /beta-docs/dashboard/dashboard-history.md
- SCNX: scnx.xyz · docs.scnx.xyz/docs/setup · docs.scnx.xyz/docs/custom-bot/ · scnx.xyz/changelogs/v3.24.1 · docs.scnx.xyz/docs/support-bot/general/bot-configuration
- Sapphire: sapph.xyz · top.gg/bot/678344927997853742

**Community/vendor sentiment (Reddit & reviews; competitor blogs flagged inline)**
- r/discordapp 1kon2am · 1izj5k2 · 1p8hg2l (MEE6 paywalls) · p5dgau (Carl vs YAGPDB) · z4fan1 (Carl/YAGPDB criticism; title/desc only, 403) · 1eys5by & r/discordhelp 1qqoeei (Wick verification confusion) · r/TicketTool 1dw2rn7 (premium pricing) · r/discordbots 1vfsdb1 (Carl maintenance perception)
- peakbot.pro/blog/yagpdb-vs-carl-bot-2026 · peakbot.pro/blog/tickety-vs-ticket-tool-discord-ticket-bot-2026 · botghost.com/carl-bot-alternative · unstore.io Wick listings · golinuxcloud.com/carl-bot-reaction-roles · n3tc0rd.digitalpress.blog/wickbot-overpowered-update · medium.com/@jatingera200 MEE6 dashboard tutorial

**Libraries (GitHub/npm verification)**
- github.com/nextauthjs/next-auth · authjs.dev/getting-started/providers/discord · better-auth.com/docs/authentication/discord · npm: better-auth
- ui.shadcn.com/docs/components/chart · npm: recharts · github.com/satnaing/shadcn-admin · github.com/Kiranism/next-shadcn-dashboard-starter · github.com/arhamkhnz/next-shadcn-admin-dashboard · github.com/Qualiora/shadboard (via GitHub search)
- github.com/tremorlabs/tremor · issue #148 · vercel.com/blog/vercel-acquires-tremor · npm: @tremor/react
- github.com/melloware/react-logviewer · npm: react-window, @tanstack/react-virtual, react-virtuoso, ansi-to-react, socket.io
- github.com/skyra-project/discord-components · npm: @skyra/discord-components-react, @penwin/discord-components-react-render, @discord/markdown-react, @discord/markdown-wasm, discord-markdown-parser
- github.com/ItzDerock/discord-html-transcripts · github.com/discohook/discohook · github.com/refinedev/refine
- github.com/Discord-Dashboard/Core · github.com/developerKRD/discord-dashboard · github.com/Discord-Dashboard/Soft-UI · npm: discord-dashboard@2.3.62 (license text), @developer.krd/discord-dashboard@0.2.0, dbd-soft-ui

API snapshots used for all "verified" claims: GitHub REST (stars, archived, pushed_at, license) and npm registry/API (latest version, publish dates, weekly downloads), queried 2026-10-07.

## 6. Confidence & gaps

**High confidence (directly verified):** every library/repo/package fact in §4; official-doc quotes for MEE6 (two-pane dashboard, plugin groups, Bot Master premium), Carl-bot (reaction-role modes, 250-pair cap), YAGPDB (access model, enable-all-commands first-run), Wick (V5 rebuild rationale, wizard steps, permits, disabled-by-default), Ticket Tool (nav list, panel flows, statistics/history pages, 7-day stats gate), SCNX (setup steps, statistics rebuild, module count), Sapphire (message editor, load-from-link, 80+ log types).
**Medium confidence:** sentiment characterizations — Reddit skews negative for MEE6/YAGPDB and positive for Carl-bot/Sapphire, but Reddit is unrepresentative; PeakBot/BotGhost/unstore claims are vendor-written and flagged. Wick premium pricing appears as both $5 and $8/mo — unresolved.
**Low confidence / not verified:** live dashboard internals (behind OAuth — never logged in; no fabricated nav lists or screenshots); mobile responsiveness per bot (only Ticket Tool documents a mobile nav); YAGPDB privacy criticism (thread body 403; title only); exact current MEE6 Moderator tab names (2023 source); whether any community React library renders Discord **Components V2** — assume not, plan a custom renderer if needed; Discohook's license (UX reference only, nothing copied).
**Excluded for budget, not judgment:** a third newcomer teardown (Arcane's leveling dashboard is the strongest remaining candidate) — small follow-up if wanted.
