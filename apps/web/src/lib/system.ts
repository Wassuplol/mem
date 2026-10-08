"use client";

import { create } from "zustand";

/** Shared UI store - tiny, hot-path only. */
interface SystemState {
  /** 0..1 progress of the pinned hero */
  heroProgress: number;
  /** currently active top-level route section */
  section: "landing" | "dashboard" | "servers" | "docs";
  /** ambient audio enabled flag (persisted separately) */
  audioOn: boolean;
  /** true while a modal/drawer is open — floating widgets step aside */
  modalOpen: boolean;
  setHeroProgress: (v: number) => void;
  setSection: (s: SystemState["section"]) => void;
  setAudio: (v: boolean) => void;
  setModalOpen: (v: boolean) => void;
}

export const useSystem = create<SystemState>()((set) => ({
  heroProgress: 0,
  section: "landing",
  audioOn: false,
  modalOpen: false,
  setHeroProgress: (heroProgress: number) => set({ heroProgress }),
  setSection: (section: SystemState["section"]) => set({ section }),
  setAudio: (audioOn: boolean) => set({ audioOn }),
  setModalOpen: (modalOpen: boolean) => set({ modalOpen }),
}));
