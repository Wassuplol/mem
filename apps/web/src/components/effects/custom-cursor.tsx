"use client";

import { useEffect, useRef } from "react";

/**
 * Awwwards-style cursor: a dot + trailing ring that expands over interactive
 * elements and shows a context label from [data-cursor]. Fine pointers only.
 */
export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    document.documentElement.classList.add("has-custom-cursor");
    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!dot || !ring || !label) return;

    let mx = -100;
    let my = -100;
    let rx = -100;
    let ry = -100;
    let scale = 1;
    let targetScale = 1;
    let raf = 0;
    let visible = false;

    const show = () => {
      if (!visible) {
        visible = true;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }
    };

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      show();
      const t = e.target as HTMLElement | null;
      const tagged = t?.closest?.("[data-cursor]") as HTMLElement | null;
      const interactive = t?.closest?.("a, button, input, textarea, select, [role='button']");
      if (tagged?.dataset.cursor) {
        label.textContent = tagged.dataset.cursor;
        ring.classList.add("cursor-ring-label");
        targetScale = 2.6;
      } else {
        label.textContent = "";
        ring.classList.remove("cursor-ring-label");
        targetScale = interactive ? 1.7 : 1;
      }
      ring.classList.toggle("cursor-ring-active", !!interactive || !!tagged);
    };

    const onLeave = () => {
      visible = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    const loop = () => {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      scale += (targetScale - scale) * 0.18;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("has-custom-cursor");
    };
  }, []);

  return (
    <>
      <div ref={dotRef} aria-hidden className="cursor-dot" />
      <div ref={ringRef} aria-hidden className="cursor-ring">
        <span ref={labelRef} className="cursor-label" />
      </div>
    </>
  );
}
