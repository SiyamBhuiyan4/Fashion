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
import { DEFAULT_SECTIONS, type SectionRow } from "@/lib/sections";

interface CatalogState {
  catalog: Catalog;
  settings: Settings;
  categories: CategoryRow[];
  sections: SectionRow[];
  hydrated: boolean;
  hydrate: (
    catalog: Catalog,
    settings: Settings,
    categories: CategoryRow[],
    sections: SectionRow[],
  ) => void;
  get: (id: string) => Product | undefined;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  catalog: [],
  settings: defaultSettings,
  categories: DEFAULT_CATEGORIES,
  sections: DEFAULT_SECTIONS,
  hydrated: false,
  hydrate: (catalog, settings, categories, sections) =>
    set((state) =>
      state.hydrated &&
      state.catalog === catalog &&
      state.settings === settings &&
      state.categories === categories &&
      state.sections === sections
        ? state
        : { catalog, settings, categories, sections, hydrated: true },
    ),
  get: (id) => findById(get().catalog, id),
}));

export const catalogProduct = (id: string): Product | undefined =>
  useCatalogStore.getState().get(id);
