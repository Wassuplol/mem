"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ArrowUpRight, Braces, Brain, LayoutDashboard, Server, type LucideIcon } from "lucide-react";
import { GithubMark } from "./icons";
import { MODULES } from "@/lib/modules";
import { AuthChip } from "./auth-chip";
import { useSystem } from "@/lib/system";

export const INVITE_URL =
  "https://discord.com/oauth2/authorize?client_id=1557317832146944070&permissions=8&scope=bot+applications.commands";

const NAV: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/servers", label: "Servers", icon: Server },
  { href: "/docs/api", label: "API docs", icon: Braces },
];

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const setSection = useSystem((s) => s.setSection);

  useEffect(() => {
    setSection(
      pathname.startsWith("/dashboard")
        ? "dashboard"
        : pathname.startsWith("/servers")
          ? "servers"
          : pathname.startsWith("/docs")
            ? "docs"
            : "landing",
    );
  }, [pathname, setSection]);

  return (
    <div className="flex min-h-screen">
      {/* ---------- sidebar ---------- */}
      <aside className="glass sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-white/[0.06] bg-white/[0.015] backdrop-blur-xl md:flex">
        <Link href="/" className="flex items-center gap-3 px-5 pb-5 pt-6" data-cursor="home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg shadow-violet-600/30">
            <Brain className="h-5 w-5 text-white" />
          </span>
          <span className="font-display text-[17px] font-bold tracking-tight">Mem</span>
          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            v0.1
          </span>
        </Link>

        <nav className="flex-1 space-y-7 overflow-y-auto px-3 pb-4">
          <div className="space-y-1">
            <p className="px-3 pb-1.5 font-hud text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
              Control room
            </p>
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition ${
                    active
                      ? "bg-gradient-to-r from-violet-500/20 to-cyan-500/10 text-violet-100 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.25)]"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
                  }`}
                  data-cursor={item.label.toLowerCase()}
                >
                  <item.icon className={`h-4 w-4 ${active ? "text-violet-300" : "text-zinc-500"}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="space-y-0.5">
            <p className="px-3 pb-1.5 font-hud text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
              Modules
            </p>
            {MODULES.map((m) => (
              <div
                key={m.id}
                className="group flex cursor-default items-center gap-3 rounded-lg px-3 py-[7px] text-[13px] text-zinc-400 transition hover:bg-white/[0.04] hover:text-zinc-200"
              >
                <m.icon className="h-4 w-4 text-zinc-500 transition group-hover:text-violet-300" />
                <span className="flex-1 truncate">{m.name}</span>
                {m.status === "live" ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" title="live" />
                ) : (
                  <span className="font-hud text-[9px] uppercase tracking-wider text-zinc-600">soon</span>
                )}
              </div>
            ))}
          </div>
        </nav>

        <div className="space-y-3 border-t border-white/[0.06] p-4">
          <a
            href={INVITE_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-3 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:brightness-110 active:scale-[0.99]"
            data-cursor="invite"
          >
            Invite Mem
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          <div className="flex items-center justify-between px-1 text-[11px] text-zinc-600">
            <a
              href="https://github.com/Wassuplol/mem"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 transition hover:text-zinc-300"
            >
              <GithubMark className="h-3.5 w-3.5" />
              GitHub
            </a>
            <span>MIT · self-hosted</span>
          </div>
        </div>
      </aside>

      {/* ---------- main column ---------- */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-white/[0.06] bg-[#08080d]/75 px-5 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="md:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500">
                <Brain className="h-4 w-4 text-white" />
              </span>
            </Link>
            <h2 className="truncate font-display text-[15px] font-semibold tracking-tight">{title}</h2>
            {subtitle && (
              <span className="hidden truncate text-xs text-zinc-500 lg:block">{subtitle}</span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <AuthChip />
          </div>
        </header>
        <main className="mx-auto max-w-[1200px] px-5 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
