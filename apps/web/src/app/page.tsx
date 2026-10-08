"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import { gsap } from "@/lib/anim";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GithubMark } from "@/components/icons";
import { SignInButton } from "@/components/sign-in-button";
import { HeroScene } from "@/components/landing/hero-scene";
import { EntryGate } from "@/components/landing/entry-gate";
import { TerminalTyping } from "@/components/landing/terminal-typing";
import { CountUp } from "@/components/landing/count-up";
import { TiltCard } from "@/components/landing/tilt-card";
import { Marquee } from "@/components/effects/marquee";
import type { MemiMode } from "@/components/memi/chibi";
import { initHeroScroll, initReveals } from "@/lib/scroll-anim";
import { STATS } from "@/lib/modules";
import { INVITE_URL } from "@/components/app-shell";

const TERMINAL_LINES = [
  { cmd: "/help", out: "type-to-search across every command", color: "text-violet-300" },
  { cmd: "/giveaway start", out: "button entries · crypto-random draw", color: "text-emerald-300" },
  { cmd: "/tempban @user 2h", out: "auto-unbanned when it expires", color: "text-amber-300" },
  { cmd: "/reactionrole create", out: "role panels with select menus", color: "text-cyan-300" },
  { cmd: "/reminder set 1h30m", out: "channel first, DM fallback", color: "text-pink-300" },
];

const COMMAND_TICKER = [
  "/ban", "/kick", "/timeout", "/warn", "/purge", "/slowmode", "/poll", "/giveaway",
  "/reminder", "/welcome", "/reactionrole", "/temprole", "/tempban", "/apikey", "/case", "/pin",
];

