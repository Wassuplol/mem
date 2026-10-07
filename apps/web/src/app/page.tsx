import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import { GithubMark } from "@/components/icons";
import { SignInButton } from "@/components/sign-in-button";
import { HeroScene } from "@/components/landing/hero-scene";
import { Reveal } from "@/components/effects/reveal";
import { STATS } from "@/lib/modules";
import { INVITE_URL } from "@/components/app-shell";

const TERMINAL_LINES: Array<{ cmd: string; out: string; color: string }> = [
  { cmd: "/help", out: "type-to-search across every command", color: "text-violet-300" },
  { cmd: "/giveaway start", out: "button entries · crypto-random draw", color: "text-emerald-300" },
  { cmd: "/tempban @user 2h", out: "auto-unbanned when it expires", color: "text-amber-300" },
  { cmd: "/reactionrole create", out: "role panels with select menus", color: "text-cyan-300" },
  { cmd: "/reminder set 1h30m", out: "channel first, DM fallback", color: "text-pink-300" },
];

export default function Home() {
  return (
    <main className="relative">
      {/* ============ cinematic hero ============ */}
      <section className="relative flex min-h-[100svh] items-center overflow-hidden px-6 sm:px-10 lg:px-16">
        <div className="absolute inset-0 z-0 hidden md:block">
          <HeroScene />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-36 bg-gradient-to-b from-[#08080d] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-40 bg-gradient-to-t from-[#08080d] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] hidden w-[62%] bg-gradient-to-r from-[#08080d] via-[#08080d]/65 to-transparent md:block" />

        <div className="pointer-events-none relative z-10 flex w-full flex-col items-center text-center md:max-w-xl md:items-start md:text-left">
          <div className="animate-fade-up flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-[15px] font-black text-white shadow-lg shadow-violet-600/30">
              M
            </span>
            <span className="text-xl font-black tracking-tight">
              Mem<span className="text-violet-400">.</span>
            </span>
            <span className="hidden text-[11px] uppercase tracking-[0.2em] text-zinc-500 sm:inline">
              the memory of your server
            </span>
          </div>

          <div className="animate-fade-up mt-5 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-zinc-400 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
            Open source · MIT · self-hostable
          </div>

          <h1 className="animate-fade-up delay-1 mt-7 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            The community bot that <span className="grad-text">remembers everything</span>.
          </h1>

          <p className="animate-fade-up delay-2 mt-5 max-w-lg text-[15px] leading-relaxed text-zinc-300">
            Moderation, giveaways, tempbans, polls, reminders — plus a real dashboard with an AI
            companion. Self-hosted with Docker, zero paywalls, every feature free forever.
          </p>

          <div className="animate-fade-up delay-3 pointer-events-auto mt-9 flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <Link
              href="/dashboard"
              className="btn-hero hero-glow inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
            >
              Enter the dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/Wassuplol/mem"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-zinc-200 backdrop-blur-md transition hover:border-violet-400/40 hover:bg-white/[0.06]"
            >
              <GithubMark className="h-4 w-4" /> GitHub
            </a>
            <SignInButton variant="ghost" />
          </div>

          <div className="animate-fade-up delay-4 mt-12 grid w-full max-w-md grid-cols-3 gap-3">
            {[
              { v: `${STATS.commands}`, l: "commands live" },
              { v: `${STATS.modules}`, l: "modules" },
              { v: "0", l: "paywalls" },
            ].map((s) => (
              <div key={s.l} className="glass rounded-2xl px-4 py-4 text-center">
                <p className="font-mono text-2xl font-bold tracking-tight">{s.v}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-zinc-500">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="animate-fade-up delay-4 absolute bottom-7 left-6 z-10 flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[10.5px] uppercase tracking-[0.22em] text-zinc-400 backdrop-blur-md sm:left-10 lg:left-16">
          scroll to explore
          <ArrowDown className="animate-scroll-hint h-3.5 w-3.5 text-violet-300" />
        </div>
      </section>

      {/* ============ below the fold ============ */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-20">
        <Reveal>
          <div className="glass w-full rounded-2xl p-5">
            <div className="flex items-center gap-1.5 pb-4">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-3 font-mono text-[11px] text-zinc-600">mem · your-server</span>
            </div>
            <div className="space-y-2.5 font-mono text-[12.5px]">
              {TERMINAL_LINES.map((line) => (
                <p key={line.cmd} className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-zinc-500">{line.cmd}</span>
                  <span className={line.color}>{line.out}</span>
                </p>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { t: "A platform, not a bot", d: "Every feature is API-first. Create a key with /apikey and build on top." },
              { t: "Memi, your copilot", d: "A 3D chibi companion lives in the dashboard and walks you around." },
              { t: "Free forever", d: "MIT-licensed, Docker-first. One ARM VM hosts the whole stack." },
            ].map((c) => (
              <div key={c.t} className="glass card-lift rounded-2xl p-5">
                <p className="text-[14px] font-semibold text-zinc-100">{c.t}</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-500">{c.d}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={200}>
          <div className="mt-10 flex flex-col items-center gap-2 text-center">
            <p className="text-[13px] text-zinc-500">Ready to bring your community to life?</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-violet-400/40 bg-violet-400/10 px-5 py-2.5 text-sm font-semibold text-violet-100 transition hover:bg-violet-400/20"
              >
                Open the dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href={INVITE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-zinc-400 transition hover:text-zinc-200"
              >
                or invite Mem to your server <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </Reveal>

        <Reveal delay={260}>
          <p className="mt-14 text-center text-[11.5px] text-zinc-600">
            MIT · built overnight by an AI agent and one very ambitious human.
          </p>
        </Reveal>
      </section>
    </main>
  );
}
