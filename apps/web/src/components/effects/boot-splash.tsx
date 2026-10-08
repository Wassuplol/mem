"use client";

import { useEffect, useState } from "react";

const LINES = ["INITIALIZING CORE", "LINKING GATEWAYS", "LOADING AVATAR", "CALIBRATING STARS"];
const TOTAL_MS = 1900;

/** Once-per-session boot sequence - an "INITIATE SYSTEM EXPERIENCE" moment. */
export function BootSplash() {
  const [phase, setPhase] = useState<"boot" | "leaving" | "done">("boot");
  const [line, setLine] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (
      window.sessionStorage.getItem("mem-booted") === "1" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setPhase("done");
      return;
    }

    let iv = 0;
    let to = 0;
    const skip = () => {
      window.clearInterval(iv);
      window.clearTimeout(to);
      window.sessionStorage.setItem("mem-booted", "1");
      document.documentElement.classList.remove("_boot-lock");
      setPhase("done");
    };

    document.documentElement.classList.add("_boot-lock");
    const started = Date.now();
    iv = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const pct = Math.min(100, Math.round((elapsed / TOTAL_MS) * 100));
      setProgress(pct);
      setLine(Math.min(LINES.length - 1, Math.floor((elapsed / TOTAL_MS) * LINES.length)));
      if (pct >= 100) {
        window.clearInterval(iv);
        window.sessionStorage.setItem("mem-booted", "1");
        document.documentElement.classList.remove("_boot-lock");
        setPhase("leaving");
        to = window.setTimeout(() => setPhase("done"), 700);
      }
    }, 55);

    to = window.setTimeout(skip, 8000);
    window.addEventListener("keydown", skip, { once: true });
    window.addEventListener("click", skip, { once: true });

    return () => {
      window.clearInterval(iv);
      window.clearTimeout(to);
      window.removeEventListener("keydown", skip);
      window.removeEventListener("click", skip);
      document.documentElement.classList.remove("_boot-lock");
    };
  }, []);

  if (phase === "done") return null;
  return (
    <div
      aria-hidden
      className={`fixed inset-0 z-[200] flex cursor-pointer flex-col items-center justify-center bg-[#08080d] transition-opacity duration-[700ms] ${
        phase === "leaving" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-lg font-black text-white shadow-lg shadow-violet-600/40">
          M
        </span>
        <span className="text-2xl font-black tracking-tight">
          Mem<span className="text-violet-400">.</span>
        </span>
      </div>
      <p className="mt-7 font-mono text-[11px] uppercase tracking-[0.32em] text-zinc-500">
        {LINES[line]}
        <span className="animate-pulse text-violet-400">_</span>
      </p>
      <div className="mt-4 h-[3px] w-60 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-400 transition-[width] duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-8 space-y-1 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-700">a world for your community</p>
        <p className="text-[9.5px] uppercase tracking-[0.2em] text-zinc-700/70">click / key to skip</p>
      </div>
    </div>
  );
}
