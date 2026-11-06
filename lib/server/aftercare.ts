/**
 * After delivery: returns, size exchanges and verified reviews.
 *
 * Returns and exchanges are approved automatically, at any hour, when all of these hold:
 *   · the order was delivered (courier milestone),
 *   · it is within RETURN_WINDOW_DAYS of delivery,
 *   · the piece's category is returnable,
 *   · the piece has no return or exchange already.
 * An approved return gets a reverse-pickup tracking id and its refund (the price paid, less its
 * share of the order's discounts) goes to the customer's wallet. An approved exchange places a
 * hard hold on one unit of the new size straight away (EXCHANGE_RESERVED), so it cannot sell
 * out while the courier collects the old one.
 *
 * Reviews are accepted only from a customer whose delivered order contains the product, and
 * record the size they bought.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import { timeline } from "@/lib/tracking";
import { nearestWarehouses } from "@/lib/warehouses";
import { id, nowIso, UserError, type Db, type FitVote, type Order } from "@/lib/server/db";

export const RETURN_WINDOW_DAYS = 7;
/** Categories that cannot be returned (none in this catalogue yet; e.g. "innerwear"). */
export const NON_RETURNABLE = new Set<string>();

const DAY_MS = 24 * 60 * 60 * 1000;

function ownedOrder(db: Db, userId: string, orderId: string): Order {
  const order = db.t.orders.find((o) => o.id === orderId && o.userId === userId);
  if (!order) throw new UserError("Order not found.", 404);
  return order;
}

export function eligibility(db: Db, order: Order, itemIndex: number) {
  const item = order.items[itemIndex];
  if (!item) return { ok: false, reason: "That piece is not in this order." };
  const track = timeline(order);
  if (order.status !== "CONFIRMED" || !track.delivered || !track.deliveredAt) {
    return { ok: false, reason: "Returns open once the order is delivered." };
  }
  const daysLeft = RETURN_WINDOW_DAYS - (Date.now() - Date.parse(track.deliveredAt)) / DAY_MS;
  if (daysLeft < 0)
    return { ok: false, reason: `The ${RETURN_WINDOW_DAYS}-day return window has closed.` };
  const product = db.product(item.productId);
  if (product && NON_RETURNABLE.has(product.category)) {
    return { ok: false, reason: "This category can't be returned." };
  }
  if (db.t.cases.some((c) => c.orderId === order.id && c.itemIndex === itemIndex)) {
    return { ok: false, reason: "A return or exchange is already open for this piece." };
  }
  return { ok: true, reason: null, daysLeft: Math.ceil(daysLeft) };
}

/** The share of the order's goods discounts that belongs to one piece. */
function refundFor(order: Order, itemIndex: number) {
  const item = order.items[itemIndex]!;
  const value = item.unitPrice * item.quantity;
  const goodsDiscount = order.pricing.discounts
    .filter((d) => d.id !== "free-delivery")
    .reduce((s, d) => s + d.amount, 0);
  return Math.max(
    0,
    Math.round(value - (goodsDiscount * value) / Math.max(1, order.pricing.subtotal)),
  );
}

const trackingId = (prefix: string) => `${prefix}-${randomBytes(4).toString("hex").toUpperCase()}`;

export function requestReturn(
  db: Db,
  userId: string,
  orderId: string,
  itemIndex: number,
  reason: string,
) {
  const order = ownedOrder(db, userId, orderId);
  const check = eligibility(db, order, itemIndex);
  if (!check.ok) throw new UserError(check.reason!);
  const item = order.items[itemIndex]!;
  const refund = refundFor(order, itemIndex);
  const kase = {
    id: id("case"),
    orderId,
    userId,
    itemIndex,
    type: "return" as const,
    status: "APPROVED" as const,
    reason,
    trackingId: trackingId("RT"),
    refund,
    createdAt: nowIso(),
  };
  db.t.cases.push(kase);
  // The piece goes back to the warehouse it came from, and its refund to the wallet.
  db.restock([item]);
  db.t.wallet.push({
    id: id("wtx"),
    userId,
    amount: refund,
    reason: `Refund for ${item.name} (${order.number})`,
    orderId,
    at: nowIso(),
  });
  db.notify(
    userId,
    `Return approved — ${item.name}`,
    `Reverse pickup ${kase.trackingId} is booked; the courier will call before collecting. ৳${refund.toLocaleString("en-US")} has been added to your wallet.`,
    `/account/orders/${orderId}`,
  );
  return kase;
}

