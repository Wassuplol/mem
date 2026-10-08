"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/anim";
import { reduceMotion } from "@/lib/anim";

/** Wipe overlay that slides in (out) + content fades in on route change. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const overlay = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!overlay.current || reduceMotion()) return;
    // exit: wipe in
    gsap.fromTo(
      overlay.current,
      { scaleY: 0, transformOrigin: "bottom" },
      { scaleY: 1, duration: 0.38, ease: "power2.in" },
    );
    // enter: wipe out + content lift
    const tl = gsap.timeline();
    tl.to(overlay.current, {
      scaleY: 0,
      transformOrigin: "top",
      duration: 0.44,
      ease: "power2.out",
      delay: 0.12,
    });
  }, [pathname]);

  return (
    <>
      <div
        ref={overlay}
        className="pointer-events-none fixed inset-0 z-[85] scale-y-0 bg-gradient-to-b from-violet-600 via-[#0a0a14] to-cyan-500"
        style={{ mixBlendMode: "normal" }}
      />
      {children}
    </>
  );
}
