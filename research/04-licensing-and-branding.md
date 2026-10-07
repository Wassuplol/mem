# 04 · Licensing & Branding — "clone freely, credit us, don't monetize"

> ⚠️ **Not legal advice.** Research for a decision menu, assembled from official license texts and FAQs (linked in §6). Fits are jurisdiction- and fact-specific — have a lawyer review the final combo before publishing your LICENSE file or filing anything.

**Date:** 2026-10-07 · **Project:** Sonion (working codename — naming warning in §7)

---

## 1. The requirement, in plain words

The owner's intent:

1. **Clone, use, modify freely** — anyone can fork, self-host, run, and improve the bot.
2. **Visible credit required** — people who use the code must credit the original project.
3. **No monetized clones** — nobody may sell the bot, host it as a paid service, or otherwise profit from it…
4. **…unless they fully rewrite the code** — a from-scratch reimplementation is allowed.

### Two realities first

**Reality A — the "unless they fully rewrite" clause isn't something a license grants; it's how copyright already works.** Copyright protects your *code as written*, not the *idea* of the bot. An independent rewrite that copies no code needs no permission, and **no license can prevent it**. A license only governs people who **reuse your actual code**. The enforcement target: "people using *your* code to make money", plus trademark against anyone pretending to *be* you.

**Reality B — this intent makes the project "source-available", not "open source".** OSI requires licenses to put no restrictions on *what* the software may be used for ("No Discrimination Against Fields of Endeavor", OSD criterion 6). "No monetization" is exactly such a restriction — with real consequences covered in §3.

---

## 2. Options compared

Fit = closeness to the four bullets, assuming the same trademark + attribution package is bolted on. Scores are judgment calls, not legal standards.

