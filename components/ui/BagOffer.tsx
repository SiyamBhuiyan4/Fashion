"use client";

import { useMemo } from "react";
import { bestOffer, FREE_SHIPPING_FROM } from "@/lib/promotions";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { useCatalogStore } from "@/store/catalogStore";
import { useSessionStore } from "@/store/sessionStore";

/**
 * The bag's best-offer preview (the same engine the server charges with). Delivery is priced
 * at checkout once the district is known, so this shows the goods total and what is saved.
 */
export function BagOffer() {
  const items = useCartStore((s) => s.items);
  const get = useCatalogStore((s) => s.get);
  const me = useSessionStore((s) => s.me);
  const firstOrder = !me?.user || (me.orderCount ?? 0) === 0;

  const offer = useMemo(
    () =>
      bestOffer(
        items.flatMap((i) => {
          const p = get(i.productId);
          return p
            ? [{ productId: p.id, category: p.category, price: p.price, quantity: i.quantity }]
            : [];
        }),
        { firstOrder, shipping: 0 },
      ),
    [items, get, firstOrder],
  );

  if (items.length === 0) return null;
  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex justify-between">
        <dt className="text-ink-soft">Subtotal</dt>
        <dd className="tabular-nums" suppressHydrationWarning>
          {formatPrice(offer.subtotal)}
        </dd>
      </div>
      {offer.discounts.map((d) => (
        <div key={d.id} className="flex justify-between text-success">
          <dt>{d.label}</dt>
          <dd className="tabular-nums" suppressHydrationWarning>
            −{formatPrice(d.amount)}
          </dd>
        </div>
      ))}
      <div className="flex justify-between border-t border-line pt-1.5 font-medium">
        <dt>Total before delivery</dt>
        <dd className="tabular-nums" suppressHydrationWarning>
          {formatPrice(offer.total)}
        </dd>
      </div>
      <p className="pt-1 text-xs text-ink-faint">
        {offer.discounts.length > 0 ? "Best offer applied automatically. " : ""}
        {offer.total >= FREE_SHIPPING_FROM
          ? "Delivery is free on this bag."
          : `Free delivery from ${formatPrice(FREE_SHIPPING_FROM)}.`}
        {!me?.user ? " Sign in at checkout to get 10% off your first order." : ""}
      </p>
    </dl>
  );
}
