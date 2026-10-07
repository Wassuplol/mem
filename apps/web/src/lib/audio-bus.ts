"use client";

/** Tiny event bus so the entry gate can start ambient audio (user gesture = autoplay-safe). */
export const AUDIO_START_EVENT = "mem:audio-start";

export function requestAudioStart(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(AUDIO_START_EVENT));
}
