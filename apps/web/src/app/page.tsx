import Link from "next/link";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import { GithubMark } from "@/components/icons";
import { SignInButton } from "@/components/sign-in-button";
import { STATS } from "@/lib/modules";
import { INVITE_URL } from "@/components/app-shell";

const TERMINAL_LINES: Array<{ cmd: string; out: string; color: string }> = [
  { cmd: "/help", out: "type-to-search across all 31 commands", color: "text-violet-300" },
  { cmd: "/poll create", out: "live bars · multi-select · auto-close", color: "text-emerald-300" },
  { cmd: "/reactionrole create", out: "role panels with select menus", color: "text-cyan-300" },
  { cmd: "/reminder set 1h30m", out: "channel first, DM fallback", color: "text-amber-300" },
  { cmd: "/welcome set", out: "branded welcome cards", color: "text-pink-300" },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="animate-fade-up flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-zinc-400">
        <Sparkles className="h-3.5 w-3.5 text-violet-300" />
        Open source · MIT · self-hostable
      </div>

      <h1 className="animate-fade-up delay-1 mt-7 max-w-3xl text-center text-4xl font-extrabold tracking-tight sm:text-6xl">
        The community bot that <span className="grad-text">remembers everything</span>.
      </h1>

      <p className="animate-fade-up delay-2 mt-5 max-w-xl text-center text-[15px] leading-relaxed text-zinc-400">
        Moderation, logging, welcome, roles, polls, reminders — plus a real dashboard.
        Self-hosted with Docker, zero paywalls, every feature free forever.
      </p>

      <div className="animate-fade-up delay-3 mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:brightness-110 active:scale-[0.98]"
        >
          Open the dashboard <ArrowRight className="h-4 w-4" />
        </Link>
        <a
          href="https://github.com/Wassuplol/mem"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-zinc-200 transition hover:border-violet-400/40 hover:bg-white/[0.06]"
        >
          <GithubMark className="h-4 w-4" /> GitHub
        </a>
        <SignInButton variant="ghost" />
      </div>

      <div className="animate-fade-up delay-4 mt-12 grid w-full max-w-3xl grid-cols-3 gap-3">
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

      <div className="animate-fade-up delay-4 glass mt-10 w-full max-w-2xl rounded-2xl p-5">
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

      <p className="mt-10 text-[12px] text-zinc-500">
        <a href={INVITE_URL} target="_blank" rel="noreferrer" className="transition hover:text-zinc-300">
          Invite Mem <ArrowUpRight className="inline h-3 w-3" />
        </a>{" "}
        · MIT · built overnight by an AI agent and one very ambitious human.
      </p>
    </main>
  );
}
