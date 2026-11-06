"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { cn, formatPrice } from "@/lib/utils";
import { api } from "@/store/sessionStore";

interface OrderView {
  order: {
    id: string;
    number: string;
    status: string;
    pricing: { payable: number };
    payment: { method: string; status: string; attempts: number };
  };
  holdExpiresAt: string | null;
}

const NAMES: Record<string, string> = { bkash: "bKash", nagad: "Nagad", cod: "Cash on Delivery" };

/**
 * A stand-in for the bKash / Nagad payment page. The shopper chooses the outcome, so both the
 * success path and the failure-recovery path (retry, or switch to Cash on Delivery with the
 * hold kept for 30 minutes) can be tried without a merchant account.
 */
export function PayDemo({ orderId }: { orderId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [token, setToken] = useState(params.get("token") ?? undefined);
  const [view, setView] = useState<OrderView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bumped after every action to fetch the order again.
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/orders/${orderId}${token ? `?token=${encodeURIComponent(token)}` : ""}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const data = (await res.json()) as OrderView & { error?: string };
        if (cancelled) return;
        if (!res.ok) setError(data.error ?? "Order not found.");
        else setView(data);
      })
      .catch(() => !cancelled && setError("Could not load the order."));
    return () => {
      cancelled = true;
    };
  }, [orderId, token, version]);

  const done = view?.order.status === "CONFIRMED";
  useEffect(() => {
    if (done) router.replace(`/account/orders/${orderId}?placed=1`);
  }, [done, orderId, router]);

  const act = async (path: string, body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ status: string; retryToken?: string }>(path, { token, ...body });
      if (res.retryToken) setToken(res.retryToken);
      setVersion((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  if (error && !view) {
    return <p className="mx-auto max-w-md px-4 py-20 text-center text-sm text-danger">{error}</p>;
  }
  if (!view)
    return (
      <p className="mx-auto max-w-md px-4 py-20 text-center text-sm text-ink-faint">Loading…</p>
    );

  const { order } = view;
  const failed = order.status === "PAYMENT_FAILED_RETRYABLE";
  const cancelled = order.status === "CANCELLED";
  const method = NAMES[order.payment.method] ?? order.payment.method;

  return (
    <div className="mx-auto grid min-h-[70dvh] max-w-md place-items-center bg-bone/90 px-4 py-12">
      <div className="w-full">
        <p className="eyebrow">Order {order.number}</p>
        <h1 className="display mt-3 text-5xl">
          {cancelled
            ? "Order cancelled"
            : failed
              ? "Payment didn't go through"
              : `Pay with ${method}`}
        </h1>

        <div className="mt-6 border border-line bg-paper p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink-soft">Amount</span>
            <span className="text-2xl tabular-nums">{formatPrice(order.pricing.payable)}</span>
          </div>
          {view.holdExpiresAt && !cancelled ? (
            <p className="mt-2 text-xs text-ink-faint">
              Your pieces are held until{" "}
              {new Date(view.holdExpiresAt).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
              .
            </p>
          ) : null}
          {failed ? (
            <p className="mt-3 text-sm text-ink-soft">
              Nothing was charged. Try again, choose another method, or switch to Cash on Delivery —
              your bag and address are kept.
            </p>
          ) : null}
        </div>

        {cancelled ? (
          <Link
            href="/cart"
            className="mt-6 flex h-13 items-center justify-center bg-ink text-sm text-bone"
          >
            Back to your bag
          </Link>
        ) : (
          <div className="mt-6 space-y-2">
            <p className="text-center text-xs uppercase tracking-[0.18em] text-ink-faint">
              Demo gateway
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => act(`/api/orders/${order.id}/pay`, { outcome: "success" })}
              className="flex h-13 w-full items-center justify-between bg-ink px-5 text-sm font-medium text-bone disabled:opacity-50"
            >
              <span>{failed ? "Retry payment" : "Pay now"} — succeeds</span>
              <span className="tabular-nums">{formatPrice(order.pricing.payable)}</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => act(`/api/orders/${order.id}/pay`, { outcome: "fail" })}
              className="flex h-12 w-full items-center justify-center border border-line text-sm disabled:opacity-50"
            >
              Simulate a failed payment
            </button>
            <div className="grid grid-cols-3 gap-2 pt-3">
              {(["cod", "bkash", "nagad"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={busy || order.payment.method === m}
                  onClick={() => act(`/api/orders/${order.id}/method`, { method: m })}
                  className={cn(
                    "h-11 border text-xs transition-colors disabled:cursor-default",
                    order.payment.method === m
                      ? "border-ink bg-paper"
                      : "border-line hover:border-ink",
                  )}
                >
                  {m === "cod" ? "Switch to COD" : NAMES[m]}
                </button>
              ))}
            </div>
          </div>
        )}
        {error ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
