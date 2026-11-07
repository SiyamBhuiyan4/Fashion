"use client";

import { useMemo } from "react";
import type { OrderLine } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { useCatalogStore } from "@/store/catalogStore";
import { WhatsAppOrderButton } from "@/components/ui/WhatsAppOrder";

/** The bag's total and the button that sends the whole bag to the shop on WhatsApp. */
export function BagOrder({ onSent }: { onSent?: () => void }) {
  const items = useCartStore((s) => s.items);
  const get = useCatalogStore((s) => s.get);
  const settings = useCatalogStore((s) => s.settings);

  const lines = useMemo<OrderLine[]>(
    () =>
      items.flatMap((i) => {
        const product = get(i.productId);
        return product
          ? [{ product, colorName: i.colorName, size: i.size, quantity: i.quantity }]
          : [];
      }),
    [items, get],
  );
  if (lines.length === 0) return null;
  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);

  return (
    <div>
      <div className="flex justify-between text-sm font-medium">
        <span>Total</span>
        <span className="tabular-nums" suppressHydrationWarning>
          {formatPrice(subtotal)}
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-faint">
        + delivery: {formatPrice(settings.deliveryInsideDhaka)} inside Dhaka,{" "}
        {formatPrice(settings.deliveryOutsideDhaka)} outside Dhaka.
      </p>
      <WhatsAppOrderButton
        lines={lines}
        label="Order now on WhatsApp"
        className="mt-4"
        onSent={onSent}
      />
      <p className="mt-2 text-center text-xs text-ink-faint">
        Your order is sent to us on WhatsApp with links to every piece.
      </p>
    </div>
  );
}
