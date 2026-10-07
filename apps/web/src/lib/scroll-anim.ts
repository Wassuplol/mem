"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

let heroProgress = 0;
/** 0..1 progress of the pinned hero — read by the WebGL dolly each frame. */
export function heroScrollProgress(): number {
  return heroProgress;
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
      heroProgress = self.progress;
    },
  });

  const parallax = gsap.to(content, {
    yPercent: -8,
    opacity: 0.35,
    ease: "none",
    scrollTrigger: { trigger: hero, start: "top top", end: "+=70%", scrub: 0.6 },
  });

  return () => {
    heroProgress = 0;
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
