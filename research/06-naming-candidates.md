# 06 — Naming Candidates & Initial Availability Recon

**Project:** flagship Discord community-management bot (self-host via Docker + optional cloud) meant to beat MEE6 / Dyno / Carl-bot / Wick / YAGPDB.
**Prepared:** 2026-10-07 (host UTC+03). **Status:** brainstorm + first-pass availability recon. No availability result in this document is invented; anything not verifiable was marked **unchecked** (see §e).

**Method in one line:** 25 viable product names brainstormed (no placeholders/memes); the top 8 got a deep pass across (1) existing Discord bots (top.gg / disforge / search-engine sweeps), (2) GitHub handle & repo collisions, (3) npm registry availability, (4) domains `.com` (Verisign RDAP — authoritative) and `.gg` (registry WHOIS on whois.gg — authoritative). Three extra alternates got a lighter first pass.

---

## Top-line findings (read this first)

- Every short English word in this space is **taken on npm, GitHub, and both TLDs** — that is the baseline, not a dealbreaker. The real differentiators are: *existing same-space Discord bot* and *major-brand trademark*.
- **No name among the top 8 is fully clean.** Best risk profile: **Cairn**, then **Warden** and **Hearth** (all "moderate"). First-pass supplements that also look manageable: **Rook**, **Waystone**.
- **Direct same-name, same-category collisions found** for: Vigil (two live bot+dashboard products), Sigil (live bot/platform), Bastion (live security bot + legacy multi-purpose bot), Custos (live commercial moderation bot). Loom collides with a major trademark (Atlassian). → rated **risky**.
- 5 tempting names to **avoid outright** on trademark grounds: **Halo, Sentry, Ember, Signal, Loom** (§c).
- Top.gg's and disforge's own search boxes are **not programmatically queryable** (details in §d/§e) — evidence comes from direct page reads + search-engine sweeps; absence of a found bot is *not* proof of nonexistence (proved by the Hearth case below).

---

## (a) 25 candidates — one-line vibe / meaning

1. **Warden** — the watchful guardian of your server; moderation-first, short and authoritative.
2. **Vigil** — keeping quiet watch over the community; solemn, clean, protective.
3. **Bastion** — a fortified haven; the last line of defense for your server.
4. **Aegis** — the mythic shield held over your community; tech-clean protection.
5. **Steward** — the trusted caretaker who keeps the realm running smoothly.
6. **Keeper** — gatekeeper of roles, members, and order (pairs with "gatekeeper").
7. **Hearth** — the warm center of the server; home, belonging, calm.
8. **Tavern** — where the community gathers; Discord's ancestral vibe.
9. **Cairn** — trail-marker stones; guidance, memory, and a path for everyone.
10. **Loom** — weaving members, roles, and events into one fabric; craft energy.
11. **Anvil** — hammering raw ideas into structure; a builder's tool.
12. **Grove** — a calm, tended space where the community grows.
13. **Harbor** — a safe port where members dock and belong.
14. **Beacon** — a guiding signal the whole community can see.
15. **Lantern** — a warm guiding light through the noise.
16. **Sigil** — your server's crest; identity, roles, and status as heraldry.
17. **Rune** — a small magical glyph; gamer-native, minimal, sharp.
18. **Rook** — the guardian piece on the board; chess + corvid lore, punchy.
19. **Paladin** — the knightly protector; RPG-native heroism (3 syllables).
20. **Scribe** — records, logs, and history, beautifully kept; the craft of writing.
21. **Herald** — greets, announces, keeps everyone informed.
22. **Custos** — Latin for "guardian"; rare, scholarly, distinctive.
23. **Waystone** — a glowing marker that guides members home; fantasy-native.
24. **Wren** — tiny, sharp, quick-witted bird; friendly mascot energy.
25. **Meerkat** — sentinel on lookout; adorable, vigilant mascot.

All 25 work in the sentence *"Invite ___ to your server."* (checked mentally; 1–2 syllables except Paladin.)

---

## (b) Top-8 availability table

