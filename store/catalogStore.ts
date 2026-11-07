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
import { defaultSettings, type Settings } from "@/lib/settings";
import { DEFAULT_CATEGORIES, type CategoryRow } from "@/lib/categories";

interface CatalogState {
  catalog: Catalog;
  settings: Settings;
  categories: CategoryRow[];
  hydrated: boolean;
  hydrate: (catalog: Catalog, settings: Settings, categories: CategoryRow[]) => void;
  get: (id: string) => Product | undefined;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  catalog: [],
  settings: defaultSettings,
  categories: DEFAULT_CATEGORIES,
  hydrated: false,
  hydrate: (catalog, settings, categories) =>
    set((state) =>
      state.hydrated &&
      state.catalog === catalog &&
      state.settings === settings &&
      state.categories === categories
        ? state
        : { catalog, settings, categories, hydrated: true },
    ),
  get: (id) => findById(get().catalog, id),
}));

export const catalogProduct = (id: string): Product | undefined =>
  useCatalogStore.getState().get(id);
