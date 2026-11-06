"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { useCatalogStore } from "@/store/catalogStore";
import { useHydrated } from "@/lib/useHydrated";

export function CartView() {
  const items = useCartStore((state) => state.items);
  const remove = useCartStore((state) => state.remove);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const clear = useCartStore((state) => state.clear);
  const get = useCatalogStore((state) => state.get);
  const [notice, setNotice] = useState(false);

  // The cart only exists in this browser, so it is read after hydration.
  const mounted = useHydrated();

  const lines = mounted
    ? items.map((item, index) => ({ item, index, product: get(item.productId) }))
    : [];
  const subtotal = lines.reduce(
    (sum, line) => sum + (line.product ? line.product.price * line.item.quantity : 0),
    0,
  );

  return (
    <div className="mx-auto min-h-[70dvh] max-w-5xl bg-bone/90 px-4 py-10 sm:px-6">
      <h1 className="display text-5xl sm:text-6xl">Your bag</h1>

      {!mounted ? (
        <p className="mt-6 text-sm text-ink-faint">Loading…</p>
      ) : lines.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-line bg-white p-10 text-center">
          <p className="text-ink-soft">Nothing in here yet.</p>
          <div className="mt-5 flex justify-center gap-3">
            <Link
              href="/#men"
              className="rounded-full bg-ink px-5 py-2.5 text-sm text-bone hover:opacity-90"
            >
              Shop men
            </Link>
            <Link
              href="/#women"
              className="rounded-full border border-line px-5 py-2.5 text-sm hover:border-ink"
            >
              Shop women
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
            {lines.map(({ item, index, product }) => {
              if (!product) return null;
              const color =
                product.colors.find((option) => option.name === item.colorName) ??
                product.colors[0]!;
              return (
                <li
                  key={`${item.productId}-${item.size}-${item.colorName}`}
                  className="flex gap-4 p-4"
                >
                  <Link
                    href={`/product/${product.id}`}
                    className="relative h-32 w-24 shrink-0 overflow-hidden rounded-lg bg-bone-dark"
                  >
                    {color.image ? (
                      <Image
                        src={color.image}
                        alt=""
                        fill
                        unoptimized
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : null}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link href={`/product/${product.id}`} className="hover:underline">
                          {product.name}
                        </Link>
                        <p className="mt-1 text-sm text-ink-faint">
                          {color.name} · Size {item.size}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm">
                        {formatPrice(product.price * item.quantity)}
                      </span>
                    </div>
                    <div className="mt-auto flex items-center gap-3 pt-3">
                      <label className="sr-only" htmlFor={`cart-qty-${index}`}>
                        Quantity for {product.name}
                      </label>
                      <select
                        id={`cart-qty-${index}`}
                        value={item.quantity}
                        onChange={(event) => setQuantity(index, Number(event.target.value))}
                        className="rounded-md border border-line bg-white px-2 py-1 text-sm"
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
                        className="text-sm text-ink-faint underline-offset-2 hover:text-danger hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <aside className="h-fit rounded-2xl border border-line bg-white p-5">
            <h2 className="display text-lg">Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Delivery</dt>
                <dd className="text-ink-faint">Calculated at checkout</dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setNotice(true)}
              className="mt-5 w-full rounded-full bg-ink py-3 text-sm text-bone transition-opacity hover:opacity-90"
            >
              Checkout
            </button>
            {notice ? (
              <p
                role="status"
                className="mt-3 rounded-lg bg-bone-dark px-3 py-2 text-center text-xs text-ink-soft"
              >
                Demo only — checkout is not available.
              </p>
            ) : null}
            <button
              type="button"
              onClick={clear}
              className="mt-3 w-full text-center text-xs text-ink-faint hover:text-danger"
            >
              Empty cart
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