> Legend: **clean** = no meaningful collision found; **moderate** = collisions exist but no dominant same-name/same-space product; **risky** = direct same-name same-category product or major trademark.
> The "Discord-bot collision?" column reflects top.gg-indexed pages, direct page reads, and search-engine sweeps (disforge's live search was not usable — see §e).

| # | Name | Meaning / vibe | Discord-bot collision? | GitHub / npm collision? | Domain notes (.com / .gg) | Risk |
|---|------|----------------|------------------------|--------------------------|---------------------------|------|
| 1 | **Warden** | 2-syl guardian; the watchful keeper; moderation-first | **YES** — exact-name "Warden" moderation bot on top.gg since 2018 (bot/490487249478352897, dev DevShot; legacy); plus **Alpha Warden** (2022, Discord-verified security bot), SafeServerWarden, Securo Warden; "warden" is also generic server-role and Minecraft vocabulary | GitHub user `warden` exists; TeamDman/Warden-Bot repo; npm `warden` taken (v0.1.1, unrelated wrapper) | `.com` registered since 1994 (GoDaddy parking NS); `.gg` registered 2021-06-24 (Dynadot; parked on **Afternic** NS → likely listed for sale) | **moderate** |
| 2 | **Vigil** | 2-syl; quiet watch; solemn, protective | **YES** — multiple **live same-space products**: "Vigil" (vigilbot.app, Crintech Studios — open-source discord.js bot with moderation, levels, Albion guild tools + dashboard), "VigilBot" (vigilbot.cloud — verification/alt-detection/moderation bot, **313+ servers**, €4.99 premium, status page live), "Vigil Logger" (top.gg bot/1479928296212004884, 2026-03), VigilEye | GitHub user `vigil`; npm `vigil` taken (v0.7.3 file-watcher, stale); tryvigil.dev (uptime-monitoring product named Vigil) | `.com` registered 2003 (CSC nameservers — corporate brand-protection registrar, i.e. company-owned); `.gg` registered 2021-01-14 (iwantmyname NS) | **risky** |
| 3 | **Cairn** | 1-syl; stacked trail-markers; guidance, calm, memory | **NO** exact-name Discord bot found (top.gg + disforge + index sweeps; only adjacent: "Soul Cairn" server, TTRPG community servers) — negative result, not proof (see §e) | GitHub org "Cairn Software" (7 repos); active **cairn-dev/cairn** background-coding-agent (try-cairn.com); npm `cairn` taken (v0.8.0 RN styling); also cairn.info, TTRPG Cairn (yochaigal/cairn) | `.com` registered 1995 (DNSimple NS); `.gg` registered **2026-02-01** (GoDaddy) — fresh grab by an unknown party | **moderate** |
| 4 | **Loom** | 1-syl; weaving community together; craft + calm | **YES** — top.gg "loom" cross-server calling bot (bot/1479612851860537577, 2026-03); discordbotlist "loom" management bot (loom-0679, 6 servers) | GitHub org `loom` (loom-dotnet, loom-java repos); npm `loom` taken (v3.1.2, scaffold generator); loom.com = Loom, Inc. | `.com` = Loom, Inc. (Atlassian-owned; AWS NS); `.gg` registered 2021-03-03 (registrant "Next Navigation Pty Ltd"; Afternic parking) | **risky** — major trademark (§c) |
| 5 | **Sigil** | 2-syl; a heraldic crest; identity, roles, magic | **YES** — existing "Sigil" **Discord bot & community platform** (getsigil.me; discordbotlist.com/bots/sigil — games, profiles, leveling); sigilhq.com; plus Sigil epub editor and a "Sigil" AI agent | GitHub user `sigil`; npm `sigil` name **registered but zero published versions** (placeholder squatter) | `.com` registered 2004 (WorldNic NS); `.gg` registered **2026-01-13** (NameCheap) | **risky** |
| 6 | **Bastion** | 2-syl; fortress / last line of defense | **YES** — "Bastion" **security bot on top.gg** (bot/1474138942294065377, 2026-02, anti-raid/anti-nuke + dashboard, paid tiers); "Bastion Security" moderation/logging bot site (bastiondiscordbot.netlify.app); legacy multi-purpose "Bastion" listed with **3.8K servers** on discord.bots.gg; 2× Yu-Gi-Oh Bastion bots | GitHub user `bastion`; npm `bastion` taken (v1.8.1 JS toolchain); DawnbrandBots/bastion-bot + AlphaKretin/bastion-bot; also a well-known 2011 game title | `.com` registered 1995 (Cloudflare NS); `.gg` **anomalous**: "HELD BY REGISTRY", status Inactive/Locked by Registry, (re)registered 2026-10-04 — **not acquirable** currently | **risky** |
| 7 | **Custos** | 2-syl Latin "guardian"; rare, scholarly | **YES** — "**Custos**" is a live commercial Discord moderation bot by GlitchServers (glitchservers.com/discord-bot — moderation/anti-raid/verification/tickets/leveling, £3.99/mo; built as a MEE6/Dyno/Carl-bot alternative) — **directly the same category**; "CustosChord" multi-purpose bot on top.gg (bot/1109422324551258122, 2023-05) | GitHub user `Custos` (Josh Feinblum, 3 repos); npm `custos` taken (v0.0.28 "Custos JavaScript client"); crypto-agent "$CUSTOS" noise (Base/Virtuals), Telegram "CUSTOS" agent | `.com` registered 1996 (GoDaddy parking NS); `.gg` registered 2025-12-27 (NameCheap) | **risky** |
| 8 | **Hearth** | 1-syl; the warm center of a home; belonging | **YES (late find, corrected)** — active "**Hearth**" cozy-farming bot on top.gg (bot/1503043359055548579, created 2026-05-10, v1.5, active dev, public ToS/privacy) — different category (fun/farming), same name; plus legacy "HearthBot" (HearthSim, Hearthstone card search, 2017) and several servers with Hearth names | GitHub user `hearth`; npm `hearth` taken (v1.0.2 test-data generator); OSS "Hearth" agent project (0pen-Sourcer); Empryo "hearth" feature name | `.com` registered 1995 (Cloudflare NS); `.gg` registered 2023-10-08 (Gandi; **Azure DNS NS → actively used by its owner**) | **moderate** |

### Supplementary first-pass checks (beyond the required top 8 — lighter depth)

| Name | Vibe | Discord collision (search-level, one sweep) | GitHub / npm | Domains (.com / .gg) | Risk |
|------|------|----------------------------------------------|--------------|----------------------|------|
| **Rook** | 1-syl; guardian chess piece + corvid | No exact bot found; **but active same-category "Rooke" bot** (top.gg/bot/1198447950490259587, 2024-01, dashboard, all-in-one moderation/leveling/tickets) is one letter away; "Roku" bot (8K servers, different name); rook.io (CNCF storage) | github.com/rook exists; npm `rook` taken | `.com` registered; `.gg` registered 2021-01-02 (Enrapture) | **moderate** |
| **Waystone** | 2-syl; glowing wayfinding marker | No bot found; the word is used by Minecraft servers ("Waystone Network", a "Waystone" SMP) and a popular "Waystones" mod; LoL item reference | github.com/waystone exists; npm `waystone` taken | `.com` registered; `.gg` registered 2026-03-14 (registrant "Sorcerware" — a company) | **moderate** |
| **Anvil** | 2-syl; blacksmith's block; craft/forge | "Anvil" Roblox group-management bot (discordbotlist.com/bots/anvil; justdiscord mirror); "Anvil" OSRS clan-competition platform (paid, "anvilosrs") | github.com/anvil exists; npm `anvil` taken; BrokkAi/anvil (Rust agent server) | `.com` registered; `.gg` registered 2020-10-23 (shiftd UG) | **moderate** |

---

## (c) 5 names to AVOID (verified major-brand trademark collisions)

1. **Halo** — Microsoft Corporation owns registered **HALO** trademarks across classes including computer game software and online games (e.g. USPTO Reg. #6463813; "Halo Studios" filings). Fatal for a gaming-adjacent bot.
2. **Sentry** — "**Sentry is a registered trademark of Functional Software, Inc.**" (sentry.io error-monitoring platform; USPTO Reg. #4922688; also registered in Canada, TMA1364541). Ubiquitous in developer tooling — guaranteed confusion.
3. **Ember** — "**Ember is a registered trademark owned by Tilde Inc**" (Ember.js framework; emberjs.com/legal + /brand). Also Ember Technologies (smart mugs) as a secondary user.
4. **Signal** — registered trademarks of the **Signal Technology Foundation**; their brand guidelines explicitly say you may **not** use/register "Signal" marks "as or as part of any trademark, service mark, company name, trade name, username, social media handle, or domain registration."
5. **Loom** — "**Loom, Inc.**" is an **Atlassian company** (acquired for ~$975M, deal closed 2023-11-30); a strong mark in exactly the collaboration-software space (and discord-bot listings already use the name — see table).

*(Borderline names spotted during research that would need a formal search before use: Keeper (Keeper Security), Herald (NZ Herald), Grove, Harbor (Harbor container registry), Aegis, Steward.)*

---

## (d) Sources / checks performed (what was actually queried)

**All checks executed 2026-10-07, ~05:45–08:00 UTC.**

**Domains — `.com` (authoritative RDAP, Verisign):**
`https://rdap.verisign.com/com/v1/domain/<name>.com` for all 8 + rook/waystone/anvil. Method validated with controls (google.com → 200/registered; random string → 404/free). Result: **all 11 registered** (details & NS in table).

**Domains — `.gg` (authoritative registry WHOIS):**
`whois.gg` port 43 (IANA-listed WHOIS server for .gg; RDAP does not cover .gg). Controls: `discord.gg` → registered record returned; random string → `NOT FOUND`. Full records for all 8 saved locally (registrar, registration date, NS, registrant where public). Notable: bastion.gg = "HELD BY REGISTRY / Inactive / Locked by Registry"; warden.gg & loom.gg parked on Afternic NS (marketplace).

**npm:** `https://registry.npmjs.org/<name>` — 200 = name taken, 404 = free. All 11 names: **taken** (sigil = registered with zero versions → effectively squatted).

**GitHub:** profile probe `https://github.com/<name>` (HTTP 200 = exists, 404 = free) with 3 nonexistent-name controls (all 404). All 11 names **exist** as users/orgs. Repo listings enumerated for `github.com/loom?tab=repositories` (loom-dotnet, loom-java) and `github.com/cairn?tab=repositories` (cairn/cairn, .github, clothes, floriography, ink-job-99, join). GitHub REST API was attempted first (`api.github.com/users/<name>`) but the shared IP was rate-limited (403, remaining 0) → switched to HTML probes.

**top.gg:** No usable public search (client-rendered page; `top.gg/api/search` → Cloudflare challenge). Evidence via direct page reads + search-engine indexed pages, including:
- `top.gg/bot/490487249478352897` (Warden) · 1015601984751018024 (Alpha Warden) · 1143249422503907398 (SafeServerWarden) · 1455782169854087170 (Securo Warden)
- `top.gg/bot/1479612851860537577` (loom) · 1474138942294065377 (Bastion) · 1109422324551258122 (CustosChord) · 1198447950490259587 (Rooke) · 1503043359055548579 (Hearth — farming bot)
- `getsigil.me` (Sigil bot/platform) · `discordbotlist.com/bots/sigil`, `/bots/loom-0679`, `/bots/anvil`
- `discord.bots.gg/bots/267035345537728512` (Bastion, 3.8K servers) + `/383854640694820865` (Bastion YGO)
- `vigilbot.app` + `vigilbot.cloud/en` (both extracted live) · `tryvigil.dev` · `crintech.pro` blog · `bastiondiscordbot.netlify.app` · `glitchservers.com/discord-bot` (Custos) · `rookhelm.com`
- Bot-creation dates derived from Discord snowflake IDs (deterministic).

**disforge:** attempted `disforge.com/search?q=` (404), `/bots?search=` (HTTP 200 but **param ignored** — proved via identical 48-link lists for "warden" vs "mee6"), `/api/bots` (returns literal `"Array"`), `/bots/all` (24 links, none matching our names), `/bots?page=2` (empty), `/sitemap.xml` (404); its search form actually POSTs to `discordbots.net/search` which is JS-rendered (control test with "carl" returned no results either). `site:disforge.com <name>` index searches returned **no bot pages matching any of the 8 names**. → disforge coverage: **limited** (see §e).

**Other bot lists (fallback):** `discord.bots.gg` name search not supported (`q=` ignored; search endpoint requires numeric ID). `discord.me` 403. `botlist.me` 404.

**Trademarks (§c):** `trademarks.justia.com/875/92/halo-87592606.html` · `markinton.com/trademark/halo-87592606` · Microsoft FY26Q1 trademark list PDF · `trademarks.justia.com/867/20/sentry-86720111.html` · `ised-isde.canada.ca/cipo/trademark-search/2101056` · `emberjs.com/legal` + `emberjs.com/brand` · `signal.org/brand/trademarks/` · Loom/Atlassian acquisition coverage (legalclarity.org, topickz.com, Atlassian 10-K references).

**Tooling limitations encountered (for reproducibility):** browser automation daemon was unreachable this session (could not operate top.gg/disforge search UIs directly); GitHub REST API rate-limited (shared IP); whois binary absent → used raw port-43 WHOIS via Python socket.
**Raw data & scripts saved:** `C:\Users\dodia\AppData\Local\hermes\cache\scratch\names\` (`namecheck.py`, `names2.py`, `whocheck.py`, `gg_full.py`, `gg_full_whois.json`, `gg_whois_results.json`).

---

## (e) Confidence & gaps

**High confidence (authoritative or directly verified):**
- `.com` registration status (Verisign RDAP) and `.gg` registration status (registry WHOIS) for all names listed — with controls validating the method. Note the bastion.gg registry-hold anomaly (re-registered 2026-10-04, Inactive/Locked — reason unknown; not acquirable now).
- npm name status for all checked names (registry API).
- GitHub handle existence for all checked names (HTML probes + 404 controls).
- The existence of each specific Discord bot/product linked in §b (direct pages extracted or fetched).

**Medium confidence (absence findings):**
- "No exact-name Discord bot found" for Cairn / Waystone (and Rook) is a **negative search result**, not proof: top.gg's own search could not be operated (JS/Cloudflare) and its app directory is large. The Hearth case proves the point — a live 2026 bot was only discovered via a late search hit. Recommend re-checking finalists manually inside top.gg / the Discord App Directory before committing.

**Explicitly unchecked / limitations:**
- **disforge per-name results**: treated as *unchecked* for any name beyond the visible listing slices (their search and API are non-functional for name queries; see §d).
- **Bot traction metrics** for the found collisions (vote/server counts) — top.gg hides counts for small bots; only Bastion's legacy "3.8K servers" (discord.bots.gg) was verified. VigilBot.cloud advertises "313+ servers" (self-reported, extracted from site).
- **Domain acquirability/pricing** for registered domains (Afternic parking suggests warden.gg / loom.gg may be for sale, but listing status and prices were not verified). Alternative TLDs (.io/.app/.dev/.bot) **not checked**.
- **Formal trademark clearance beyond §c was NOT performed** (no legal search). Before launch: word-mark searches (USPTO/EUIPO, classes 9/42) for the 2–3 finalists, plus Discord developer-name policy check.
- **Social handles** (X/Twitter, Discord username, Reddit, YouTube) **not checked**.
- Names outside the top 8 + 3 supplements are **unchecked for availability**; recommended second-pass list: Waystone/Rook/Anvil (finish), plus Aegis, Steward, Keeper, Tavern, Beacon, Lantern, Herald, Paladin, Scribe, Grove, Harbor, Rune, Wren, Meerkat.

**Risk-rating rubric used:** *clean* = no meaningful collision found; *moderate* = collisions exist but no dominant same-name/same-space product (generic word, hard to own); *risky* = a direct same-name same-category product exists, or a major trademark applies.

**Bottom line for the shortlist:** Cairn (moderate — cleanest Discord space; busy dev namespace), Warden (moderate — legacy exact-name bot, crowded word), Hearth (moderate — active same-name farming bot, different category), with Rook / Waystone as moderate first-pass alternates; avoid Vigil, Sigil, Bastion, Custos (live same-space products) and Loom, Halo, Sentry, Ember, Signal (trademarks).
