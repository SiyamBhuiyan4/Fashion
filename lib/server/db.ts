/**
 * The shop's customer data, in the same Telegram-backed snapshot as the catalogue
 * (lib/db/telegramStore.ts). Every change goes through `transact`, which runs under the
 * database's write lock: one writer at a time, so two shoppers can never both take the last
 * unit of a size. Reads use `read`, which sees the newest saved snapshot.
 *
 * Tables (all arrays in snapshot.tables):
 *   users, inventory, reservations, orders, cases (returns/exchanges), reviews, waitlist,
 *   notifications, wallet
 *
 * Housekeeping runs inside every transaction, so no cron job is needed: expired stock holds
 * are released (and an unpaid order whose hold ran out is cancelled), and waitlist alerts are
 * sent the moment a size comes back or a price drops.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import { loadSnapshot, withWriteLock, type Snapshot } from "@/lib/db/telegramStore";
import { getCatalog } from "@/lib/products.server";
import type { Product } from "@/lib/schemas";
import { WAREHOUSES, splitStock, type WarehouseId } from "@/lib/warehouses";
import { sendEmail } from "@/lib/server/email";

// ------------------------------------------------------------------------------- types

export interface Profile {
  heightCm?: number;
  weightKg?: number;
  chestCm?: number;
  waistCm?: number;
  footEu?: number;
  defaultSize?: string;
  district?: string;
  phone?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  profile: Profile;
}

export interface InventoryRow {
  productId: string;
  size: string;
  warehouse: WarehouseId;
  units: number;
}

export interface Line {
  productId: string;
  colorName: string;
  size: string;
  quantity: number;
}

export interface HeldLine extends Line {
  warehouse: WarehouseId;
}

export type ReservationKind = "checkout" | "payment" | "exchange";

export interface Reservation {
  id: string;
  userId: string;
  kind: ReservationKind;
  lines: HeldLine[];
  createdAt: string;
  /** null = held until released explicitly (exchanges). */
  expiresAt: string | null;
  orderId?: string;
  caseId?: string;
}

export type OrderStatus =
  "PENDING_PAYMENT" | "PAYMENT_FAILED_RETRYABLE" | "CONFIRMED" | "CANCELLED";

export type PaymentMethod = "cod" | "bkash" | "nagad" | "wallet";

export interface OrderItem extends HeldLine {
  name: string;
  unitPrice: number;
  image?: string;
}

export interface Address {
  name: string;
  phone: string;
  district: string;
  area: string;
  line: string;
}

export interface Shipment {
  warehouse: WarehouseId;
  fee: number;
  days: number;
  eta: string;
}

export interface Pricing {
  subtotal: number;
  discounts: Array<{ id: string; label: string; amount: number }>;
  shipping: number;
  total: number;
  walletUsed: number;
  payable: number;
}

export interface TrackingEvent {
  status: string;
  at: string;
  note?: string;
}

export interface Order {
  id: string;
  number: string;
  userId: string;
  createdAt: string;
  items: OrderItem[];
  address: Address;
  shipments: Shipment[];
  pricing: Pricing;
  payment: {
    method: PaymentMethod;
    status: "unpaid" | "paid" | "failed" | "cod";
    attempts: number;
    retryToken?: string;
  };
  status: OrderStatus;
  confirmedAt?: string;
  reservationId?: string;
  /** Events from a real courier webhook; until one arrives the demo courier is shown. */
  courierEvents?: TrackingEvent[];
}

export interface Case {
  id: string;
  orderId: string;
  userId: string;
  itemIndex: number;
  type: "return" | "exchange";
  newSize?: string;
  status: "APPROVED" | "REJECTED";
  reason?: string;
  trackingId?: string;
  refund?: number;
  createdAt: string;
  reservationId?: string;
}

export type FitVote = "RUNS_SMALL" | "TRUE_TO_SIZE" | "RUNS_LARGE";

export interface Review {
  id: string;
  productId: string;
  userId: string;
  orderId: string;
  name: string;
  rating: number;
  fit: FitVote;
  body: string;
  sizePurchased: string;
  heightCm?: number;
  weightKg?: number;
  createdAt: string;
}

