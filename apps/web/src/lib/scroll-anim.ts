"use client";

import { gsap, ScrollTrigger } from "./anim";
import { useSystem } from "./system";

/** 0..1 progress of the pinned hero — read by the WebGL dolly each frame. */
export function heroScrollProgress(): number {
  return useSystem.getState().heroProgress;
}

/** Pin the hero and drive content parallax + camera dolly. Returns cleanup. */
export function initHeroScroll(): () => void {
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  const content = document.querySelector<HTMLElement>("[data-hero-content]");
  if (!hero || !content) return () => undefined;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return () => undefined;

  const trigger = ScrollTrigger.create({
    trigger: hero,
    start: "top top",
    end: "+=70%",
    pin: true,
    scrub: 0.6,
    onUpdate: (self) => {
      useSystem.getState().setHeroProgress(self.progress);
    },
  });

  // The animated [data-hero-content] always starts at opacity 1 (its wrapper
  // holds the gate's hidden state), so a plain .to() captures the right start.
  const parallax = gsap.to(content, {
    yPercent: -8,
    opacity: 0.35,
    ease: "none",
    scrollTrigger: { trigger: hero, start: "top top", end: "+=70%", scrub: 0.6 },
  });

  return () => {
    useSystem.getState().setHeroProgress(0);
    trigger.kill();
    parallax.scrollTrigger?.kill();
    parallax.kill();
  };
}

/** Run once for elements below the fold: fade-up + stagger via batch. */
export function initReveals(): () => void {
  const ctx = gsap.context(() => {
    ScrollTrigger.batch("[data-reveal]", {
      start: "top 88%",
      once: true,
      onEnter: (els) =>
        gsap.fromTo(
          els,
          { y: 34, opacity: 0, filter: "blur(6px)" },
          { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.9, ease: "power3.out", stagger: 0.08, overwrite: true },
        ),
    });
  });
  return () => ctx.revert();
}
