"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/anim";

/** Number that counts up when scrolled into view. */
export function CountUp({ to, className = "" }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obj = { v: 0 };
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => {
        gsap.to(obj, {
          v: to,
          duration: 1.4,
          ease: "power2.out",
          onUpdate: () => setVal(Math.round(obj.v)),
        });
      },
    });
    return () => {
      trigger.kill();
    };
  }, [to]);

  return (
    <span ref={ref} className={className}>
      {val}
    </span>
  );
}
