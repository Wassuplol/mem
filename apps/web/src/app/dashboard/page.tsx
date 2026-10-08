import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import {
  AlarmClock,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Compass,
  HeartHandshake,
  MousePointerClick,
  Radio,
  Rocket,
  Sparkles,
  Terminal,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { GithubMark } from "@/components/icons";
import { LIVE_MODULES, MODULES, STATS } from "@/lib/modules";
import { INVITE_URL } from "@/components/app-shell";

async function Greeting() {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  const name = session?.user.name?.split(" ")[0] ?? null;

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300/90">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-dot" />
        Mem v0.1 · live in your server
      </div>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        {name ? (
          <>
            Welcome back, <span className="grad-text">{name}</span>.
          </>
        ) : (
          <>
            The control room for <span className="grad-text">your community</span>.
          </>
        )}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
        {STATS.commands} commands, {STATS.modules} modules and a {STATS.roadmapTotal}-command
        roadmap — every feature free, forever. Link a server to get started, or scroll for the tour.
      </p>
    </div>
  );
}

function GreetingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-3 w-44 animate-pulse rounded-full bg-white/[0.07]" />
      <div className="h-9 w-80 max-w-full animate-pulse rounded-xl bg-white/[0.07]" />
      <div className="h-4 w-[28rem] max-w-full animate-pulse rounded-full bg-white/[0.05]" />
    </div>
  );
}

const STAT_CARDS = [
  { icon: Terminal, label: "Commands live", value: STATS.commands, sub: `across ${STATS.modules} modules` },
  { icon: Boxes, label: "Feature modules", value: LIVE_MODULES.length, sub: `plus core & ${MODULES.length - LIVE_MODULES.length} on the way` },
  { icon: Radio, label: "Gateway events", value: STATS.events, sub: "logging · welcome · reminders" },
  { icon: MousePointerClick, label: "Component engines", value: STATS.components, sub: "help · poll · roles" },
];

const CHANGELOG = [
  { icon: Compass, title: "Help hub", text: "Type-to-search across every command — categories, pages, instant answers." },
  { icon: BarChart3, title: "Polls", text: "Modal creation, live bar results, multi-select, auto-close timers." },
  { icon: MousePointerClick, title: "Reaction roles", text: "Select-menu role panels with live repaint and hierarchy guards." },
  { icon: AlarmClock, title: "Reminders", text: "Natural durations with channel→DM fallback and an autocomplete picker." },
  { icon: HeartHandshake, title: "Welcome cards", text: "Branded embeds with avatars and {user} {server} {count} templates." },
  { icon: Sparkles, title: "This dashboard", text: "A control room worthy of the name. You are looking at it." },
];

export default function DashboardOverview() {
  const progress = Math.round((STATS.roadmapDone / STATS.roadmapTotal) * 100);

  return (
    <div className="space-y-10">
      <Suspense fallback={<GreetingSkeleton />}>
        <Greeting />
      </Suspense>

      {/* stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((card, i) => (
          <div key={card.label} className={`glass card-lift animate-fade-up delay-${i + 1} rounded-2xl p-5`}>
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/25 to-cyan-500/10 text-violet-300">
                <card.icon className="h-4.5 w-4.5" />
              </span>
              <span className="font-mono text-3xl font-bold tracking-tight">{card.value}</span>
            </div>
            <p className="mt-4 text-[13px] font-medium text-zinc-200">{card.label}</p>
            <p className="mt-0.5 text-[11.5px] text-zinc-500">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* roadmap */}
      <section className="glass animate-fade-up delay-2 rounded-2xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Rocket className="h-4 w-4 text-violet-300" />
              The {STATS.roadmapTotal}-command roadmap
            </h3>
            <p className="mt-1 text-xs text-zinc-500">
              First-party commands, zero plugins — the full master plan is public.
            </p>
          </div>
          <a
            href="https://github.com/Wassuplol/mem/blob/main/docs/COMMAND-CATALOG.md"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-violet-300 transition hover:text-violet-200"
          >
            View catalog <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-zinc-400">Shipped</span>
            <span className="font-mono text-zinc-300">
              {STATS.roadmapDone} / {STATS.roadmapTotal} · {progress}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
            <div
              className="animate-shimmer h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-400"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      {/* modules */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Modules</h3>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.06] px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            <CheckCircle2 className="h-3 w-3" /> 8 live
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((m) => (
            <div key={m.id} className="glass card-lift rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${m.accent}`}>
                  <m.icon className="h-5 w-5" />
                </span>
                {m.status === "live" ? (
                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                    live
                  </span>
                ) : (
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    soon
                  </span>
                )}
              </div>
              <h4 className="mt-4 text-[15px] font-semibold">{m.name}</h4>
              <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-400">{m.description}</p>
              {m.commands ? (
                <p className="mt-3 font-mono text-[11px] text-zinc-500">
                  {m.commands} command{m.commands > 1 ? "s" : ""}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* changelog + quick actions */}
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <section className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold">What&apos;s new</h3>
          <ul className="mt-4 space-y-4">
            {CHANGELOG.map((item) => (
              <li key={item.title} className="flex gap-3.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-violet-300">
                  <item.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-zinc-200">{item.title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-zinc-500">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass flex flex-col rounded-2xl p-6">
          <h3 className="text-sm font-semibold">Quick actions</h3>
          <div className="mt-4 flex flex-1 flex-col gap-3">
            <Link
              href="/servers"
              className="group flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[13.5px] font-medium transition hover:border-violet-400/35 hover:bg-white/[0.05]"
            >
              Browse your servers
              <ArrowRight className="h-4 w-4 text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-violet-300" />
            </Link>
            <a
              href={INVITE_URL}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[13.5px] font-medium transition hover:border-violet-400/35 hover:bg-white/[0.05]"
            >
              Invite Mem to a server
              <ArrowUpRight className="h-4 w-4 text-zinc-500 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-violet-300" />
            </a>
            <a
              href="https://github.com/Wassuplol/mem"
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[13.5px] font-medium transition hover:border-violet-400/35 hover:bg-white/[0.05]"
            >
              Star it on GitHub
              <GithubMark className="h-4 w-4 text-zinc-500 transition group-hover:text-violet-300" />
            </a>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-zinc-600">
            Self-hosted with Docker · PostgreSQL + Redis · MIT licensed
          </p>
        </section>
      </div>
    </div>
  );
}
