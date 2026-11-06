/**
 * The best-offer engine. Shared by the bag (a preview) and the server (the price actually
 * charged), so the two always agree.
 *
 * Every valid combination of the active promotions is priced — including the free-shipping
 * threshold, which a big discount can push an order under — and the cheapest result wins. The
 * shopper never types a code and never pays more than they have to.
 *
 *   Item level  · Shoe edit: 15% off shoes
 *   Order level · Welcome: 10% off a first order          } at most one of these two
 *               · Buy 2 save 10%, buy 3+ save 15%         }
 *   Shipping    · Free delivery when the order is ৳5,000 or more after discounts
 */
export interface PricedLine {
  productId: string;
  category: string;
  price: number;
  quantity: number;
}

export interface Offer {
  id: string;
  label: string;
  amount: number;
}

export interface BestOffer {
  subtotal: number;
  discounts: Offer[];
  shipping: number;
  shippingWaived: boolean;
  total: number;
  savings: number;
}

export const FREE_SHIPPING_FROM = 5000;

const pct = (value: number, p: number) => Math.round(value * p);

export function bestOffer(
  lines: PricedLine[],
  context: { firstOrder: boolean; shipping: number },
): BestOffer {
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const units = lines.reduce((sum, l) => sum + l.quantity, 0);
  const shoeValue = lines
    .filter((l) => l.category === "shoes")
    .reduce((sum, l) => sum + l.price * l.quantity, 0);

  const itemOptions: Offer[][] = [[]];
  if (shoeValue > 0) {
    itemOptions.push([
      { id: "shoe-edit", label: "Shoe edit · 15% off shoes", amount: pct(shoeValue, 0.15) },
    ]);
  }

  const orderOptions: Array<(base: number) => Offer | null> = [() => null];
  if (context.firstOrder) {
    orderOptions.push((base) => ({
      id: "welcome",
      label: "Welcome · 10% off your first order",
      amount: pct(base, 0.1),
    }));
  }
  if (units >= 2) {
    const rate = units >= 3 ? 0.15 : 0.1;
    orderOptions.push((base) => ({
      id: "bundle",
      label: `Buy ${units >= 3 ? "3+" : "2"} · ${rate * 100}% off`,
      amount: pct(base, rate),
    }));
  }

  let best: BestOffer | null = null;
  for (const items of itemOptions) {
    const afterItems = subtotal - items.reduce((s, o) => s + o.amount, 0);
    for (const makeOrderOffer of orderOptions) {
      const orderOffer = makeOrderOffer(afterItems);
      const discounts = orderOffer ? [...items, orderOffer] : [...items];
      const goods = subtotal - discounts.reduce((s, o) => s + o.amount, 0);
      const shippingWaived = goods >= FREE_SHIPPING_FROM && context.shipping > 0;
      const shipping = shippingWaived ? 0 : context.shipping;
      const total = goods + shipping;
      if (!best || total < best.total) {
        best = {
          subtotal,
          discounts: shippingWaived
            ? [
                ...discounts,
                {
                  id: "free-delivery",
                  label: "Free delivery over ৳5,000",
                  amount: context.shipping,
                },
              ]
            : discounts,
          shipping,
          shippingWaived,
          total,
          savings: subtotal + context.shipping - total,
        };
      }
    }
  }
  return best!;
}
