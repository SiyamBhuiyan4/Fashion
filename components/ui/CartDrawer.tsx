"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useCartStore } from "@/store/cartStore";
import { useCatalogStore } from "@/store/catalogStore";
import { formatPrice } from "@/lib/utils";
import { Price } from "@/components/ui/Price";

export function CartDrawer() {
  const open = useCartStore((state) => state.drawerOpen);
  const close = useCartStore((state) => state.closeDrawer);
  const items = useCartStore((state) => state.items);
  const remove = useCartStore((state) => state.remove);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const get = useCatalogStore((state) => state.get);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  if (!open) return null;

  const subtotal = items.reduce((sum, item) => {
    const product = get(item.productId);
    return product ? sum + product.price * item.quantity : sum;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Cart">
      <button
        type="button"
        aria-label="Close cart"
        onClick={close}
        className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-line bg-bone shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="display text-lg">Your cart</h2>
          <button
            type="button"
            onClick={close}
            className="rounded-full p-2 text-ink-soft transition-colors hover:bg-bone-dark hover:text-ink"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-ink-soft">Your cart is empty.</p>
            <Link
              href="/#women"
              onClick={close}
              className="rounded-full bg-ink px-5 py-2.5 text-sm text-bone transition-opacity hover:opacity-90"
            >
              Start the fitting
            </Link>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-line overflow-y-auto">
            {items.map((item, index) => {
              const product = get(item.productId);
              if (!product) return null;
              const color = product.colors.find((c) => c.name === item.colorName) ?? product.colors[0]!;
              return (
                <li key={`${item.productId}-${item.size}-${item.colorName}`} className="flex gap-3 p-4">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-white">
                    {color.image ? (
                      <Image
                        src={color.image}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${product.id}`}
                      onClick={close}
                      className="block truncate text-sm font-medium hover:underline"
                    >
                      {product.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {color.name} · Size {item.size}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <label className="sr-only" htmlFor={`qty-${index}`}>
                        Quantity for {product.name}
                      </label>
                      <select
                        id={`qty-${index}`}
                        value={item.quantity}
                        onChange={(event) => setQuantity(index, Number(event.target.value))}
                        className="rounded-md border border-line bg-white px-2 py-1 text-xs"
                      >
                        {Array.from({ length: 10 }, (_, n) => n + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-xs text-ink-faint underline-offset-2 hover:text-danger hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <Price amount={product.price * item.quantity} className="text-sm" />
                </li>
              );
            })}
          </ul>
        )}

        <div className="border-t border-line px-5 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-soft">Subtotal</span>
            <span className="text-base font-medium" suppressHydrationWarning>
              {formatPrice(subtotal)}
            </span>
          </div>
          <Link
            href="/cart"
            onClick={close}
            className="mt-3 block rounded-full bg-ink py-3 text-center text-sm text-bone transition-opacity hover:opacity-90"
          >
            View cart
          </Link>
        </div>
      </aside>
    </div>
  );
}
