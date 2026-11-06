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

type Wardrobe = Partial<Record<Slot, WornItem>>;

interface OutfitState {
  /** One outfit per model, so scrolling back up finds the men's look still on. */
  worn: Record<Gender, Wardrobe>;
  /** Whichever model the page is showing; set by scrolling, not by clicking. */
  activeGender: Gender;
  pose: Pose;
  autoRotate: boolean;
  /** Bumped to tell the 3D view to return the camera to its default framing. */
  viewResetToken: number;
  setActiveGender: (gender: Gender) => void;
  wear: (productId: string, colorName?: string) => void;
  remove: (productId: string) => void;
  toggle: (productId: string, colorName?: string) => void;
  setColor: (productId: string, colorName: string) => void;
  isWorn: (productId: string) => boolean;
  wornColor: (productId: string) => string | undefined;
  wornItems: (gender?: Gender) => WornItem[];
  resetOutfit: (gender?: Gender) => void;
  setPose: (pose: Pose) => void;
  setAutoRotate: (on: boolean) => void;
  resetView: () => void;
}

const emptyWardrobe: Wardrobe = {};
const SLOT_ORDER: Slot[] = ["top", "bottom", "outerwear", "shoes"];

/** Unique worn items in slot order, de-duplicated (a dress fills two slots but appears once). */
function uniqueWorn(wardrobe: Wardrobe): WornItem[] {
  const out: WornItem[] = [];
  for (const slot of SLOT_ORDER) {
    const item = wardrobe[slot];
    if (item && !out.some((worn) => worn.productId === item.productId)) out.push(item);
  }
  return out;
}

/** The model a product belongs to, so an action never has to be told. */
function genderOf(productId: string): Gender | undefined {
  return catalogProduct(productId)?.gender;
}

export const useOutfitStore = create<OutfitState>((set, get) => ({
  worn: { men: emptyWardrobe, women: emptyWardrobe },
  activeGender: "men",
  pose: "idle",
  autoRotate: false,
  viewResetToken: 0,

  setActiveGender: (gender) =>
    set((state) => (state.activeGender === gender ? state : { activeGender: gender })),

  wear: (productId, colorName) => {
    const product = catalogProduct(productId);
    if (!product) return;
    const color = resolveColor(product, colorName);
    const item: WornItem = { productId: product.id, colorName: color.name, colorHex: color.hex };
    set((state) => {
      const next = { ...state.worn[product.gender] };
      for (const slot of slotsForProduct(product)) {
        const previous = next[slot];
        if (previous && previous.productId !== product.id) {
          // Clear every slot held by the garment being replaced (a dress covers two).
          const previousProduct = catalogProduct(previous.productId);
          if (previousProduct) for (const held of slotsForProduct(previousProduct)) delete next[held];
        }
        next[slot] = item;
      }
      return { worn: { ...state.worn, [product.gender]: next } };
    });
  },

  remove: (productId) => {
    const gender = genderOf(productId);
    if (!gender) return;
    set((state) => {
      const next = { ...state.worn[gender] };
      for (const slot of Object.keys(next) as Slot[]) {
        if (next[slot]?.productId === productId) delete next[slot];
      }
      return { worn: { ...state.worn, [gender]: next } };
    });
  },

  toggle: (productId, colorName) => {
    if (get().isWorn(productId)) get().remove(productId);
    else get().wear(productId, colorName);
  },

  setColor: (productId, colorName) => {
    const product = catalogProduct(productId);
    if (!product) return;
    const color = resolveColor(product, colorName);
    set((state) => {
      const next = { ...state.worn[product.gender] };
      for (const slot of Object.keys(next) as Slot[]) {
        if (next[slot]?.productId === productId) {
          next[slot] = { productId, colorName: color.name, colorHex: color.hex };
        }
      }
      return { worn: { ...state.worn, [product.gender]: next } };
    });
  },

  isWorn: (productId) => {
    const gender = genderOf(productId);
    if (!gender) return false;
    return Object.values(get().worn[gender]).some((item) => item?.productId === productId);
  },

  wornColor: (productId) => {
    const gender = genderOf(productId);
    if (!gender) return undefined;
    return Object.values(get().worn[gender]).find((item) => item?.productId === productId)?.colorName;
  },

  wornItems: (gender) => uniqueWorn(get().worn[gender ?? get().activeGender]),

  resetOutfit: (gender) =>
    set((state) => ({
      worn: { ...state.worn, [gender ?? state.activeGender]: emptyWardrobe },
    })),

  setPose: (pose) => set({ pose }),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  resetView: () => set((state) => ({ viewResetToken: state.viewResetToken + 1 })),
}));
