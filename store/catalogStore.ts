"use client";

/**
 * The catalog as the browser sees it. Server components fetch it from the Telegram database
 * and hand it to <CatalogProvider>, which hydrates this store once; client components and the
 * cart then read products synchronously without another round trip.
 */
import { create } from "zustand";
import type { Catalog } from "@/lib/catalog";
import { findById } from "@/lib/catalog";
import type { Product } from "@/lib/schemas";

interface CatalogState {
  catalog: Catalog;
  hydrated: boolean;
  hydrate: (catalog: Catalog) => void;
  get: (id: string) => Product | undefined;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  catalog: [],
  hydrated: false,
  hydrate: (catalog) =>
    set((state) => (state.hydrated && state.catalog === catalog ? state : { catalog, hydrated: true })),
  get: (id) => findById(get().catalog, id),
}));

export const catalogProduct = (id: string): Product | undefined => useCatalogStore.getState().get(id);
