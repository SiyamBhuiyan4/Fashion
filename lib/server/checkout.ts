/**
 * Checkout: stock holds, warehouse routing, pricing and the order state machine.
 *
 *   Proceed to checkout → `reserve`: the bag's units are held for 15 minutes (a reservation),
 *     so nobody else can buy the last piece while the address is typed.
 *   Place order → `placeOrder`, under the write lock:
 *     · each piece is routed to the nearest warehouse that has it (one warehouse when any can
 *       ship everything), which sets delivery fee and date;
 *     · the best offer is applied (lib/promotions.ts) and wallet credit is used first;
 *     · Cash on Delivery (or a fully wallet-paid order) is confirmed at once and the stock
 *       deducted; bKash / Nagad go to the payment page with the hold kept for 15 minutes.
 *   Payment fails → PAYMENT_FAILED_RETRYABLE: the hold is kept for 30 minutes and a retry link
 *     (with a one-time token) is sent; the shopper can retry or switch to Cash on Delivery.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import { bestOffer } from "@/lib/promotions";
import {
  deliveryQuote,
  etaDate,
  nearestWarehouses,
  WAREHOUSES,
  type WarehouseId,
} from "@/lib/warehouses";
import {
  id,
  nowIso,
  UserError,
  type Address,
  type Db,
  type HeldLine,
  type Line,
  type Order,
  type PaymentMethod,
  type Reservation,
  type Shipment,
} from "@/lib/server/db";

export const CHECKOUT_HOLD_MIN = 15;
export const RETRY_HOLD_MIN = 30;

const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

/** Merges duplicate bag lines and checks each against the catalogue. */
export function cleanLines(db: Db, lines: Line[]): Line[] {
  const merged = new Map<string, Line>();
  for (const line of lines) {
    const product = db.product(line.productId);
    if (!product) throw new UserError("A piece in your bag is no longer sold.");
    if (!product.sizes.includes(line.size))
      throw new UserError(`Size ${line.size} is not offered.`);
    if (!product.colors.some((c) => c.name === line.colorName)) {
      throw new UserError(`${product.name} is not offered in ${line.colorName}.`);
    }
    const key = `${line.productId}|${line.size}|${line.colorName}`;
    const existing = merged.get(key);
    merged.set(
      key,
      existing ? { ...existing, quantity: existing.quantity + line.quantity } : { ...line },
    );
  }
  return [...merged.values()];
}

/**
 * Chooses warehouses for the lines: the nearest single warehouse that can ship everything, or
 * failing that, each line from the nearest warehouse that has it. Returns null for a line that
 * cannot be filled anywhere.
 */
export function route(db: Db, lines: Line[], district: string, ignore?: string) {
  const order = nearestWarehouses(district || "Dhaka");
  const free = new Map<string, Record<WarehouseId, number>>();
  const freeFor = (l: Line) => {
    const key = `${l.productId}|${l.size}`;
    if (!free.has(key)) free.set(key, { ...db.available(l.productId, l.size, ignore) });
    return free.get(key)!;
  };

  const single = order.find((w) => {
    const need = new Map<string, number>();
    for (const l of lines)
      need.set(
        `${l.productId}|${l.size}`,
        (need.get(`${l.productId}|${l.size}`) ?? 0) + l.quantity,
      );
    return [...need].every(([key, qty]) => {
      const [productId, size] = key.split("|") as [string, string];
      return (freeFor({ productId, size, colorName: "", quantity: 0 })[w] ?? 0) >= qty;
    });
  });

  const held: Array<HeldLine | null> = lines.map((l) => {
    const stock = freeFor(l);
    const warehouse = single ?? order.find((w) => stock[w] >= l.quantity);
    if (!warehouse) return null;
    stock[warehouse] -= l.quantity;
    return { ...l, warehouse };
  });
  return held;
}

export function shipmentsFor(lines: HeldLine[], district: string): Shipment[] {
  const used = [...new Set(lines.map((l) => l.warehouse))];
  return used.map((warehouse) => {
    const q = deliveryQuote(warehouse, district || "Dhaka");
    return { warehouse, fee: q.fee, days: q.days, eta: etaDate(q.days) };
  });
}

