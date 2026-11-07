"use client";

import { useEffect } from "react";
import type { Catalog } from "@/lib/catalog";
import type { Settings } from "@/lib/settings";
import type { CategoryRow } from "@/lib/categories";
import { useCatalogStore } from "@/store/catalogStore";
import { useCartStore } from "@/store/cartStore";

/**
 * Hands the catalogue fetched on the server to the client stores.
 *
 * The cart is only read from localStorage afterwards (the store sets `skipHydration`), because
 * every saved line is checked against the live catalogue — doing it the other way round would
 * throw away a valid cart.
 */
export function CatalogProvider({
  catalog,
  settings,
  categories,
  children,
}: {
  catalog: Catalog;
  settings: Settings;
  categories: CategoryRow[];
  children: React.ReactNode;
}) {
  // Runs before the first paint of the children, and only when the catalogue changes.
  const state = useCatalogStore.getState();
  if (state.catalog !== catalog || state.settings !== settings || state.categories !== categories) {
    state.hydrate(catalog, settings, categories);
  }

  useEffect(() => {
    useCatalogStore.getState().hydrate(catalog, settings, categories);
    void useCartStore.persist.rehydrate();
  }, [catalog, settings, categories]);

  return children;
}
