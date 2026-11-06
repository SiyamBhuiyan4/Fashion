"use client";

import { useEffect } from "react";
import type { Catalog } from "@/lib/catalog";
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
  children,
}: {
  catalog: Catalog;
  children: React.ReactNode;
}) {
  // Runs before the first paint of the children, and only when the catalogue changes.
  if (useCatalogStore.getState().catalog !== catalog) {
    useCatalogStore.getState().hydrate(catalog);
  }

  useEffect(() => {
    useCatalogStore.getState().hydrate(catalog);
    void useCartStore.persist.rehydrate();
  }, [catalog]);

  return children;
}