export function priceFor(
  db: Db,
  userId: string | null,
  lines: HeldLine[] | Line[],
  shipping: number,
  useWallet: boolean,
) {
  const firstOrder = userId
    ? !db.t.orders.some((o) => o.userId === userId && o.status === "CONFIRMED")
    : true;
  const offer = bestOffer(
    lines.map((l) => {
      const p = db.product(l.productId)!;
      return { productId: p.id, category: p.category, price: p.price, quantity: l.quantity };
    }),
    { firstOrder, shipping },
  );
  const balance = userId ? Math.max(0, db.walletBalance(userId)) : 0;
  const walletUsed = useWallet ? Math.min(balance, offer.total) : 0;
  return {
    subtotal: offer.subtotal,
    discounts: offer.discounts,
    shipping: offer.shipping,
    total: offer.total,
    walletUsed,
    payable: offer.total - walletUsed,
    walletBalance: balance,
    savings: offer.savings,
  };
}

/** Holds the bag for CHECKOUT_HOLD_MIN minutes. Replaces the shopper's previous hold. */
export function reserve(db: Db, userId: string, input: Line[], district: string) {
  db.t.reservations = db.t.reservations.filter(
    (r) => !(r.userId === userId && r.kind === "checkout"),
  );
  const lines = cleanLines(db, input);
  const routed = route(db, lines, district);
  const missing = lines
    .map((l, i) => ({
      line: l,
      ok: Boolean(routed[i]),
      available: db.availableTotal(l.productId, l.size),
    }))
    .filter((x) => !x.ok);
  if (missing.length > 0) {
    return { reservation: null, missing };
  }
  const reservation: Reservation = {
    id: id("rsv"),
    userId,
    kind: "checkout",
    lines: routed as HeldLine[],
    createdAt: nowIso(),
    expiresAt: minutesFromNow(CHECKOUT_HOLD_MIN),
  };
  db.t.reservations.push(reservation);
  return { reservation, missing: [] };
}

function confirm(db: Db, order: Order) {
  const reservation = db.t.reservations.find((r) => r.id === order.reservationId);
  db.deduct(reservation?.lines ?? order.items);
  db.release(order.reservationId);
  order.status = "CONFIRMED";
  order.confirmedAt = nowIso();
  if (order.pricing.walletUsed > 0) {
    db.t.wallet.push({
      id: id("wtx"),
      userId: order.userId,
      amount: -order.pricing.walletUsed,
      reason: `Paid towards order ${order.number}`,
      orderId: order.id,
      at: nowIso(),
    });
  }
  const eta = order.shipments
    .map((s) => s.eta)
    .sort()
    .at(-1);
  db.notify(
    order.userId,
    `Order ${order.number} confirmed`,
    `Thank you! ${order.items.length} piece${order.items.length === 1 ? "" : "s"}, ${
      order.payment.method === "cod"
        ? `৳${order.pricing.payable.toLocaleString("en-US")} to pay on delivery`
        : "paid"
    }. Expected by ${eta}.`,
    `/account/orders/${order.id}`,
  );
}

