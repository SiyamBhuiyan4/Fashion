"use client";

import { create } from "zustand";
import type { Gender, Pose, Slot } from "@/lib/types";
import { resolveColor, slotsForProduct } from "@/lib/catalog";
import { catalogProduct } from "@/store/catalogStore";

export interface WornItem {
  productId: string;
  colorName: string;
  colorHex: string;
}

interface OutfitState {
  /** Worn garment per avatar slot. A dress writes to both "top" and "bottom". */
  worn: Partial<Record<Slot, WornItem>>;
  pose: Pose;
  autoRotate: boolean;
  /** Bumped to tell the 3D view to return the camera to its default framing. */
  viewResetToken: number;
  wear: (productId: string, colorName?: string) => void;
  remove: (productId: string) => void;
  toggle: (productId: string, colorName?: string) => void;
  setColor: (productId: string, colorName: string) => void;
  isWorn: (productId: string) => boolean;
  wornColor: (productId: string) => string | undefined;
  wornItems: () => WornItem[];
  resetOutfit: () => void;
  setPose: (pose: Pose) => void;
  setAutoRotate: (on: boolean) => void;
  resetView: () => void;
  /** Clears state when switching between /men and /women. */
  resetForGender: (gender: Gender) => void;
}

const emptyWorn: Partial<Record<Slot, WornItem>> = {};

/** Unique worn items in slot order, de-duplicated (a dress appears once). */
function uniqueWorn(worn: Partial<Record<Slot, WornItem>>): WornItem[] {
  const order: Slot[] = ["top", "bottom", "outerwear", "shoes"];
  const out: WornItem[] = [];
  for (const slot of order) {
    const item = worn[slot];
    if (item && !out.some((w) => w.productId === item.productId)) out.push(item);
  }
  return out;
}

export const useOutfitStore = create<OutfitState>((set, get) => ({
  worn: emptyWorn,
  pose: "idle",
  autoRotate: false,
  viewResetToken: 0,

  wear: (productId, colorName) => {
    const product = catalogProduct(productId);
    if (!product) return;
    const color = resolveColor(product, colorName);
    const item: WornItem = { productId: product.id, colorName: color.name, colorHex: color.hex };
    set((state) => {
      const next = { ...state.worn };
      // A dress replaces separates; separates replace a dress on the slots they cover.
      for (const slot of slotsForProduct(product)) {
        const previous = next[slot];
        if (previous && previous.productId !== product.id) {
          // Clear every slot held by the garment being replaced.
          const prevProduct = catalogProduct(previous.productId);
          if (prevProduct) {
            for (const s of slotsForProduct(prevProduct)) delete next[s];
          }
        }
        next[slot] = item;
      }
      return { worn: next };
    });
  },

  remove: (productId) =>
    set((state) => {
      const next = { ...state.worn };
      for (const slot of Object.keys(next) as Slot[]) {
        if (next[slot]?.productId === productId) delete next[slot];
      }
      return { worn: next };
    }),

  toggle: (productId, colorName) => {
    if (get().isWorn(productId)) get().remove(productId);
    else get().wear(productId, colorName);
  },

  setColor: (productId, colorName) => {
    const product = catalogProduct(productId);
    if (!product) return;
    const color = resolveColor(product, colorName);
    set((state) => {
      const next = { ...state.worn };
      for (const slot of Object.keys(next) as Slot[]) {
        if (next[slot]?.productId === productId) {
          next[slot] = { productId, colorName: color.name, colorHex: color.hex };
        }
      }
      return { worn: next };
    });
  },

  isWorn: (productId) => Object.values(get().worn).some((w) => w?.productId === productId),

  wornColor: (productId) =>
    Object.values(get().worn).find((w) => w?.productId === productId)?.colorName,

  wornItems: () => uniqueWorn(get().worn),

  resetOutfit: () => set({ worn: emptyWorn }),
  setPose: (pose) => set({ pose }),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  resetView: () => set((s) => ({ viewResetToken: s.viewResetToken + 1 })),

  resetForGender: (gender) =>
    set((state) => {
      const stale = uniqueWorn(state.worn).some(
        (item) => catalogProduct(item.productId)?.gender !== gender,
      );
      return stale ? { worn: emptyWorn, pose: "idle" } : {};
    }),
}));
