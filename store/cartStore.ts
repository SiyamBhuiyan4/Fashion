"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { cartStateSchema, type CartItem } from "@/lib/schemas";
import { catalogProduct } from "@/store/catalogStore";

interface CartState {
  items: CartItem[];
  drawerOpen: boolean;
  add: (item: CartItem) => void;
  remove: (index: number) => void;
  setQuantity: (index: number, quantity: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const MAX_LINES = 100;
const MAX_QTY = 10;

/** Drops any line that is not a real product/size/color before it reaches the UI. */
function sanitize(items: CartItem[]): CartItem[] {
  const valid: CartItem[] = [];
  for (const item of items) {
    const product = catalogProduct(item.productId);
    if (!product) continue;
    if (!product.sizes.includes(item.size)) continue;
    if (!product.colors.some((c) => c.name === item.colorName)) continue;
    const quantity = Math.min(MAX_QTY, Math.max(1, Math.trunc(item.quantity)));
    valid.push({ ...item, quantity });
    if (valid.length >= MAX_LINES) break;
  }
  return valid;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      drawerOpen: false,

      add: (item) => {
        const parsed = cartStateSchema.shape.items.element.safeParse(item);
        if (!parsed.success) return;
        const [clean] = sanitize([parsed.data]);
        if (!clean) return;
        set((state) => {
          const index = state.items.findIndex(
            (i) =>
              i.productId === clean.productId &&
              i.size === clean.size &&
              i.colorName === clean.colorName,
          );
          if (index >= 0) {
            const items = [...state.items];
            const existing = items[index]!;
            items[index] = {
              ...existing,
              quantity: Math.min(MAX_QTY, existing.quantity + clean.quantity),
            };
            return { items };
          }
          if (state.items.length >= MAX_LINES) return {};
          return { items: [...state.items, clean] };
        });
      },

      remove: (index) =>
        set((state) => ({ items: state.items.filter((_, i) => i !== index) })),

      setQuantity: (index, quantity) =>
        set((state) => {
          const q = Math.min(MAX_QTY, Math.max(1, Math.trunc(quantity)));
          if (!Number.isFinite(q)) return {};
          const items = [...state.items];
          const existing = items[index];
          if (!existing) return {};
          items[index] = { ...existing, quantity: q };
          return { items };
        }),

      clear: () => set({ items: [] }),

      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      subtotal: () =>
        get().items.reduce((sum, i) => {
          const product = catalogProduct(i.productId);
          return product ? sum + product.price * i.quantity : sum;
        }, 0),

      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: "maison.cart.v1",
      version: 1,
      // Rehydrated by <CatalogProvider> once the catalogue is in place; see merge() below.
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
      // localStorage is attacker-writable, so validate the whole shape then re-check
      // every line against the live catalog.
      merge: (persisted, current) => {
        const parsed = cartStateSchema.safeParse(persisted);
        return { ...current, items: parsed.success ? sanitize(parsed.data.items) : [] };
      },
    },
  ),
);