export interface WaitlistEntry {
  id: string;
  userId: string;
  productId: string;
  size?: string;
  kind: "restock" | "price";
  priceAt: number;
  createdAt: string;
  notifiedAt?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  href?: string;
  createdAt: string;
  read?: boolean;
}

export interface WalletTx {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  orderId?: string;
  at: string;
}

export interface Tables {
  users: User[];
  inventory: InventoryRow[];
  reservations: Reservation[];
  orders: Order[];
  cases: Case[];
  reviews: Review[];
  waitlist: WaitlistEntry[];
  notifications: Notification[];
  wallet: WalletTx[];
}

const TABLE_NAMES: Array<keyof Tables> = [
  "users",
  "inventory",
  "reservations",
  "orders",
  "cases",
  "reviews",
  "waitlist",
  "notifications",
  "wallet",
];

export const id = (prefix: string) => `${prefix}_${randomBytes(9).toString("base64url")}`;
export const nowIso = () => new Date().toISOString();

// --------------------------------------------------------------------------- the view

/** A working view of the database: the tables plus the catalogue they refer to. */
export class Db {
  outbox: Array<{ to: string; subject: string; text: string }> = [];

  constructor(
    public t: Tables,
    public catalog: readonly Product[],
  ) {}

  product(productId: string) {
    return this.catalog.find((p) => p.id === productId);
  }

  user(userId: string) {
    return this.t.users.find((u) => u.id === userId);
  }

  /** Stock rows for a product, created from the catalogue's per-size stock the first time. */
  stockRows(productId: string): InventoryRow[] {
    let rows = this.t.inventory.filter((r) => r.productId === productId);
    if (rows.length === 0) {
      const product = this.product(productId);
      if (!product) return [];
      rows = product.sizes.flatMap((size) =>
        splitStock(product.stock[size] ?? 0).map(([warehouse, units]) => ({
          productId,
          size,
          warehouse,
          units,
        })),
      );
      this.t.inventory.push(...rows);
    }
    return rows;
  }

  /** Units held right now by live reservations, per warehouse. */
  held(productId: string, size: string, warehouse?: WarehouseId, ignore?: string): number {
    const now = Date.now();
    let total = 0;
    for (const r of this.t.reservations) {
      if (r.id === ignore) continue;
      if (r.expiresAt && Date.parse(r.expiresAt) <= now) continue;
      for (const line of r.lines) {
        if (line.productId !== productId || line.size !== size) continue;
        if (warehouse && line.warehouse !== warehouse) continue;
        total += line.quantity;
      }
    }
    return total;
  }

  /** Units that can still be bought, per warehouse (stock minus live holds). */
  available(productId: string, size: string, ignore?: string): Record<WarehouseId, number> {
    const out = Object.fromEntries(WAREHOUSES.map((w) => [w.id, 0])) as Record<WarehouseId, number>;
    for (const row of this.stockRows(productId)) {
      if (row.size !== size) continue;
      out[row.warehouse] = Math.max(
        0,
        row.units - this.held(productId, size, row.warehouse, ignore),
      );
    }
    return out;
  }

  availableTotal(productId: string, size: string, ignore?: string): number {
    return Object.values(this.available(productId, size, ignore)).reduce((a, b) => a + b, 0);
  }

  /** Takes units out of stock for good (an order is confirmed). */
  deduct(lines: HeldLine[]) {
    for (const line of lines) {
      const row = this.stockRows(line.productId).find(
        (r) => r.size === line.size && r.warehouse === line.warehouse,
      );
      if (row) row.units = Math.max(0, row.units - line.quantity);
    }
  }

  /** Puts units back (a return was collected). */
  restock(lines: HeldLine[]) {
    for (const line of lines) {
      const row = this.stockRows(line.productId).find(
        (r) => r.size === line.size && r.warehouse === line.warehouse,
      );
      if (row) row.units += line.quantity;
    }
  }

  release(reservationId: string | undefined) {
    if (!reservationId) return;
    this.t.reservations = this.t.reservations.filter((r) => r.id !== reservationId);
  }

  walletBalance(userId: string): number {
    return this.t.wallet.filter((w) => w.userId === userId).reduce((sum, w) => sum + w.amount, 0);
  }

