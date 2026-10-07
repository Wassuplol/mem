"use client";

/**
 * Mutable scroll progress of the pinned hero (0 = entered, 1 = pinned end).
 * Written by ScrollTrigger, read inside the WebGL frame loop (no re-renders).
 */
export const heroScrollState = { progress: 0 };