export function requestExchange(
  db: Db,
  userId: string,
  orderId: string,
  itemIndex: number,
  newSize: string,
) {
  const order = ownedOrder(db, userId, orderId);
  const check = eligibility(db, order, itemIndex);
  if (!check.ok) throw new UserError(check.reason!);
  const item = order.items[itemIndex]!;
  const product = db.product(item.productId);
  if (!product?.sizes.includes(newSize)) throw new UserError("Choose a size this piece comes in.");
  if (newSize === item.size) throw new UserError("Choose a different size to exchange for.");
  const free = db.available(item.productId, newSize);
  const warehouse = nearestWarehouses(order.address.district).find((w) => free[w] >= item.quantity);
  if (!warehouse)
    throw new UserError(
      `Size ${newSize} is sold out right now — you can return it for a refund instead.`,
      409,
    );

  const reservationId = id("rsv");
  db.t.reservations.push({
    id: reservationId,
    userId,
    kind: "exchange",
    lines: [
      {
        productId: item.productId,
        colorName: item.colorName,
        size: newSize,
        quantity: item.quantity,
        warehouse,
      },
    ],
    createdAt: nowIso(),
    expiresAt: null, // EXCHANGE_RESERVED: held until the swap ships
  });
  const kase = {
    id: id("case"),
    orderId,
    userId,
    itemIndex,
    type: "exchange" as const,
    newSize,
    status: "APPROVED" as const,
    trackingId: trackingId("EX"),
    createdAt: nowIso(),
    reservationId,
  };
  db.t.reservations.at(-1)!.caseId = kase.id;
  db.t.cases.push(kase);
  db.notify(
    userId,
    `Exchange approved — ${item.name}, size ${newSize}`,
    `Size ${newSize} is set aside for you. Pickup ${kase.trackingId}: the courier collects size ${item.size} and brings size ${newSize}.`,
    `/account/orders/${orderId}`,
  );
  return kase;
}

export function addReview(
  db: Db,
  userId: string,
  input: {
    orderId: string;
    productId: string;
    rating: number;
    fit: FitVote;
    body: string;
    heightCm?: number;
    weightKg?: number;
  },
) {
  const order = ownedOrder(db, userId, input.orderId);
  const item = order.items.find((i) => i.productId === input.productId);
  if (!item) throw new UserError("You can only review pieces you bought.", 403);
  if (!timeline(order).delivered)
    throw new UserError("You can review it once it has been delivered.", 403);
  if (db.t.reviews.some((r) => r.orderId === order.id && r.productId === input.productId)) {
    throw new UserError("You have already reviewed this piece.", 409);
  }
  const user = db.user(userId)!;
  const review = {
    id: id("rev"),
    productId: input.productId,
    userId,
    orderId: order.id,
    name: `${user.name.split(" ")[0]} ${user.name.split(" ")[1]?.[0] ?? ""}`.trim(),
    rating: input.rating,
    fit: input.fit,
    body: input.body,
    sizePurchased: item.size,
    heightCm: input.heightCm ?? user.profile.heightCm,
    weightKg: input.weightKg ?? user.profile.weightKg,
    createdAt: nowIso(),
  };
  db.t.reviews.push(review);
  return review;
}

/** The fit consensus for a product, recomputed from its reviews. */
export function fitScore(db: Db, productId: string) {
  const votes = db.t.reviews.filter((r) => r.productId === productId);
  const count = (fit: FitVote) => votes.filter((v) => v.fit === fit).length;
  const small = count("RUNS_SMALL");
  const large = count("RUNS_LARGE");
  const ttsCount = count("TRUE_TO_SIZE");
  const total = votes.length;
  // -1 = runs small … +1 = runs large
  const lean = total ? (large - small) / total : 0;
  const verdict =
    total === 0
      ? null
      : lean <= -0.34
        ? "RUNS_SMALL"
        : lean >= 0.34
          ? "RUNS_LARGE"
          : "TRUE_TO_SIZE";
  return { total, small, trueToSize: ttsCount, large, lean, verdict };
}
