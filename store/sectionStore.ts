"use client";

import { create } from "zustand";
import type { Gender } from "@/lib/types";

/** Which collection (men's or women's) is in the middle of the screen, for the header. */
export const useSectionStore = create<{
  active: Gender;
  setActive: (gender: Gender) => void;
}>((set) => ({
  active: "women",
  setActive: (active) => set((state) => (state.active === active ? state : { active })),
}));
