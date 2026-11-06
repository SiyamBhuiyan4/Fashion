"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultSize, isInStock } from "@/lib/catalog";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { useCatalogStore } from "@/store/catalogStore";
import type { WornItem } from "@/store/outfitStore";

/**
 * Asks for a size per worn item, then puts the whole outfit in the cart.
 * Rendered only while open, so each opening starts from the default sizes.
 */
export function AddOutfitDialog({ items, onClose }: { items: WornItem[]; onClose: () => void }) {
  const get = useCatalogStore((state) => state.get);
  const add = useCartStore((state) => state.add);
  const openDrawer = useCartStore((state) => state.openDrawer);

  const products = useMemo(
    () => items.map((item) => ({ item, product: get(item.productId) })).filter((row) => row.product),
    [items, get],
  );

  // Only the sizes the shopper actually changed are stored; the rest fall back to the default.
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const sizeFor = (productId: string, product: Product): string =>
    chosen[productId] ?? defaultSize(product);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const total = products.reduce((sum, { product }) => sum + (product?.price ?? 0), 0);

  const confirm = () => {
    for (const { item, product } of products) {
      if (!product) continue;
      const size = sizeFor(item.productId, product);
      if ((product.stock[size] ?? 0) <= 0) continue;
      add({ productId: product.id, colorName: item.colorName, size, quantity: 1 });
    }
    onClose();
    openDrawer();
  };

  const anyAvailable = products.some(
    ({ item, product }) => product && (product.stock[sizeFor(item.productId, product)] ?? 0) > 0,
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center" role="dialog" aria-modal="true" aria-label="Choose sizes">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/35" />
      <div className="relative w-full max-w-md rounded-t-2xl border border-line bg-bone p-5 sm:rounded-2xl">
        <h2 className="display text-lg">Choose your sizes</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {products.length} piece{products.length === 1 ? "" : "s"} · {formatPrice(total)}
        </p>

        <ul className="mt-4 space-y-3">
          {products.map(({ item, product }) => {
            if (!product) return null;
            const selected = sizeFor(item.productId, product);
            return (
              <li key={item.productId} className="rounded-lg border border-line bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm">{product.name}</p>
                    <p className="text-xs text-ink-faint">{item.colorName}</p>
                  </div>
                  <span className="text-sm text-ink-soft">{formatPrice(product.price)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {product.sizes.map((size) => {
                    const stocked = isInStock(product, size);
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={!stocked}
                        onClick={() => setChosen((current) => ({ ...current, [item.productId]: size }))}
                        className={[
                          "min-w-10 rounded-md border px-2 py-1 text-xs transition-colors",
                          selected === size
                            ? "border-ink bg-ink text-bone"
                            : "border-line text-ink-soft hover:border-ink",
                          stocked ? "" : "cursor-not-allowed line-through opacity-40",
                        ].join(" ")}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-line bg-white py-2.5 text-sm hover:border-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!anyAvailable}
            className="flex-1 rounded-full bg-ink py-2.5 text-sm text-bone transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}
