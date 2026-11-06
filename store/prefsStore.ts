"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { defaultSkinToneId, skinTones } from "@/data/skinTones";
import { prefsStateSchema } from "@/lib/schemas";
import type { Gender } from "@/lib/types";

interface PrefsState {
  /** Remembered per gender, so each avatar keeps its own tone. */
  skinTone: Record<Gender, string>;
  setSkinTone: (gender: Gender, id: string) => void;
  skinHex: (gender: Gender) => string;
}

function hexFor(id: string): string {
  return (
    skinTones.find((t) => t.id === id)?.hex ??
    skinTones.find((t) => t.id === defaultSkinToneId)?.hex ??
    "#c99268"
  );
}

export const usePrefsStore = create<PrefsState>()(
  persist(
    (set, get) => ({
      skinTone: { men: defaultSkinToneId, women: defaultSkinToneId },

      setSkinTone: (gender, id) => {
        if (!skinTones.some((t) => t.id === id)) return;
        set((state) => ({ skinTone: { ...state.skinTone, [gender]: id } }));
      },

      skinHex: (gender) => hexFor(get().skinTone[gender]),
    }),
    {
      name: "maison.prefs.v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ skinTone: state.skinTone }),
      merge: (persisted, current) => {
        const parsed = prefsStateSchema.safeParse(persisted);
        if (!parsed.success) return current;
        const known = (id: string) => (skinTones.some((t) => t.id === id) ? id : defaultSkinToneId);
        return {
          ...current,
          skinTone: {
            men: known(parsed.data.skinTone.men),
            women: known(parsed.data.skinTone.women),
          },
        };
      },
    },
  ),
);
