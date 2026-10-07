import Link from "next/link";
import { SignInButton } from "@/components/sign-in-button";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-8">
      <div className="max-w-xl w-full space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            🧠
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">Mem</h1>
        </div>
        <p className="text-zinc-400 leading-relaxed">
          The community-management Discord bot done right - modular core, everything free,
          AI built-in. This dashboard is the control room: modules, logs, roles, tickets and
          more will live here.
        </p>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Dashboard status</span>
            <span className="text-xs rounded-full border border-amber-500/40 text-amber-400 px-2 py-0.5">
              P1 scaffold
            </span>
          </div>
          <ul className="text-sm text-zinc-300 space-y-1.5 list-disc list-inside">
            <li>Next.js + Tailwind foundations in place</li>
            <li>Discord OAuth2 login - wired in</li>
            <li>Per-module config pages - after auth</li>
          </ul>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SignInButton />
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 hover:border-zinc-500 transition"
          >
            Open dashboard preview →
          </Link>
        </div>
        <p className="text-xs text-zinc-500">
          Mem · github.com/Wassuplol/mem · MIT
        </p>
      </div>
    </main>
  );
}
