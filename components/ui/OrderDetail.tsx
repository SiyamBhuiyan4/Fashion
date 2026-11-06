"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { cn, formatPrice } from "@/lib/utils";
import { MILESTONES } from "@/lib/tracking";
import { statusLabel } from "@/components/ui/Account";
import { OrderAftercare, type CaseView } from "@/components/ui/OrderAftercare";

export interface OrderDetailView {
  order: {
    id: string;
    number: string;
    createdAt: string;
    status: string;
    items: Array<{
      productId: string;
      name: string;
      image?: string;
      size: string;
      colorName: string;
      quantity: number;
      unitPrice: number;
    }>;
    address: { name: string; phone: string; district: string; area: string; line: string };
    shipments: Array<{ warehouse: string; name: string; fee: number; eta: string; days: number }>;
    pricing: {
      subtotal: number;
      discounts: Array<{ id: string; label: string; amount: number }>;
      shipping: number;
      total: number;
      walletUsed: number;
      payable: number;
    };
    payment: { method: string; status: string };
  };
  tracking: {
    events: Array<{ status: string; label: string; at: string; note?: string }>;
    current: string;
    delivered: boolean;
    deliveredAt?: string;
    delayed: boolean;
    failed: boolean;
    demo: boolean;
  };
  cases: CaseView[];
  reviewed: string[];
}

const METHOD: Record<string, string> = {
  cod: "Cash on Delivery",
  bkash: "bKash",
  nagad: "Nagad",
  wallet: "Wallet",
};