| Option | Credit mechanism | Monetized clones | Real open source later? | Fit |
|---|---|---|---|---|
| **FSL-1.1** (MIT/ALv2 future license) | Keep copyright notices + pass on terms/link | Blocked if a "Competing Use": commercial product/service that substitutes for your bot or "offers the same or substantially similar functionality" | ✅ Each release auto-converts to MIT/Apache 2.0 exactly 2 years after release | **9/10** |
| **Elastic License 2.0** | Keep notices + license intact | Blocks *any* hosted/managed service for third parties — even a free one | ❌ | 6/10 |
| **PolyForm Noncommercial 1.0.0** | "Required Notice:" lines + terms pass-on | Blocks **all** commercial use, competing or not | ❌ | 7/10 |
| **PolyForm Strict 1.0.0** | N/A | Blocks commercial use **and** all distribution and modification | ❌ | 1/10 |
| **Commons Clause + MIT/Apache** | Keep notices | Blocks "Selling" — explicitly including fees for hosting *and* consulting/support | ❌ | 5/10 |
| **AGPL-3.0** (contrast, the flip side) | Strong: network users must be offered source; UIs must show legal notices | **Allowed** — "you may charge for it" | ✅ Already is | 3/10 vs. intent |
| **SUL v1.0** (n8n's Sustainable Use License) | Keep notices; flag modifications | Use/modify only for internal business or non-commercial/personal use; may share only **free of charge** | ❌ | 8/10 |

Also considered: **BSL 1.1** (4-year conversion; "every BSL implementation is essentially a new license" per the FSL FAQ) and **PolyForm Perimeter** (FSL-like, no time-based conversion — strictly worse).

### Details & gotchas

**FSL-1.1 — `FSL-1.1-MIT` / `FSL-1.1-ALv2`.** The exact restriction, quoted (SPDX text): *"A Permitted Purpose is any purpose other than a Competing Use. A Competing Use means making the Software available to others in a commercial product or service that: 1. substitutes for the Software; 2. substitutes for any other product or service we offer using the Software that exists as of the date we make the Software available; or 3. offers the same or substantially similar functionality as the Software."* Everything else is permitted — explicitly including internal use, non-commercial education/research, and paid professional services (consultants may charge to set it up). Redistribution duty: *"you must include a copy of or a link to these Terms and Conditions and not remove any copyright notices provided in or with the Software."* Trademarks: reserved (usable only to identify the project as the software's origin). Future license: *"irrevocably … effective on the second anniversary"* of each release — the clock runs **per version** (a commit older than two years can be checked out and used under MIT). **Gotchas:** only *commercial* competing use is forbidden (free community servers are fine); the "commercial" boundary for donations is untested; **no public case law** yet; you can't modify the text and keep the FSL name (*"you'll have to call it something other than FSL"*); GitHub shows FSL as **"Other"** (verified via GitHub's license API: `getsentry/sentry` → `"key": "other"`; absent from choosealicense.com and GitHub's license-keyword list — as are PolyForm, ELv2, and SUL).

**Elastic License 2.0 (ELv2).** Broad grant to *"use, copy, distribute, make available, and prepare derivative works"*, minus: *"You may not provide the software to third parties as a hosted or managed service, where the service provides users with access to any substantial set of the features or functionality of the software"* — **no "commercial" qualifier**: even free clone-hosting is blocked (overshoots your intent); also bans license-key circumvention and notice removal; no trademark rights. **Gotchas:** built for infrastructure (Elastic's own license since 2021); "substantial set of features" is vague for a modular bot; no conversion to open source. n8n adapted it (with permission) into its SUL.

**PolyForm Noncommercial 1.0.0.** Lawyer-drafted, plain-language. Core: *"Any noncommercial purpose is a permitted purpose."* Personal/hobby use is permitted *"without any anticipated commercial application"*; charities, schools, research, and government always are. Duties: pass on the terms and any **"Required Notice:"** lines (a built-in attribution mechanism); first-time violators get a 32-day cure window. **Gotchas:** the license does **not** define "noncommercial" beyond those categories — **donation-funded community servers are a genuine gray zone**; it blocks even *non-competing* commercial use (a for-profit community can't use it internally), costing adopters and contributors; and "NC" reads as "we plan to sell commercial licenses" — the opposite of this project's "no paywalls ever" ethos.

**PolyForm Strict 1.0.0.** Permits **use only** — PolyForm's own summary: it *"removes permission to distribute copies and make changes, leaving only permission to use for noncommercial purposes."* That contradicts bullet 1 (people must be able to clone/modify) head-on. Viable only if the repo should be read-only source for evaluation. Fit 1/10.

**Commons Clause + MIT/Apache.** A condition pasted onto an existing license: *"the grant of rights under the License will not include … the right to Sell the Software"*, where "Sell" = providing third parties, for a fee *"(including without limitation fees for hosting or consulting/support services related to the Software), a product or service whose value derives, entirely or substantially, from the functionality of the Software."* **Gotchas:** hits the no-monetization aim directly, **but also bans paid consulting/support around the bot** (why n8n dropped it in 2022: *"our previous license restricted people's ability to charge fees for consulting or support services"*); non-standard combo (per-project edits; OSI-unapproved; 2018-era baggage); the FAQ is ambiguous about selling derivative works. Dated, clumsy tool.

**AGPL-3.0 — the honest *opposite* of your intent.** OSI-approved and deliberately *pro-monetization*: the preamble says *"you have the freedom to distribute copies of free software (and charge for them if you wish)"*. It forces anyone running a modified version on a public server to offer the source — but that clone host can legally charge money. It also has the closest thing to "visible credit" among standard licenses (interactive UIs must show "Appropriate Legal Notices"). **Use it only if you ever flip to "true open source, forks must stay open, monetization is fine"** — accepting: some companies avoid AGPL entirely (fsl.software FAQ: *"is not permissive enough"* for them), copyleft friction with plugins, and zero protection against paid clones.

**Sustainable Use License (n8n) v1.0.** Bespoke text (n8n's 2022 replacement for Apache 2.0 + Commons Clause, adapted from ELv2 with permission). The three limitations, quoted: *"You may use or modify the software only for your own internal business purposes or for non-commercial or personal use. You may distribute the software or provide it to others only if you do so free of charge for non-commercial purposes. You may not alter, remove, or obscure any licensing, copyright, or other notices of the licensor."* Paid consulting is allowed under it. **Gotchas:** a company's custom license — no SPDX ID, GitHub shows "Other"; contains n8n scaffolding you'd strip; "internal business purposes" fits enterprise software more than a bot; and it pigeonholes you as "a company with a commercial edition", clashing with this project's positioning.

---

## 3. OSI open source vs. source-available — what it actually means

- **The rule:** OSD criteria 5 & 6 (no discrimination against persons/groups; no discrimination against fields of endeavor) mean "you can't use this to make money" is disqualifying. OSI's FAQ: *"Can I restrict how people use an Open Source licensed program? **No.**"* and *"Can Open Source software be used for commercial purposes? **Absolutely.** You can even sell Open Source software."*
- **So:** label it **"source-available"** — or the friendlier **"Fair Source"** umbrella FSL belongs to (fsl.software FAQ: *"Open Source does not protect against harmful free-riding."*). Never call it open source in the README; the mislabel, not the license, triggers backlash.
- **GitHub mechanics:** picker + license search run off choosealicense.com's list; FSL, PolyForm, ELv2, and SUL aren't on it, so GitHub shows **"Other"**. Cosmetic only — the SPDX ID can still live in README and `package.json`.
- **Community reception, honestly:** three tiers. (1) **FSL/Fair Source** — most accepted non-OSI approach: standardized, SPDX-registered, Sentry-backed; "converts to MIT in 2 years" defuses most criticism; still rejected by OSS purists and some corporate compliance programs (Apache's legal committee reviewed FSL when Liquibase adopted it). (2) **PolyForm/SUL** — tolerated, but "noncommercial"/"internal business use" repel exactly the company contributors and plugin authors you want. (3) **Commons Clause/SSPL class** — the harshest backlash, with famous forks: Redis (SSPL 2024 → Valkey; re-added AGPLv3 in 2025 to repair its community), Elastic (→ OpenSearch), HashiCorp (→ OpenTofu). Tier 1 is strategically right for a community-powered MEE6 challenger.
- **Contributors:** use a short CLA (or DCO + explicit inbound=outbound statement) so you can *relicense past contributions* — required for the "converts to MIT" promise on old releases and any future license change. Copyright line: "© 2026 The Sonion Project contributors".

---

## 4. Enforcement reality — what actually stops bad clones

**(a) DMCA / copyright takedowns — only for actual license violations.** A license breach = use beyond permission = copyright infringement; platforms act on it. Case law anchor: *Jacobsen v. Katzer* (Fed. Cir. 2008) — open-license conditions are enforceable **as copyright conditions** (injunctions, damages; GitHub cites statutory damages up to $150,000 per work). GitHub's process: notices are published publicly (github/dmca); whole-repo claims disable the repo quickly; partial-content claims get ~1 business day to fix. **Forks:** GitHub processes a takedown against *all forks of a repo at once* if the notice names them ("we would process a valid claim against all forks in that network"). Counter-notices restore content after 10–14 days unless the owner files suit — and notices are made under penalty of perjury, so bad takedowns are risky for *you*. Key limit: DMCA can't touch use the license *permits* (a free clone, a rewrite, brand misuse) — only the underlying copyright breach.

**(b) Trademark — the strongest weapon, especially against rewrites.** OSI FAQ: *"Does Open Source mean anybody else can use my name and logo? No … Open Source is about software source code, not about identity."* None of §2's options grants trademark rights — **the name + logo must be protected by a trademark, not by the code license.** It's the lever that works even when someone legally rewrites the code but keeps your branding or implies endorsement. Register the word mark (USPTO base fee $350/class since Jan 2025, plus surcharges; EUIPO separately) — **GitHub's trademark process requires a "federal or international trademark registration number"**; without one, platforms may not act. Accounts "clearly intending to mislead" there get suspended; confusing-but-honest ones get a chance to fix. Beyond GitHub: Discord impersonation reports; UDRP for copycat domains (stronger with a registered mark).

**(c) Attribution in practice.** Mechanisms: **file-level** (Apache-2.0 NOTICE; MIT "include in all copies"; FSL "don't remove notices"; PolyForm "Required Notice:"; AGPL UI-level "Appropriate Legal Notices" — the only standard license reaching into the UI); **repo-level** (README "built on X" — norm, not enforceable per se); **in-app** (dashboard footer / `/about` — enforceable only if the license says so). A *hard-enforceable* visible credit needs a custom, lawyer-drafted license condition (you'd lose the FSL name and SPDX ID). Pragmatic middle path: credit lines in source headers and the default dashboard footer ("Powered by {project} — {url}"); FSL's notice-retention clause arguably covers it, and the rest is community norm — which, for bot admins, works fine.

**(d) Limits of "no monetization".** Four boundary cases, honestly:
- **Donation-funded community servers:** gray. FSL forbids only *competing commercial* services — donation-funded hobby hosting is arguably fine (untested). PolyForm NC leaves "noncommercial" undefined — same gray zone.
- **Hosting-as-a-service:** the clear violation. Paid hosting of a clone is a competing use under FSL ("commercial service … offers the same or substantially similar functionality"), a hosted-service violation under ELv2 (even unpaid), and a distribution violation under SUL. Easiest to spot and act on.
- **Forks that add features:** modifications are allowed; extra features don't legalize monetization, but they make "substantially similar functionality" murkier — and a determined competitor can always fund a clean-room rewrite.
- **Private use:** unpoliced and mostly permitted (FSL allows internal use; NC allows personal). Enforcement targets *public commercial exploitation* in practice, and most disputes end with a letter, a fix, or a takedown — not court.

---

## 5. Recommendation

### ✅ PRIMARY: FSL-1.1-MIT + registered trademark + attribution stack

**License** `FSL-1.1-MIT` (unmodified official template) · **Brand** registered word mark + `TRADEMARK.md` policy ("forks must rename; no logo use; 'based on {project}' credit allowed") · **Attribution** NOTICE file + README credit section + default "Powered by" dashboard footer, formatted as a copyright notice preserved per the license.

In plain English:
1. **Anyone can clone, self-host, modify and share the bot for free — and every release automatically becomes plain MIT exactly two years after it ships,** so the community gets a real, irrevocable open-source guarantee rather than a promise.
2. **Nobody can sell it, host it as a paid service, or white-label it while it competes with your bot** ("competing use" = making the code available in a commercial product/service that substitutes for the bot or offers the same functionality); free community servers, education, personal and company-internal use stay allowed; paid setup/consulting is allowed (consultants just can't resell the bot).
3. **What protects your name isn't the license — it's the trademark:** register the final name + logo early, ship a brand policy that forces public forks to rebrand, and keep the license's notice/credit requirements visible (headers, NOTICE, footer); that combo stops impostor clones whether they reuse your code or rewrite it.

Why it wins: standardized, SPDX-registered, documented adoption guide (getsentry/fsl.software); the only option with a built-in path to true open source; covers every realistic monetization of a code-reusing clone while leaving the maximum set of free uses open.

### 🥈 RUNNER-UP: PolyForm Noncommercial 1.0.0 + the same trademark + attribution stack

In plain English:
1. **Free for personal, hobby, charity, education and research use; anyone may copy, change and share — but exactly zero commercial use is allowed:** no paid hosting, no selling, no use inside a for-profit company (even internally, even without competing with you).
2. **A plain-English, lawyer-drafted standard license** with a "Required Notice" mechanism that makes credit retention a formal condition, plus a 32-day fix-it window before licenses end.
3. **Trade-offs:** "noncommercial" is not fully defined (donation-funded community servers = gray zone), businesses and thus many contributors/adopters are locked out, and there is no automatic conversion to open source — choose this only if "nobody may make a cent, ever" outweighs adoption.

(Menu fallback: if monetized clones become acceptable as long as they publish changes, switch to **AGPL-3.0** — real open source. For zero tolerance toward even free hosted clones, ELv2 is the stricter but adoption-poorer cousin.)

---

## 6. Sources

- FSL: https://fsl.software/ · templates & adoption guide: https://github.com/getsentry/fsl.software
- FSL texts (SPDX): https://spdx.org/licenses/FSL-1.1-ALv2.html · https://spdx.org/licenses/FSL-1.1-MIT.html
- Elastic License 2.0: https://www.elastic.co/licensing/elastic-license
- PolyForm: https://polyformproject.org/licenses/ · Noncommercial 1.0.0: https://polyformproject.org/licenses/noncommercial/1.0.0/ · Strict 1.0.0: https://polyformproject.org/licenses/strict/1.0.0/ · official texts: https://github.com/polyformproject/polyform-licenses
- Commons Clause: https://commonsclause.com/
- GNU AGPL-3.0: https://www.gnu.org/licenses/agpl-3.0.en.html
- n8n SUL: https://github.com/n8n-io/n8n/blob/master/LICENSE.md · https://docs.n8n.io/privacy-and-security/sustainable-use-license · announcement: https://blog.n8n.io/announcing-new-sustainable-use-license/
- OSI: https://opensource.org/osd · https://opensource.org/faq
- GitHub: license docs: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository · DMCA policy: https://docs.github.com/en/site-policy/content-removal-policies/dmca-takedown-policy · trademark policy: https://docs.github.com/en/site-policy/content-removal-policies/github-trademark-policy · choosealicense appendix: https://choosealicense.com/appendix/
- Fair Source: https://fair.io/ · Redis precedent: https://redis.io/blog/agplv3 · https://redis.io/legal/licenses/
- Jacobsen v. Katzer: https://en.wikipedia.org/wiki/Jacobsen_v._Katzer
- USPTO: https://www.uspto.gov/trademarks/apply · Sonion name check: https://www.sonion.com/

## 7. Confidence & gaps

- **High confidence:** all license terms quoted from official texts (FSL: SPDX/Sentry template; PolyForm: official repo; ELv2/Commons Clause/AGPL/SUL: official pages; OSD/FAQ: OSI). GitHub shows FSL as "Other" — verified via GitHub's license API (`getsentry/sentry` → `"key":"other"`), and it's absent from choosealicense.com and GitHub's license-keyword list. Version currency (as of 2026-10-07): FSL at **1.1** (no 1.2 found; repo active May 2026); PolyForm **1.0.0 family** (Perimeter also has 1.0.1); ELv2, AGPLv3, Commons Clause v1.0, SUL v1.0 unchanged.
- **Medium confidence:** fit scores and community-reception claims are informed judgment from public precedent (Redis/Valkey, Elastic/OpenSearch, HashiCorp/OpenTofu), not measured data; the donation-funded-server analysis is reasoning, not settled law.
- **Known gaps:** no published court decisions interpret FSL or SUL (young licenses, enforcement untested); "noncommercial" and "competing use" boundaries are fact-specific; country differences matter (EU moral-rights attribution is stronger than US); Discord-specific enforcement mechanics not exhaustively researched; and — for the naming decision — **"Sonion" is already an established brand (Sonion A/S, Denmark, hearing-aid components)**; run a trademark clearance search before building brand equity on that name. Budget one lawyer pass; ~$350+/class for the USPTO filing.