export function placeOrder(
  db: Db,
  userId: string,
  input: {
    reservationId: string;
    address: Address;
    payment: Exclude<PaymentMethod, "wallet">;
    useWallet: boolean;
  },
) {
  const hold = db.t.reservations.find((r) => r.id === input.reservationId && r.userId === userId);
  if (!hold || (hold.expiresAt && Date.parse(hold.expiresAt) <= Date.now())) {
    throw new UserError(
      "Your 15-minute hold has run out. Please go back to the bag and check out again.",
      409,
    );
  }
  // Re-route for the delivery address, counting the hold's own units as available.
  const routed = route(db, hold.lines, input.address.district, hold.id);
  if (routed.some((l) => !l)) throw new UserError("Some pieces are no longer available.", 409);
  const lines = routed as HeldLine[];
  const shipments = shipmentsFor(lines, input.address.district);
  const shipping = shipments.reduce((s, x) => s + x.fee, 0);
  const price = priceFor(db, userId, lines, shipping, input.useWallet);

  const number = `MS-${String(1001 + db.t.orders.length).padStart(6, "0")}`;
  hold.lines = lines;
  const order: Order = {
    id: id("ord"),
    number,
    userId,
    createdAt: nowIso(),
    items: lines.map((l) => {
      const p = db.product(l.productId)!;
      const color = p.colors.find((c) => c.name === l.colorName);
      return { ...l, name: p.name, unitPrice: p.price, image: color?.image };
    }),
    address: input.address,
    shipments,
    pricing: {
      subtotal: price.subtotal,
      discounts: price.discounts,
      shipping: price.shipping,
      total: price.total,
      walletUsed: price.walletUsed,
      payable: price.payable,
    },
    payment: {
      method: price.payable === 0 ? "wallet" : input.payment,
      status: price.payable === 0 ? "paid" : input.payment === "cod" ? "cod" : "unpaid",
      attempts: 0,
    },
    status: "PENDING_PAYMENT",
    reservationId: hold.id,
  };
  db.t.orders.push(order);

  // Remember the address for next time.
  const user = db.user(userId);
  if (user)
    user.profile = {
      ...user.profile,
      district: input.address.district,
      phone: input.address.phone,
    };

  if (order.payment.method === "cod" || order.payment.method === "wallet") {
    confirm(db, order);
    return { order, next: `/account/orders/${order.id}?placed=1` };
  }
  hold.kind = "payment";
  hold.expiresAt = minutesFromNow(CHECKOUT_HOLD_MIN);
  hold.orderId = order.id;
  order.payment.retryToken = randomBytes(18).toString("base64url");
  return { order, next: `/pay/${order.id}?token=${order.payment.retryToken}` };
}

function payable(db: Db, orderId: string, actor: { userId: string | null; token?: string }) {
  const order = db.t.orders.find((o) => o.id === orderId);
  if (!order) throw new UserError("Order not found.", 404);
  const allowed =
    (actor.userId && actor.userId === order.userId) ||
    (actor.token && order.payment.retryToken && actor.token === order.payment.retryToken);
  if (!allowed) throw new UserError("This payment link is not valid.", 403);
  return order;
}

/** The demo payment gateway's answer (success or failure) for an unpaid order. Idempotent. */
export function settlePayment(
  db: Db,
  orderId: string,
  actor: { userId: string | null; token?: string },
  outcome: "success" | "fail",
) {
  const order = payable(db, orderId, actor);
  if (order.status === "CONFIRMED") return order; // already paid — a repeated callback changes nothing
  if (order.status === "CANCELLED")
    throw new UserError("This order was cancelled — the payment window ran out.", 409);
  const hold = db.t.reservations.find((r) => r.id === order.reservationId);
  if (!hold) throw new UserError("The hold on these pieces has run out.", 409);
  order.payment.attempts += 1;
  if (outcome === "success") {
    order.payment.status = "paid";
    confirm(db, order);
    return order;
  }
  order.status = "PAYMENT_FAILED_RETRYABLE";
  order.payment.status = "failed";
  hold.expiresAt = minutesFromNow(RETRY_HOLD_MIN);
  order.payment.retryToken = randomBytes(18).toString("base64url");
  db.notify(
    order.userId,
    `Payment for ${order.number} didn't go through`,
    `Nothing was charged. Your pieces are held for ${RETRY_HOLD_MIN} more minutes — retry, or switch to Cash on Delivery in one tap.`,
    `/pay/${order.id}?token=${order.payment.retryToken}`,
  );
  return order;
}

/** Switches an unpaid or failed order to another method; Cash on Delivery confirms it at once. */
export function switchMethod(
  db: Db,
  orderId: string,
  actor: { userId: string | null; token?: string },
  method: "cod" | "bkash" | "nagad",
) {
  const order = payable(db, orderId, actor);
  if (order.status === "CONFIRMED") return order;
  if (order.status === "CANCELLED")
    throw new UserError("This order was cancelled — the payment window ran out.", 409);
  if (!db.t.reservations.some((r) => r.id === order.reservationId)) {
    throw new UserError("The hold on these pieces has run out.", 409);
  }
  order.payment.method = method;
  if (method === "cod") {
    order.payment.status = "cod";
    confirm(db, order);
  } else {
    order.status = "PENDING_PAYMENT";
    order.payment.status = "unpaid";
  }
  return order;
}

export function warehouseName(id: WarehouseId) {
  return WAREHOUSES.find((w) => w.id === id)?.name ?? id;
}
