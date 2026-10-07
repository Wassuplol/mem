"use client";

import { useEffect, useState } from "react";

/** Thin gradient bar at the very top showing scroll position. */
export function ScrollProgress() {
  const [p, setP] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setP(max > 0 ? el.scrollTop / max : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[2px]">
      <div
        className="h-full origin-left bg-gradient-to-r from-violet-500 via-fuchsia-400 to-cyan-400"
        style={{ transform: `scaleX(${p})`, transition: "transform 80ms linear" }}
      />
    </div>
  );
}