export function OrderDetail({ orderId }: { orderId: string }) {
  const params = useSearchParams();
  const placed = params.get("placed") === "1";
  const [view, setView] = useState<OrderDetailView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/orders/${orderId}`, { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json()) as OrderDetailView & { error?: string };
        if (cancelled) return;
        if (!res.ok) setError(data.error ?? "Order not found.");
        else setView(data);
      })
      .catch(() => !cancelled && setError("Could not load the order."));
    return () => {
      cancelled = true;
    };
  }, [orderId, version]);

  // Keep the tracking timeline fresh while the parcel is on its way.
  const delivered = view?.tracking.delivered;
  useEffect(() => {
    if (!view || delivered || view.order.status === "CANCELLED") return;
    const timer = window.setInterval(() => setVersion((v) => v + 1), 20_000);
    return () => window.clearInterval(timer);
  }, [view, delivered]);

  if (error) return <p className="mx-auto max-w-5xl px-4 py-16 text-sm text-danger">{error}</p>;
  if (!view) return <p className="mx-auto max-w-5xl px-4 py-16 text-sm text-ink-faint">Loading…</p>;

  const { order, tracking } = view;
  const reached = new Set(tracking.events.map((e) => e.status));
  const awaitingPayment =
    order.status === "PENDING_PAYMENT" || order.status === "PAYMENT_FAILED_RETRYABLE";

  return (
    <div className="mx-auto min-h-[70dvh] max-w-5xl bg-bone/90 px-4 py-10 sm:px-8">
      <Link href="/account" className="link-line text-[0.8125rem] text-ink-soft">
        ← Your orders
      </Link>
      {placed && order.status === "CONFIRMED" ? (
        <div className="mt-6 border border-success/30 bg-success/5 px-5 py-4 text-sm">
          <p className="display text-2xl">Thank you — your order is confirmed.</p>
          <p className="mt-1 text-ink-soft">
            We&apos;ve sent the details to your notifications and email.
          </p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Order</p>
          <h1 className="display mt-2 text-5xl">{order.number}</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Placed{" "}
            {new Date(order.createdAt).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.14em]",
            order.status === "CANCELLED" ||
              tracking.delayed ||
              order.status === "PAYMENT_FAILED_RETRYABLE"
              ? "bg-danger/10 text-danger"
              : tracking.delivered
                ? "bg-success/10 text-success"
                : "bg-ink text-bone",
          )}
        >
          {statusLabel({ status: order.status, tracking })}
        </span>
      </div>

      {awaitingPayment ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border border-danger/30 bg-danger/5 px-5 py-4 text-sm">
          <span>
            {order.status === "PAYMENT_FAILED_RETRYABLE"
              ? "The payment didn't go through. Your pieces are still held — retry or switch to Cash on Delivery."
              : "This order is waiting for payment."}
          </span>
          <Link
            href={`/pay/${order.id}`}
            className="h-11 shrink-0 content-center bg-ink px-5 text-bone"
          >
            Complete payment
          </Link>
        </div>
      ) : null}

      {/* Tracking */}
      {order.status === "CONFIRMED" ? (
        <section className="mt-8 border border-line bg-paper p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-2xl">Tracking</h2>
            {tracking.demo ? (
              <span className="text-xs text-ink-faint">Demo courier — moves every 2 minutes</span>
            ) : null}
          </div>
          {tracking.delayed ? (
            <p className="mt-3 text-sm text-danger">
              {tracking.failed
                ? "The courier could not deliver and will try again."
                : "Your parcel is running late — the courier has been chased."}
            </p>
          ) : null}
          <ol className="mt-5 grid gap-4 sm:grid-cols-5">
            {MILESTONES.map((m) => {
              const event = tracking.events.find((e) => e.status === m.status);
              const done = reached.has(m.status);
              return (
                <li key={m.status} className="relative">
                  <span className={cn("block h-1 rounded-full", done ? "bg-ink" : "bg-line")} />
                  <p className={cn("mt-2 text-[0.8125rem]", done ? "text-ink" : "text-ink-faint")}>
                    {m.label}
                  </p>
                  {event ? (
                    <p className="text-xs text-ink-faint">
                      {new Date(event.at).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section>
          <h2 className="display text-2xl">Pieces</h2>
          <ul className="mt-3 divide-y divide-line border border-line bg-paper">
            {order.items.map((item, index) => (
              <li key={index} className="flex gap-4 p-4 text-sm">
                <Link
                  href={`/product/${item.productId}`}
                  className="relative h-24 w-18 shrink-0 overflow-hidden bg-bone-dark"
                >
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      unoptimized
                      sizes="72px"
                      className="object-cover"
                    />
                  ) : null}
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-ink-faint">
                    {item.colorName} · Size {item.size} · ×{item.quantity}
                  </p>
                  <OrderAftercare
                    orderId={order.id}
                    index={index}
                    item={item}
                    delivered={tracking.delivered}
                    deliveredAt={tracking.deliveredAt}
                    cases={view.cases}
                    reviewed={view.reviewed.includes(item.productId)}
                    onChange={() => setVersion((v) => v + 1)}
                  />
                </div>
                <span className="tabular-nums">{formatPrice(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-6">
          <div className="border border-line bg-paper p-5 text-sm">
            <h2 className="display text-xl">Summary</h2>
            <dl className="mt-3 space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(order.pricing.subtotal)}</dd>
              </div>
              {order.pricing.discounts.map((d) => (
                <div key={d.id} className="flex justify-between text-success">
                  <dt>{d.label}</dt>
                  <dd className="tabular-nums">−{formatPrice(d.amount)}</dd>
                </div>
              ))}
              <div className="flex justify-between">
                <dt className="text-ink-soft">Delivery</dt>
                <dd className="tabular-nums">
                  {order.pricing.shipping === 0 ? "Free" : formatPrice(order.pricing.shipping)}
                </dd>
              </div>
              {order.pricing.walletUsed > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Wallet</dt>
                  <dd className="tabular-nums">−{formatPrice(order.pricing.walletUsed)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-line pt-2 font-medium">
                <dt>{order.payment.method === "cod" ? "Pay on delivery" : "Paid"}</dt>
                <dd className="tabular-nums">{formatPrice(order.pricing.payable)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-ink-faint">
              Payment: {METHOD[order.payment.method] ?? order.payment.method}
            </p>
          </div>
          <div className="border border-line bg-paper p-5 text-sm">
            <h2 className="display text-xl">Delivery</h2>
            <p className="mt-3">
              {order.address.name} · {order.address.phone}
              <br />
              <span className="text-ink-soft">
                {order.address.line}, {order.address.area}, {order.address.district}
              </span>
            </p>
            <ul className="mt-3 space-y-1 text-xs text-ink-faint">
              {order.shipments.map((s) => (
                <li key={s.warehouse}>
                  From {s.name} · by{" "}
                  {new Date(s.eta).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