export default function Home() {
  const [entered, setEntered] = useState(false);
  const [mood, setMood] = useState<MemiMode>("idle");

  const onEnter = useCallback(() => {
    setEntered(true);
    setMood("talking");
    window.setTimeout(() => setMood("idle"), 6000);
    requestAnimationFrame(() => {
      gsap.fromTo(
        "[data-hero-intro]",
        { y: 44, opacity: 0, filter: "blur(8px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.1, ease: "power3.out", stagger: 0.1 },
      );
    });
  }, []);

  useEffect(() => {
    const cleanHero = initHeroScroll();
    const cleanReveals = initReveals();
    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);
    return () => {
      window.removeEventListener("load", onLoad);
      cleanHero();
      cleanReveals();
    };
  }, []);

  return (
    <main className="relative">
      {/* ============ cinematic hero (pinned, scroll-dollied) ============ */}
      <section data-hero className="relative flex min-h-[100svh] items-center overflow-hidden px-6 sm:px-10 lg:px-16">
        <div className="absolute inset-0 z-0 hidden md:block">
          <HeroScene mood={mood} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-36 bg-gradient-to-b from-[#08080d] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-40 bg-gradient-to-t from-[#08080d] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] hidden w-[62%] bg-gradient-to-r from-[#08080d] via-[#08080d]/65 to-transparent md:block" />

        <EntryGate onEnter={onEnter} />

        <div
          data-hero-content
          className="pointer-events-none relative z-10 flex w-full flex-col items-center text-center md:max-w-xl md:items-start md:text-left"
          style={entered ? undefined : { opacity: 0 }}
        >
          <div data-hero-intro className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-[15px] font-black text-white shadow-lg shadow-violet-600/30">
              M
            </span>
            <span className="font-display text-xl font-bold tracking-tight">
              Mem<span className="text-violet-400">.</span>
            </span>
            <span className="hidden font-hud text-[11px] uppercase tracking-[0.2em] text-zinc-500 sm:inline">
              the memory of your server
            </span>
          </div>

          <div data-hero-intro className="mt-5 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-zinc-400 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-violet-300" />
            Open source · MIT · self-hostable
          </div>

          <h1 data-hero-intro className="font-display mt-7 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            The community bot that <span className="grad-text">remembers everything</span>.
          </h1>

          <p data-hero-intro className="mt-5 max-w-lg text-[15px] leading-relaxed text-zinc-300">
            Moderation, giveaways, tempbans, polls, reminders — plus a real dashboard with an AI
            companion. Self-hosted with Docker, zero paywalls, every feature free forever.
          </p>

          <div data-hero-intro className="pointer-events-auto mt-9 flex flex-wrap items-center justify-center gap-3 md:justify-start">
            <Link
              href="/dashboard"
              data-cursor="open"
              className="btn-hero hero-glow inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
            >
              Enter the dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="https://github.com/Wassuplol/mem"
              target="_blank"
              rel="noreferrer"
              data-cursor="code"
              className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-zinc-200 backdrop-blur-md transition hover:border-violet-400/40 hover:bg-white/[0.06]"
            >
              <GithubMark className="h-4 w-4" /> GitHub
            </a>
            <SignInButton variant="ghost" />
          </div>

          <div data-hero-intro className="mt-12 grid w-full max-w-md grid-cols-3 gap-3">
            {[
              { v: STATS.commands, l: "commands live" },
              { v: STATS.modules, l: "modules" },
              { v: 0, l: "paywalls", static: true },
            ].map((s) => (
              <div key={s.l} className="glass rounded-2xl px-4 py-4 text-center">
                <p className="font-mono text-2xl font-bold tracking-tight">
                  {"static" in s ? 0 : <CountUp to={s.v} />}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-zinc-500">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-7 left-6 z-10 flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 font-hud text-[10.5px] uppercase tracking-[0.22em] text-zinc-400 backdrop-blur-md sm:left-10 lg:left-16">
          scroll to explore
          <ArrowDown className="animate-scroll-hint h-3.5 w-3.5 text-violet-300" />
        </div>
      </section>

      {/* ============ ticker ============ */}
      <div className="relative z-10 border-y border-white/[0.07] bg-black/30 py-3 backdrop-blur-sm">
        <Marquee
          items={[
            "free forever",
            "open source · MIT",
            `${STATS.commands} commands live`,
            "self-host with docker",
            "no paywalls",
            "Memi onboard",
          ]}
        />
      </div>

      {/* ============ arsenal ============ */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-10 pt-20">
        <div data-reveal>
          <p className="font-hud text-[11px] uppercase tracking-[0.3em] text-cyan-300/80">01 // the arsenal</p>
          <h2 className="font-display mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            Every command, one keystroke away<span className="text-violet-400">.</span>
          </h2>
        </div>
        <div data-reveal className="mt-8">
          <TerminalTyping lines={TERMINAL_LINES} />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            { t: "A platform, not a bot", d: "Every feature is API-first. Create a key with /apikey and build on top." },
            { t: "Memi, your copilot", d: "A VTuber companion lives in the dashboard and walks you around." },
            { t: "Free forever", d: "MIT-licensed, Docker-first. One ARM VM hosts the whole stack." },
          ].map((c) => (
            <div key={c.t} data-reveal>
              <TiltCard className="glass card-lift h-full rounded-2xl p-5">
                <p className="font-display text-[15px] font-semibold text-zinc-100">{c.t}</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-zinc-500">{c.d}</p>
              </TiltCard>
            </div>
          ))}
        </div>
      </section>

      {/* ============ command ticker ============ */}
      <div className="relative z-10 border-y border-white/[0.07] bg-black/30 py-3 backdrop-blur-sm">
        <Marquee fast items={COMMAND_TICKER} />
      </div>

      {/* ============ CTA + footer ============ */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-8 pt-20 text-center">
        <div data-reveal>
          <p className="font-hud text-[11px] uppercase tracking-[0.3em] text-cyan-300/80">02 // deploy</p>
          <h2 className="font-display mx-auto mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">
            Bring your community <span className="grad-text">to life</span>.
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard"
              data-cursor="open"
              className="btn-hero inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
            >
              Open the dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={INVITE_URL}
              target="_blank"
              rel="noreferrer"
              data-cursor="invite"
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.03] px-5 py-2.5 text-sm text-zinc-300 transition hover:border-violet-400/40 hover:text-zinc-100"
            >
              or invite Mem to your server <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </section>

      <footer className="relative z-10 overflow-hidden border-t border-white/[0.07] px-6 pb-10 pt-12">
        <p
          aria-hidden
          className="font-display pointer-events-none select-none text-center text-[22vw] font-bold leading-[0.85] tracking-tight text-transparent md:text-[16rem]"
          style={{ WebkitTextStroke: "1px rgba(255,255,255,0.13)" }}
        >
          MEM.
        </p>
        <div className="mx-auto mt-6 flex max-w-5xl flex-wrap items-center justify-between gap-3 text-[11.5px] text-zinc-600">
          <span>MIT · built overnight by an AI agent and one very ambitious human.</span>
          <span className="flex items-center gap-4">
            <a href="https://github.com/Wassuplol/mem" target="_blank" rel="noreferrer" className="transition hover:text-zinc-300">
              GitHub
            </a>
            <Link href="/docs/api" className="transition hover:text-zinc-300">
              API docs
            </Link>
            <Link href="/dashboard" className="transition hover:text-zinc-300">
              Dashboard
            </Link>
          </span>
        </div>
      </footer>
    </main>
  );
}
