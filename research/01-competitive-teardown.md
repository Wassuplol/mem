# Competitive Teardown: Discord Community-Management Bots
**Research date: October 7, 2026.** All scale numbers were read live from top.gg's own bot widgets (fetched Oct 7, 2026; the widgets render server/vote counts as images — values below were read from them) and cross-checked against TopStats.gg (a third-party mirror of top.gg data) and vendor sites. Pricing was taken from vendor billing pages and official announcements fetched on Oct 7, 2026 unless noted.

---

## 1. Scale snapshot (servers, Oct 7, 2026)

| Bot | Servers | top.gg/audited rating | Model |
|---|---|---|---|
| MEE6 | 19,500,000 | **2.61/5** (982 reviews, top.gg) | Premium $5.99–$11.99/mo + separate paid AI product |
| Dyno | not listed on top.gg (see §2.2); site claims "over 11.6M" | 87/100 (373 ratings, audit Aug 2026) | Premium $4.99–$11.99/mo |
| ProBot | 10,200,000 | 4.3/5 (5,449 reviews) | Premium $5 / $10 mo |
| Ticket Tool (classic) | 5,793,652 | 4.07/5 (183 reviews) | Premium $8/mo |
| Nekotina (adjacent, free-first) | 4,289,255 | 4.73/5 (10,111 reviews) | Mostly free; cosmetics |
| Mimu | 4,018,667 | — | Free core |
| Koya (breakout) | ~3,955,000 | 95/100 (560 ratings) | Free-first; Premium €4.99/mo |
| YAGPDB | 3,538,447 | (few reviews) | Free + Patreon premium slots from $5/mo |
| Carl-bot | 3,395,239 | 62/100 (594 ratings) | Patreon $7.99–$35.99/mo per server slots |
| Arcane (breakout) | 3,110,399 | — (109,921 monthly votes) | Premium $7/mo |
| Sapphire (free-only) | 1,845,200 | 96/100 (215 ratings) | **Free only** (+branding) |
| Wick | 1,000,349 | 84/100 (259 ratings) | Premium $5/mo, VIP $20/mo |
| Statbot | 863,653 | — | Modular paid upgrades |
| Sesh | 314,068 | — | Premium $6.99/mo |
| Ticket Tool (new app, May 2026) | 12,751 | 100/100 (1 rating) | Free / $5 / $12 / $25 |