  notify(userId: string, title: string, body: string, href?: string) {
    this.t.notifications.push({ id: id("ntf"), userId, title, body, href, createdAt: nowIso() });
    const user = this.user(userId);
    if (user)
      this.outbox.push({
        to: user.email,
        subject: title,
        text: `${body}${href ? `\n\n${href}` : ""}`,
      });
    // Keep the table from growing without bound: the newest 50 per customer.
    const mine = this.t.notifications.filter((n) => n.userId === userId);
    if (mine.length > 50) {
      const drop = new Set(mine.slice(0, mine.length - 50).map((n) => n.id));
      this.t.notifications = this.t.notifications.filter((n) => !drop.has(n.id));
    }
  }

  /** Releases expired holds; an unpaid order whose hold ran out is cancelled. */
  expireHolds() {
    const now = Date.now();
    const expired = this.t.reservations.filter(
      (r) => r.expiresAt && Date.parse(r.expiresAt) <= now,
    );
    if (expired.length === 0) return;
    const gone = new Set(expired.map((r) => r.id));
    this.t.reservations = this.t.reservations.filter((r) => !gone.has(r.id));
    for (const order of this.t.orders) {
      if (
        order.reservationId &&
        gone.has(order.reservationId) &&
        (order.status === "PENDING_PAYMENT" || order.status === "PAYMENT_FAILED_RETRYABLE")
      ) {
        order.status = "CANCELLED";
        this.notify(
          order.userId,
          `Order ${order.number} was cancelled`,
          "The payment window ran out, so the pieces went back on sale. Your bag is unchanged.",
          `/account/orders/${order.id}`,
        );
      }
    }
  }

  /**
   * Waitlist alerts, first come first served: a size back in stock goes to the earliest
   * subscribers first (as many as there are units), and a lower price to everyone waiting.
   */
  processWaitlist() {
    const pending = this.t.waitlist
      .filter((w) => !w.notifiedAt)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const offered = new Map<string, number>();
    for (const entry of pending) {
      const product = this.product(entry.productId);
      if (!product) continue;
      if (entry.kind === "price") {
        if (product.price < entry.priceAt) {
          entry.notifiedAt = nowIso();
          this.notify(
            entry.userId,
            `Price drop: ${product.name}`,
            `Now ৳${product.price.toLocaleString("en-US")} (was ৳${entry.priceAt.toLocaleString("en-US")}).`,
            `/product/${product.id}`,
          );
        }
        continue;
      }
      const size = entry.size ?? "";
      const key = `${entry.productId}|${size}`;
      const free = this.availableTotal(entry.productId, size) - (offered.get(key) ?? 0);
      if (free > 0) {
        offered.set(key, (offered.get(key) ?? 0) + 1);
        entry.notifiedAt = nowIso();
        this.notify(
          entry.userId,
          `Back in stock: ${product.name} (${size})`,
          "The size you were waiting for is available again — you are among the first to know.",
          `/product/${product.id}`,
        );
      }
    }
  }
}

function tablesOf(snapshot: Snapshot): Tables {
  const t = {} as Tables;
  for (const name of TABLE_NAMES) {
    const rows = snapshot.tables[name];
    (t as unknown as Record<string, unknown[]>)[name] = Array.isArray(rows) ? rows : [];
  }
  return t;
}

/** The newest saved data, read-only. */
export async function read(): Promise<Db> {
  const [{ snapshot }, catalog] = await Promise.all([loadSnapshot(), getCatalog()]);
  return new Db(tablesOf(snapshot), catalog);
}

export class UserError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

/**
 * Runs a change under the write lock. `change` may throw a UserError to abort without saving.
 * Housekeeping runs first, so the change always sees released holds and fresh stock.
 */
export async function transact<T>(change: (db: Db) => T | Promise<T>): Promise<T> {
  const catalog = await getCatalog();
  let result: T;
  let outbox: Db["outbox"] = [];
  await withWriteLock(async (snapshot) => {
    const db = new Db(tablesOf(snapshot), catalog);
    db.expireHolds();
    result = await change(db);
    db.processWaitlist();
    for (const name of TABLE_NAMES) snapshot.tables[name] = db.t[name];
    outbox = db.outbox;
    return true;
  });
  // Emails go out after the save, and never fail the request.
  await Promise.allSettled(outbox.map((mail) => sendEmail(mail)));
  return result!;
}
