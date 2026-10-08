"use client";

import { useEffect, useRef, useState } from "react";
import { Headphones, Power } from "lucide-react";
import { gsap } from "@/lib/anim";
import { requestAudioStart } from "@/lib/audio-bus";

const KEY = "mem-entered";

/**
 * Cinematic entry gate over the hero (edolus-style): letterbox bars + a single
 * INITIALIZE button. Clicking starts audio, retracts the bars and staggers the
 * hero content in. Never blocks scrolling; skipped on repeat visits.
 */
export function EntryGate({ onEnter }: { onEnter: () => void }) {
  const [visible, setVisible] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.sessionStorage.getItem(KEY) === "1") {
      onEnter();
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.sessionStorage.setItem(KEY, "1");
      onEnter();
      return;
    }
    setVisible(true);
  }, [onEnter]);

  const enter = () => {
    window.sessionStorage.setItem(KEY, "1");
    requestAudioStart();
    const root = rootRef.current;
    if (!root) {
      setVisible(false);
      onEnter();
      return;
    }
    const tl = gsap.timeline({
      onComplete: () => {
        setVisible(false);
        onEnter();
      },
    });
    tl.to("[data-gate-panel]", { y: -24, opacity: 0, duration: 0.5, ease: "power2.in" }, 0)
      .to("[data-gate-bar-top]", { yPercent: -100, duration: 0.9, ease: "power3.inOut" }, 0.15)
      .to("[data-gate-bar-bottom]", { yPercent: 100, duration: 0.9, ease: "power3.inOut" }, 0.15)
      .to(root, { opacity: 0, duration: 0.4 }, 0.7);
  };

  if (!visible) return null;
  return (
    <div ref={rootRef} className="absolute inset-0 z-30">
      <div data-gate-bar-top className="absolute inset-x-0 top-0 h-[8vh] min-h-12 bg-black" />
      <div data-gate-bar-bottom className="absolute inset-x-0 bottom-0 h-[8vh] min-h-12 bg-black" />
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div
          data-gate-panel
          className="glass flex max-w-md flex-col items-center rounded-2xl px-8 py-8 text-center shadow-2xl shadow-black/60"
        >
          <p className="font-hud text-[10px] uppercase tracking-[0.34em] text-cyan-300/90">
            system ready // mem.sys v0.1
          </p>
          <h2 className="font-display mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Enter the world<span className="text-violet-400">.</span>
          </h2>
          <p className="mt-3 flex items-center gap-2 text-[12.5px] text-zinc-400">
            <Headphones className="h-3.5 w-3.5 text-zinc-500" />
            best experienced with sound on
          </p>
          <button
            onClick={enter}
            data-cursor="enter"
            className="btn-hero hero-glow group mt-7 inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500 px-8 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
          >
            <Power className="h-4 w-4 transition group-hover:rotate-12" />
            INITIALIZE EXPERIENCE
          </button>
          <p className="mt-4 text-[10.5px] uppercase tracking-[0.22em] text-zinc-600">
            or scroll — the gate never blocks you
          </p>
        </div>
      </div>
    </div>
  );
}
