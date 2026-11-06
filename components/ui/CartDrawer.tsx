"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cartStore";
import { useCatalogStore } from "@/store/catalogStore";
import { Price } from "@/components/ui/Price";
import { BagOffer } from "@/components/ui/BagOffer";

export function CartDrawer() {
  const open = useCartStore((state) => state.drawerOpen);
  const close = useCartStore((state) => state.closeDrawer);
  const items = useCartStore((state) => state.items);
  const remove = useCartStore((state) => state.remove);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const get = useCatalogStore((state) => state.get);

  // Stay mounted while the slide-out plays, so closing is as smooth as opening.
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    // Two frames, so the panel is painted off-screen before it slides in.
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setShown(open)));
    const timer = open ? undefined : window.setTimeout(() => setMounted(false), 500);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [open]);

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

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Cart"
    >
      <button
        type="button"
        aria-label="Close cart"
        onClick={close}
        className={`absolute inset-0 bg-ink/40 backdrop-blur-[3px] transition-opacity duration-500 ease-out-soft ${shown ? "opacity-100" : "opacity-0"}`}
      />
      <aside
        className={`relative flex h-full w-full max-w-md flex-col bg-bone shadow-2xl transition-transform duration-500 ease-out-soft ${shown ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="display text-3xl">Your bag</h2>
          <button
            type="button"
            onClick={close}
            className="rounded-full p-2 text-ink-soft transition-colors hover:bg-bone-dark hover:text-ink"
            aria-label="Close"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="display text-3xl">Nothing here yet.</p>
            <p className="text-sm text-ink-soft">Your bag is waiting for its first piece.</p>
            <Link
              href="/#women"
              onClick={close}
              className="mt-2 rounded-full bg-ink px-6 py-3 text-sm text-bone transition-opacity hover:opacity-90"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-line overflow-y-auto">
            {items.map((item, index) => {
              const product = get(item.productId);
              if (!product) return null;
              const color =
                product.colors.find((c) => c.name === item.colorName) ?? product.colors[0]!;
              return (
                <li
                  key={`${item.productId}-${item.size}-${item.colorName}`}
                  className="flex gap-3 p-4"
                >
                  <div className="relative h-28 w-21 shrink-0 overflow-hidden bg-bone-dark">
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
          <BagOffer />
          {items.length > 0 ? (
            <Link
              href="/checkout"
              onClick={close}
              className="mt-4 flex h-13 items-center justify-between bg-ink px-5 text-sm font-medium text-bone transition-colors hover:bg-black"
            >
              <span>Checkout</span>
              <span aria-hidden>→</span>
            </Link>
          ) : null}
          <Link
            href="/cart"
            onClick={close}
            className="mt-2 flex h-11 items-center justify-center border border-line text-sm transition-colors hover:border-ink"
          >
            View bag
          </Link>
        </div>
      </aside>
    </div>
  );
}
