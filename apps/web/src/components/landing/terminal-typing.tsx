"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export interface TermLine {
  cmd: string;
  out: string;
  color: string;
}

/** Terminal card whose lines type themselves when scrolled into view. */
export function TerminalTyping({ lines }: { lines: TermLine[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState(0);
  const [chars, setChars] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let killed = false;
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 80%",
      once: true,
      onEnter: () => {
        let li = 0;
        let ci = 0;
        const step = () => {
          if (killed) return;
          const line = lines[li];
          if (!line) return;
          const full = `${line.cmd}  ${line.out}`;
          ci += 2;
          if (ci >= full.length) {
            li += 1;
            ci = 0;
            setTyped(li);
            setChars(0);
            if (li >= lines.length) return;
          } else {
            setChars(ci);
          }
          window.setTimeout(step, 14);
        };
        step();
      },
    });
    return () => {
      killed = true;
      trigger.kill();
    };
  }, [lines]);

  return (
    <div ref={ref} className="glass w-full rounded-2xl p-5">
      <div className="flex items-center gap-1.5 pb-4">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-3 font-hud text-[11px] text-zinc-600">mem · your-server</span>
      </div>
      <div className="min-h-[148px] space-y-2.5 font-mono text-[12.5px]">
        {lines.map((line, i) => {
          if (i < typed) {
            return (
              <p key={line.cmd} className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-zinc-500">{line.cmd}</span>
                <span className={line.color}>{line.out}</span>
              </p>
            );
          }
          if (i === typed) {
            const full = `${line.cmd}  ${line.out}`;
            const shown = full.slice(0, chars);
            const cmdLen = line.cmd.length;
            return (
              <p key={line.cmd} className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-zinc-500">{shown.slice(0, Math.min(chars, cmdLen))}</span>
                {chars > cmdLen + 1 && <span className={line.color}>{shown.slice(cmdLen + 2)}</span>}
                <span className="animate-pulse text-violet-300">▊</span>
              </p>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