Key takeaway: the category leaders are shrinking in trust (MEE6's 2.61/5 top.gg rating) while free-or-cheap, dashboard-first newcomers (ProBot, Koya, Arcane, Sapphire, Nekotina) hold the highest ratings. The single biggest measured gap is **price vs. free value**, not features.

---

## 2. Incumbent teardowns

### 2.1 MEE6 — still the default, now the cautionary tale
- **Coverage:** moderation, automod, leveling/XP with rank cards and role rewards, welcome messages/cards, reaction roles (free cap ~40), custom commands, giveaways, social alerts (Twitch/YouTube/Reddit/Twitter), applications, voice recording, server monetization tools, "Custom Bot" branding, and a separate MEE6 AI product.
- **Free vs paywalled:** the defining pattern — features exist but most meaningful function is premium. Community consensus: only a handful of features are usable free. Paid adds extended limits on every plugin, custom commands with role/DM actions, embeds, custom welcome images, unlimited reaction roles, plus the Bot Personalizer addon. MEE6 AI is billed separately (Personal Basic $1.74/mo billed yearly, Ultra $4.99/mo, server-wide plans from $3.49/mo). The AI prompts/messages are broadly reported as not disableable without premium.
- **Pricing (fetched Oct 7, 2026, 50%-off promo live):** $5.99/mo intro (regular $11.99/mo); yearly $24.99 first year then $49.99/yr; lifetime $44.99 promo (regular $89.99), "save 83%".
- **Dashboard:** historically praised as the easiest to use; recent independent tests call it "dated and slow" (low-confidence, marketing-adjacent source).
- **Scale/recent:** 19.5M servers; top.gg rating collapsed to 2.61/5. Recent changes are price promotions and AI monetization, not free-value additions.
- **Sentiment:** see §5 — sustained, hostile.

### 2.2 Dyno — the reliability story has flipped
- **Coverage:** moderation and ban ladder, 19 automod filters, logging, starboard (advanced version paid), autoroles, custom commands, autoresponders, giveaways, forms (applications), reaction-role menus (3 free), levels, tickets (newer), feeds (YouTube/Twitch/TikTok/Reddit/Kick), voice-text linking, custom branded bot on top tier.
- **Free vs paywalled (from Dyno's own docs table):** free caps: 3 reaction-role menus, 25 custom commands, 10 autoresponders, 3 giveaways/forms/autoroles, 1 autodelete/automessage/autoban rule. Standard ($4.99/mo, $49.99/yr) unlocks unlimited limits, tickets, levels, advanced automod, advanced starboard, autopurge, slowmode, voice-text linking; Premium ($6.99/mo, $59.99/yr) adds unlimited feeds; Custom ($11.99/mo, $99.99/yr) is a fully hosted branded bot.
- **Recent (important):** Dyno suffered repeated outages through summer 2025 ("We're aware that Dyno is currently offline again across all servers. This includes Premium and Custom bots" — r/Dynodiscord, Sep 2025), and on **May 19–20, 2026 it took all services offline for a 24-hour physical data-center migration** after "multiple back-to-back failures" (Dyno/community announcements). As of our fetches (Oct 7, 2026) Dyno's **top.gg listing is not retrievable** (page returns "does not exist" via multiple fetchers; the widget renders 0 servers) — we could not confirm the reason. Its own site is up and claims 11.6M servers.
- **Dashboard:** well-liked, modular; third-party tests rate it fast and mature but "aging".
- **Sentiment:** still respected for logging ("we use it specifically for logging; best-in-class server logs") but the trust narrative has moved from "most reliable" to "is it going down again?".

### 2.3 Carl-bot — the free-tier technician with a paywalled core feature
- **Coverage:** reaction roles (best-in-class), automod (8 filter types), logging (~24 event types free, no premium gate), custom commands via **TagScript** (unlimited tags, 25k chars, real scripting), triggers, suggestions, starboard (core free), giveaways, embeds, reminders, sticky messages (paid), autoroles, social feeds (YouTube/Twitch only), levels (**premium-only**), temporary voice (reported premium), "Drama Watcher"/`defer` moderator-voting punishment (premium).
- **Free vs paywalled (from Carl-bot's free-vs-premium table):** free — 250 reaction roles/server, 5 YouTube + 2 Twitch alerts, 100 weblog entries, full automod/punishments (11 combinable punishments, durations like `3h42m`), logging. Premium — reaction roles 1,000, YT 20/Twitch 5, weblog 500, triggers 50→75, levels, sticky messages, auto purge, voice-role links, timed reaction roles, separate farewell channel, Drama Watcher, custom bot avatar/banner (added late 2025).
- **Pricing (official Patreon announcement; June 2025 reset):** 1 server $7.99; 2 $12.99; 3 $16.99; 5 $24.99; 8 $35.99 — Patreon-billed, transferable server slots (`/premium addpremium`); existing subscribers grandfathered. Patreon page shows entry from £6.50/mo in GBP regions.
- **Notable absences:** **no ticket system at any tier**, no anti-raid module (honeypot + premium lockdown instead), no music, no economy.
- **Dashboard:** repeatedly praised — "super easy setup", strong role management.
- **Recent:** Aug 8, 2025 premium feature release; personalization (per-server avatar/banner) launched 2025.

### 2.4 Wick — best-in-class security, worst-in-class friction
- **Coverage:** anti-nuke (staff/bot action thresholds, quarantine, permission-override watch), anti-raid (join gate: new accounts, no avatar, suspicious names, invite-in-username, unverified bots), join-raid detection, verification/captcha, automod (spam/mentions/caps/emoji/links/profanity/NSFW scanning/malicious link DB), panic mode, advanced lockdown, quarantine, purge (up to 1000 messages), mod cases/logs, server backups + restore, heat-based adaptive spam scoring (free), Discord AutoMod integration (dashboard drives native AutoMod rules since v5.3.0).
- **Free vs paywalled:** core defense free. Premium ($5/mo): advanced anti-raid, advanced anti-nuke, advanced automod, advanced quarantine, smart backups, advanced lockdown, customizable verification, higher ratelimits. VIP ($20/mo): dedicated resources, custom branding, low latency, **12 premium servers** (~$1.67/server).
- **Vendor-stated stats (wickbot.com, Oct 2026):** 51K raids stopped, 8.7M nuke attempts, 1.3M banned accounts, 9.5M quarantined, 20M members reached.
- **Dashboard/UX:** the V5 rewrite (new dashboard, setup wizard, custom permits, points-based warns) was an explicit response to "Wick is too hard to setup" — yet 2025–26 users still say it's complicated, and review quotes include "Paywall ruins the bot — Prune is one of the most well-known ways to completely wipe a server, yet its locked behind a paywall. That's absurd" (wickbot.com/reviews).
- **Recent:** V5 series with Discord AutoMod integration; operational anti-raid dominance at large servers.

### 2.5 YAGPDB — the open-source power tool with a 2019 dashboard
- **Coverage:** everything core free — moderation, logging, role menus, autorole, automod (rule-based, 25 rules/10 rulesets/5 lists free), feeds (YouTube up to 50/guild, Reddit), custom commands in a **Go-template-style scripting language** (1M ops/execution free), soundboard, reddit, notifications, Discord slash/context commands.
- **Free vs paywalled (help.yagpdb.xyz/premium):** premium raises automod limits (20→100 triggers, 25→150 rules, 5→25 lists, 10→25 rulesets), enables retroactive autorole and bulk role, template ops 1M→2.5M, YouTube feeds 50→250, custom slash commands 10→50 (subcommands 3→10), context-menu commands 5→15, etc. Premium via **Patreon from $5/mo per premium slot** (a slot is tied to a Discord user and assigned to one server).
- **License/repo (verified Oct 7, 2026):** open source — GitHub `botlabs-gg/yagpdb`, **MIT License** (LICENSE file: "MIT License, Copyright (c) 2019 jonas747"); latest release v2.87.0 (published Sep 25, 2026); v2.86.0 (Sep 2026) raised free/premium custom-command limits.
- **Dashboard:** functional, dated, "practical rather than polished"; steep learning curve is the universal complaint ("Nothing works out of the box… the learning curve is real"); no AI, English-only; support moderation quality is a recurring complaint (e.g., a top.gg review alleging hostile support responses).
- **Scale:** 3.5M servers — proof that a free/OSS core + premium-for-limits model sustains millions of installs.

---

## 3. Breakout / newer challengers (verified, not just suggested)

The task's candidate list was verified against top.gg/TopStats; the strongest-momentum picks from the 2025–26 wave are covered in depth below — **ProBot, Arcane, Koya and Sapphire**, plus the new-2026 "Ticket Tool" app and niche specialists.

### 3.1 ProBot — the quiet giant (10.2M servers, rank #4 by servers)
All-in-one: welcome images, in-depth logs, social commands, moderation, automod, autoroles, self-assignable roles, starboard, levels, Twitch/YouTube notifications, server statistics. **Premium Tier 1 $5/mo ($3.33/mo yearly, $40/yr):** advanced protection, more variables, "Executioner" in logs, unban-everyone, temp invite link, invite-specific autorole. **Tier 2 $10/mo ($6.67/mo yearly, $80/yr):** anti-raid, custom bot identity (username/avatar/status), transfer ownership. Free core is genuinely usable. Rating 4.3/5 over 5,449 reviews — the most-reviewed of the big bots after Nekotina. Marketing targets German/Turkish communities; site footer © 2026, actively maintained.

### 3.2 Arcane — leveling specialist with massive engagement (3.1M servers; ~110K monthly top.gg votes)
Leveling-first all-in-one (levels/XP, role rewards, counters, moderation, logs, social alerts, YouTube/Twitch role-sync). **Free:** message + reaction XP, basic rank cards, 15 role rewards, 5 custom commands. **Premium ($7/mo or $75/yr):** voice XP (requires inviting a *second* premium bot instance), custom XP values, rank-card backgrounds, advanced level-up tags, 100 custom commands, unlimited role rewards. Has a worked MEE6 XP import tool — one of the few credible MEE6 migrators. Criticism: the "vote booster" cannot be disabled at any tier, and its premium tiers reportedly scale with member count for some features.

### 3.3 Koya — the breakout that most closely resembles our thesis (~3.96M servers, rank #10)
Free-first all-in-one with an exclusive One Piece RPG engagement hook. **Free:** welcome cards/greeting/join-DM, moderation + automod (attachments, polls, scams), leveling with MEE6/Amari import, social alerts (YouTube/Twitch/Kick/RSS/Reddit/Spotify/Bluesky), reaction-role menus (3 free), tickets (3 panels free), server stats (30 days), counters, mini-games. **Premium (Server €4.99/mo; also User and Adventure tiers; yearly −16%):** 20 reaction menus, 20 ticket panels (unlimited on Pro), claiming + transcripts, 90-day stats retention, vanity URLs, rank-card customization, custom profile; **Pro** adds a fully branded custom bot. Rating 95/100 (560 ratings); fully localized (EN/FR/PT-BR/ES). Koya is the strongest evidence that "free core + affordable limits + fun hook" is the winning 2025–26 formula.

### 3.4 Ticket Tool — ticketing incumbent + a new 2026 challenger
Two products share the name, and we could not confirm a relationship between them:
- **Classic "Ticket Tool"** (top.gg ID 557628352828014614, tickettool.xyz): 5.79M servers, rank #7; premium **$8/mo** (per its docs FAQ; annual options exist); ticketing-only; ping-based legacy UX.
- **New "Ticket Tool" app** (ticket-tool.app, top.gg ID 1506999581722804274, app created ~May 2026): 12,751 servers already. **Free:** 5 categories, 3 panels, 5 active flows, unlimited tickets, transcripts, dashboard. **Community $5/mo:** unlimited panels/categories/flows, public knowledge base, 1-yr retention. **Pro $12/mo:** AI assist (drafts, summaries, sentiment), AI flow nodes, analytics/CSAT/SLA, API, custom KB domain. **Team $25/mo:** multi-server management. Novel: ships a machine-readable spec (`llms-full.txt` + OpenAPI) so AI agents can configure servers.
Sentiment note: Ticket Tool's 2024 move to $8/mo (aligned with Discord's app-subscription policy) generated a public price-change thread on r/TicketTool (https://www.reddit.com/r/TicketTool/comments/1dw2rn7/ticket_tool_premium_subscription_changes/); ticket pricing is a known sore point.

### 3.5 Sapphire — free-only quality benchmark (1.85M servers, 649.6M users reached)
Completely free multi-purpose bot: (auto)moderation **including free AI classification** (limits: 10 messages/server/min; EN/DE only) that extends Discord's native AutoMod rather than duplicating it, welcome messages, reaction roles, join roles, logging (80+ event types), social notifications, full message-customization editor. No levels, no tickets, no music (narrower scope by design). Paid offering is only custom branding (from ~€5). top.gg rating 96/100 (215 ratings) — highest of any audited bot; site partners include OpenAI, Minecraft, Fortnite and VALORANT servers; Reddit routinely recommends it as "the MEE6 replacement" (r/GrowYourDiscord, Nov 2025).

### 3.6 Niche specialists worth noting
- **Sesh** (314,068 servers): Discord calendar/events; free tier generous; **Premium $6.99/mo** adds two-way Google Calendar sync, recurring events, attendee roles with limits/waitlists. Beloved in study/social servers.
- **Statbot** (863,653 servers): server analytics. Premium is à-la-carte upgrades — History (all-time data), Data+, Drilldowns, Statroles+, Statdocks+ — with stacking discounts (exact prices render client-side; not captured). Its paywalled analytics are a recurring gap admins hit.
- **Nekotina** (4.29M servers; 4.73/5 from 10,111 reviews — the most-reviewed bot we checked): free-first anime/economy/music multi-tool; review quote: "La gran mayoría de comandos son completamente gratuitos, mientras que otros bots… 90% premium."
- **Mimu** (4.02M servers): free-core card/embed multi-tool.
- **2025–26 SEO-marketing newcomers** (Vetox, PeakBot, Astero, CommunityOne): aggressive "free everything" comparison marketing; scale unverified — watch-list only.

---

## 4. Cross-bot category matrix (✔ free · $ paywalled/limited · ✖ absent · ? unverified)

| Category | MEE6 | Dyno | Carl | Wick | YAGPDB | ProBot | Arcane | Koya | Sapphire |
|---|---|---|---|---|---|---|---|---|---|
| Moderation cmds | ✔/$ | ✔ | ✔ | ✔ | ✔ | ✔ | $ | ✔ | ✔ |
| Automod | $ | ✔ (19 filters) | ✔ (8 filters) | ✔/$ | ✔/$ | ✔ | ✖ | ✔ | ✔ + AI ($-lite) |
| Logging/audit | $ | ✔ (best-in-class) | ✔ (~24 events free) | ✔ | ✔ | ✔ | $ | ✔ | ✔ (80+ events) |
| Reaction roles | $ (cap ~40) | ✔ (3 menus) | ✔ (250 free) | ✖ | ✔ (rolemenus) | ✔ | ✖ | ✔ (3 free) | ✔ |
| Leveling | $/partial | $ (Standard+) | **$ only** | ✖ | ✖ (via templates) | ✔ | $ (voice etc.) | ✔ | ✖ |
| Tickets | $ (no free embeds) | $ (Standard+) | ✖ | ✖ | ✖ | ? | ✖ | ✔ (3 free) | ✖ |
| Music | ✖ | ✖ | ✖ | ✖ | ✖ (soundboard) | ✖ | ✖ | ✔ (mini-games/RPG) | ✖ |
| Welcome/leave | $ | ✔ | ✔ | ✖ | ✔ | ✔ | ✖ | ✔ | ✔ |
| Temp voice | ✖ | ✖ | $ (reported) | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ |
| Starboard | ? | ✔/$ | ✔ | ✖ | ✖ | ✔ ($ emoji) | ✖ | ? | ✖ |
| Reminders | ? | ✔ (reminders) | ✔ | ✖ | ✔ (via CC) | ✔ | ✖ | ✔ | ✖ |
| Custom commands | $/(limits) | ✔ (25 free) | ✔ (TagScript, best) | ✖ | ✔ (templates, best) | ✔ | ✔ (5 free) | ✔ | ? |
| Anti-nuke/anti-raid | $ | $ | ✖ (honeypot) | ✔/$ | ✖ | **$** (Tier 2) | ✖ | ✖ | ✖ |
| Verification | ? | ? | ✖ | ✔/$ | ✔ (captcha plugin) | ? | ✖ | ✖ | ? |
| AI features | **$ separate** | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✔ free-lite |

---

## 5. Sentiment research — representative threads (2025–2026)

**MEE6 attrition (the dominant narrative):**
- "*Literally everything MEE6 is used for is now locked behind a paywall, and I can't change any server settings I had set prior*" — r/discordapp, May 2025: https://www.reddit.com/r/discordapp/comments/1kon2am/
- "*Seriously even the Basic features which most discord bots provide for free are a literal 'premium' addon… charging for basic features sounds kinda criminal*" — r/discordbots, Nov 2025: https://www.reddit.com/r/discordbots/comments/1pmx6r2/
- "*Mee6 devs are greedy and have very shady practices… AI you can't disable*" — r/discordbots, Apr 2025: https://www.reddit.com/r/discordbots/comments/1k2gakg/
- "*Remember when MEE6 was usable? … any feature you'll ever want to use is readily available… for $12 USD/month*" — r/discordapp, Nov 2025: https://www.reddit.com/r/discordapp/comments/1p8hg2l/
- "*Mee6 - Lots of features, massive paywall (only ~5 features available for free), AI you can't disable*" — r/Discord_Bots "Choosing the Bot", Oct 2025: https://www.reddit.com/r/Discord_Bots/comments/1oig1be/ — same thread recommends Sapphire instead.
- Structural signal: a dedicated activism site exists (alternativestomee6.com) plus NoTextToSpeech's YouTube exposés. No other bot has this.

**Dyno reliability anxiety:**
- "*We're aware that Dyno is currently offline again across all servers. This includes Premium and Custom bots*" — r/Dynodiscord, Sep 2025: https://www.reddit.com/r/Dynodiscord/comments/1npvkgf/whats_going_on_with_dyno
- May 2026 migration announcements: 24h all-service downtime, "last summer was challenging. Our data center partners experienced multiple back-to-back failures" (communityone.io server news mirror). Counterpoint: Dyno is still praised — "we use it specifically for logging. Best-in-class server logs" (r/GrowYourDiscord, Nov 2025: https://www.reddit.com/r/GrowYourDiscord/comments/1pddiof/).

**Wick friction:**
- "Wick is complicated too complicated, hard to find stuffs"; "Paywall ruins the bot — Prune… locked behind a paywall. Thats absurd" — user reviews on wickbot.com/reviews.
- "wick is very difficult to setup"; "occasionally wick straight doesn't respond to moderation commands" — r/Discord_Bots, Wick vs Sapphire thread: https://www.reddit.com/r/Discord_Bots/comments/1spagu3/
- "its a shit bot twin, don't use it. your server will still get nuked" — r/discordbot: https://www.reddit.com/r/discordbot/comments/1qik7gm/
- Displacement warning: users asking how to whitelist channels in Wick's automod are told "Native Automod can do this, don't need Wick" — https://www.reddit.com/r/discordapp/comments/1n24zyb/

**Carl-bot:** praised for setup simplicity and role management ("Super easy setup. Famous for role management" — r/GrowYourDiscord); top.gg reviews: "can replace many bots", "Essential bot to have!". Dissent: no tickets at any tier, leveling entirely paywalled (discordbots.blog audit; multiple community comparisons).

**YAGPDB:** consensus = "Extreme flexibility / Open source & free / ✗ Steep learning curve"; "Nothing works out of the box… admins who don't code will need help"; top.gg reviews allege hostile support-server moderation.

**Free-first bots get love:** Nekotina top.gg review: "La gran mayoría de comandos son completamente gratuitos, mientras que otros bots… 90% premium"; Sapphire called "The Mee6 replacement. Most installed bot on our list" (r/GrowYourDiscord).

---

## 6. Gaps & opportunities (what admins beg for, what incumbents botch)

1. **Free leveling.** Carl gates it entirely; MEE6/Dyno/Arcane meter it. Leveling is one of the two systems servers reach for first. "Free leveling with unlimited role rewards + MEE6/Amari import" is a proven wedge (Arcane, Koya, Vetox all exploit it).
2. **Free tickets with transcripts, claiming, and forms.** Carl: absent. MEE6 free: 0 panel embeds. Dyno: Standard+. Ticket Tool: $8/mo. Dedicated free ticket bots (Ticket King, Ticket Kit) are trending on top.gg precisely for this. This is arguably the #1 unserved demand.
3. **Free anti-nuke / anti-raid / backups / verification.** Wick is the standard and paywalls advanced tiers ($5/mo); ProBot paywalls anti-raid at Tier 2; Carl has no anti-raid at all. Free, strong anti-nuke + join-gate + recovery = instant differentiation (Beemo/Security Bot pressure proves willingness-to-switch).
4. **Free temporary voice ("join to create").** Carl premium-only/reportedly; every other incumbent ignores it; the vacuum is filled by a swarm of specialist bots (TempVoice, Tempy, Temply). A first-class temp-voice module with per-room control panels (rename/lock/trust/kick/claim) is cheap to build and highly visible.
5. **Free analytics.** Statbot paywalls history and most analytics panels; free analytics (activity graphs, member flow, channel stats) removes a whole bot from the stack.
6. **AI without a second invoice.** MEE6's AI is a separate paid product users can't disable; incumbents have no meaningful AI. Free AI moderation (Sapphire-style, deterministic fallbacks, optional BYO keys) plus free AI command drafting is a 2026 differentiator.
7. **Migration pain is retention armor — break it.** Incumbents' configs and XP don't export (MEE6 XP doesn't transfer; Carl leaderboards "cannot be reconstructed afterward"). Importers (MEE6, Carl, Dyno, Arcane, Amari) convert the switching cost that keeps unhappy admins in place.
8. **Dashboard quality is inconsistent everywhere** (YAGPDB dated, Wick complicated, MEE6 slow/dated) while newcomers win on UX. A modern Next.js dashboard where every module ships its own pages is a direct answer — no incumbent has that architecture.
9. **Billing friction & trust debt.** Patreon-only billing (Carl, YAGPDB), per-server slots, Discord-store restrictions (Ticket Tool docs) all fuel resentment; "no billing at all" sidesteps it.
10. **Reliability & resource fairness.** Dyno's 2025–26 outages left a trust scar; free-for-everyone with published uptime is a marketable contrast.
11. **Extend Discord's native AutoMod, don't duplicate it** — native rules (free, regex) cover basics, and "you don't need this bot" replies follow duplication; our automod should configure/extend native rules and add detection Discord can't do.
12. **Module gaps nobody serves well:** starboard (absent in MEE6/Wick/YAGPDB), suggestions boards, applications/forms (only Dyno), invite tracking, reminders, per-role-channel limits in leveling. Plugins can own these niches cleanly.
13. **Music: stay out of core** (YouTube ToS graveyard) — optional Lavalink plugin only. And plan discovery deliberately: top.gg "free tickets"/"no paywall" tags plus a viral fun hook (Koya's One Piece RPG pattern) drive top-of-funnel.

---

## 7. Implications for our build

- **Positioning sentence to claim:** "Everything MEE6/Dyno/Carl/Wick paywall — leveling, tickets, anti-nuke, analytics, AI moderation — free forever, open source, self-hostable, with a modern plugin dashboard." Koya (~4M servers, free-first) and Sapphire (1.8M, free-only) prove the wedge works; YAGPDB (MIT-licensed, 3.5M servers, premium-for-limits) proves the sustainability model. Nobody combines **free-everything + plugin architecture + modern dashboard + cloud-or-self-host**.
- **Launch module order (by verified demand):** (1) moderation + logging, (2) automod extension (native AutoMod bridge), (3) leveling with importers, (4) tickets with transcripts/claim/forms, (5) reaction/self roles + welcome cards, (6) anti-nuke/anti-raid + verification + backups, (7) temp voice, (8) analytics, (9) starboard/reminders/suggestions, (10) plugin marketplace.
- **Migration tooling is a growth weapon, build it in v1:** importers for MEE6 XP/level roles, Carl reaction roles/tags, Dyno automod rules, Amari/Arcane XP. Document them loudly; incumbents' data lock-in is their moat.
- **Keep the promised tech intact:** the plan (TypeScript, discord.js latest — measured as **14.27.0** on npm today, PostgreSQL + Redis, pnpm monorepo, modules shipping dashboard pages) matches how winners are built: Koya/Arcane/ProBot are dashboard-first, and ProBot's 10.2M servers on a TS-era stack shows scale is a solved problem.
- **AI strategy:** free AI moderation at Sapphire-like scope (rate-limited, EN-first) + optional BYO provider keys for heavier use — keeps "free" honest without unbounded token bills. Follow the new Ticket Tool's playbook of exposing `llms.txt`/OpenAPI so AI agents can configure our bot.
- **Trust surface:** public status page, published uptime, no premium-vs-free resource starvation, per-server data export (JSON) as a first-class feature — the exact inverse of the incumbents' resentments.
- **Community/OSS license:** YAGPDB's MIT license is OSS precedent; the project's "clone with credit, no monetizing clones" intent is not OSI-open-source — decide and communicate it consciously, since r/Discord_Bots is exactly this product's audience.
- **Success metrics from this research:** top.gg rating ≥4.5 (free-first cohort: Sapphire 96/100, Koya 95/100, Nekotina 4.73) and module parity with incumbents' paid tiers — which for us means no paywall line at all.

---

## 8. Sources

**Primary (vendor pages/docs, fetched Oct 7, 2026):**
- MEE6 premium pricing: https://mee6.xyz/en/premium · MEE6 wiki premium: https://wiki.mee6.xyz/en/premium · MEE6 AI pricing: https://mee6.xyz/en/ai
- Dyno premium/pricing: https://dyno.gg/premium · Dyno docs premium limits: https://docs.dyno.gg/en/premium · Dyno site/maintenance notices: https://dyno.gg/ , https://dyno.gg/form/ff5fefe4
- Carl-bot: https://carl.gg/get-premium · Patreon price announcement: https://www.patreon.com/posts/price-for-carl-131208404 · Patreon new features post (Aug 8, 2025): https://www.patreon.com/carlbot/posts/new-premium-in-136036650 · personalization: https://www.patreon.com/posts/you-can-now-carl-139117150
- Wick: https://wickbot.com/premium · reviews: https://wickbot.com/reviews · V5 changelog: https://docs.wickbot.com/changelog/v5.x/5.0.0/
- YAGPDB: premium benefits https://help.yagpdb.xyz/docs/welcome/premium · control panel/news https://yagpdb.xyz/manage · Patreon https://www.patreon.com/yagpdb · license https://raw.githubusercontent.com/botlabs-gg/yagpdb/master/LICENSE · repo https://github.com/botlabs-gg/yagpdb · v2.87.0 https://github.com/botlabs-gg/yagpdb/releases
- ProBot: pricing https://probot.io/pricing · premium docs https://docs.probot.io/docs/getting-started/premium
- Arcane: https://arcane.bot/premium (partial render)
- Koya: features https://koya.gg/en/features · premium https://koya.gg/en/premium
- Sapphire: https://sapph.xyz/ · docs https://docs.sapph.xyz
- Sesh: https://sesh.fyi/premium
- Statbot: https://docs.statbot.net/docs/usage/premium-upgrades/ · https://statbot.net/upgrade
- Ticket Tool (new): https://ticket-tool.app/ , https://ticket-tool.app/pricing · Ticket Tool (classic) docs FAQ: https://docs.tickettool.xyz/beta-docs/debugging/faqs
- top.gg listings (fetched via wayback where top.gg's bot-protection blocked live fetches): https://top.gg/bot/159985870458322944 (MEE6), https://top.gg/bot/276060004262477825 (Koya), https://top.gg/bot/1506999581722804274 (Ticket Tool new), https://top.gg/bot/583807014896140293 (TopStats)

**Data/scale:** top.gg bot widgets (https://top.gg/api/widget/{id}.svg), TopStats.gg (https://bots.topstats.gg/discord/bots/{id}, leaderboard https://bots.topstats.gg/discord/leaderboard/servers), discord.bots.gg API (https://discord.bots.gg/api/v1/bots/{id})

**Pricing/services audits (third-party, cross-checked within itself; treat as medium confidence):** https://supervisor.gg/blog/wick-bot-pricing · https://supervisor.gg/blog/carl-bot-pricing · https://supervisor.gg/blog/discord-bot-pricing-compared · https://supervisor.gg/blog/underrated-discord-bots · https://discordbots.blog/blog/which-discord-bots-charge-for-leveling · https://discordbots.blog/blog/carl-bot-review · https://discordbots.blog/blog/best-discord-anti-raid-bots · https://communityone.io/servers/1026884833139490958/lucidjx-community/news/may-19-2026-dyno-server-migration-24h-maintenance-2026-05-08

**Sentiment (Reddit & reviews):** listed inline in §5 (r/discordapp 1kon2am, 1p8hg2l; r/discordbots 1pmx6r2, 1k2gakg; r/Discord_Bots 1oig1be, 1spagu3; r/Dynodiscord 1npvkgf; r/discordbot 1qik7gm; r/discordapp 1n24zyb; r/GrowYourDiscord 1pddiof; wickbot.com/reviews; top.gg reviews for Carl-bot, Nekotina).

---

## 9. Confidence & gaps

- **High confidence:** server counts and monthly-vote figures (top.gg live widget images, Oct 7 2026, cross-checked with TopStats.gg); pricing read directly from vendor pages that day (MEE6, Dyno, ProBot, Koya, Sesh, new Ticket Tool); YAGPDB MIT license (LICENSE file read); YAGPDB v2.87.0 (GitHub, Sep 25 2026); Dyno's May 19–20 2026 migration (Dyno's own notices).
- **Medium confidence:** Wick's $5/$20 pricing (premium page didn't render; two independent Aug-2026 audits agree); Carl-bot's feature table and June 2025 reset (Patreon posts official; details from an audit); /100 ratings for Carl/Dyno/Wick/Sapphire (single audit, Aug 2026); "temp voice is Carl premium" (single source).
- **Low confidence / unresolved:** why Dyno's top.gg listing is no longer retrievable (404s + widget 0; removal vs. outage not confirmed); whether the classic and new "Ticket Tool" apps are related; MEE6's exact free-vs-premium limits (not published — inferred); Statbot's exact upgrade prices (client-rendered).
- **Not verified:** scale of Vetox/PeakBot/Astero/CommunityOne; Wick annual billing; Koya's exact count (~3.9–4.0M range).
- **Method caveat:** top.gg is bot-protected; pages were fetched via Wayback + widget image-OCR. Figures are as-of Oct 7, 2026 and drift weekly.
