"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** Fixed HUD chrome: corner brackets, top bar (nav + clock + scroll %), status line. */
export function HudFrame() {
  const pathname = usePathname();
  const [clock, setClock] = useState("--:--:--");
  const [scrollPct, setScrollPct] = useState(0);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const p = (n: number) => String(n).padStart(2, "0");
      setClock(`${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`);
    };
    tick();
    const iv = window.setInterval(tick, 1000);
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setScrollPct(max > 0 ? Math.round((el.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearInterval(iv);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // The HUD is landing-page chrome; on app pages it collides with the sidebar/topbar.
  if (pathname !== "/") return null;

  return (
    <div aria-hidden={false} className="pointer-events-none fixed inset-0 z-40 hidden font-hud md:block">
      {/* corner brackets */}
      <span className="hud-corner left-3 top-16 border-l border-t" />
      <span className="hud-corner right-3 top-16 border-r border-t" />
      <span className="hud-corner bottom-3 left-3 border-b border-l" />
      <span className="hud-corner bottom-3 right-3 border-b border-r" />

      {/* top bar */}
      <div className="pointer-events-auto absolute inset-x-0 top-0 flex items-center justify-between px-6 py-3 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
        <Link href="/" className="flex items-center gap-2 text-zinc-300 transition hover:text-white">
          <span className="flex h-4 w-4 items-center justify-center rounded bg-gradient-to-br from-violet-600 to-cyan-500 text-[9px] font-black text-white">
            M
          </span>
          MEM.SYS
        </Link>
        <nav className="flex items-center gap-5">
          <Link href="/dashboard" className="transition hover:text-cyan-300">
            Dashboard
          </Link>
          <Link href="/servers" className="transition hover:text-cyan-300">
            Servers
          </Link>
          <Link href="/docs/api" className="transition hover:text-cyan-300">
            API
          </Link>
          <a
            href="https://github.com/Wassuplol/mem"
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-cyan-300"
          >
            GitHub
          </a>
        </nav>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-300/90">
            <span className="animate-dot h-1.5 w-1.5 rounded-full bg-emerald-400" /> ONLINE
          </span>
          <span className="tabular-nums text-zinc-400">{clock}</span>
          <span className="w-10 text-right tabular-nums text-violet-300">{scrollPct}%</span>
        </div>
      </div>

      {/* bottom status */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-6 py-3 text-[10px] uppercase tracking-[0.24em] text-zinc-600">
        <span className="ml-12">v0.1 // MIT — free forever</span>
        <span className="hidden lg:inline">59 cmds · 19 modules · 0 paywalls</span>
      </div>
    </div>
  );
}
