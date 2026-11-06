"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { recommendSize } from "@/lib/sizing";
import {
  deliveryQuote,
  DISTRICT_NAMES,
  etaDate,
  nearestWarehouses,
  WAREHOUSES,
  type WarehouseId,
} from "@/lib/warehouses";
import { cn, formatPrice } from "@/lib/utils";
import { api, useSessionStore } from "@/store/sessionStore";
import { useHydrated } from "@/lib/useHydrated";

// ----------------------------------------------------------------------- live stock

export interface LiveStock {
  sizes: Record<string, { total: number; byWarehouse: Record<WarehouseId, number> }>;
}

/** Stock as it is right now (orders and 15-minute holds included), refreshed every 30 s. */
export function useLiveStock(productId: string) {
  const [stock, setStock] = useState<LiveStock | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch(`/api/stock/${productId}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: LiveStock | null) => !cancelled && d && setStock(d))
        .catch(() => undefined);
    void load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [productId]);
  return stock;
}

// ---------------------------------------------------------------------- reviews data

export interface ReviewsData {
  reviews: Array<{
    id: string;
    name: string;
    rating: number;
    fit: "RUNS_SMALL" | "TRUE_TO_SIZE" | "RUNS_LARGE";
    body: string;
    sizePurchased: string;
    heightCm?: number;
    weightKg?: number;
    createdAt: string;
  }>;
  total: number;
  rating: number | null;
  fit: {
    total: number;
    small: number;
    trueToSize: number;
    large: number;
    lean: number;
    verdict: string | null;
  };
}

export function useReviews(productId: string, heightRange: string) {
  const [data, setData] = useState<ReviewsData | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reviews/${productId}${heightRange ? `?h=${heightRange}` : ""}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ReviewsData | null) => !cancelled && setData(d))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [productId, heightRange]);
  return data;
}

// ------------------------------------------------------------------------ size advice

/** "Your size: M · 92% match", from measurements, kept pieces and what reviewers say. */
export function SizeAdvisor({
  product,
  fitLean,
  onPick,
  current,
}: {
  product: Product;
  fitLean: number;
  onPick: (size: string) => void;
  current: string;
}) {
  const me = useSessionStore((s) => s.me);
  const rec = useMemo(
    () =>
      me?.user ? recommendSize(product, me.user.profile, me.sizeHistory ?? [], fitLean) : null,
    [me, product, fitLean],
  );
  // One-size pieces (a saree, a hijab) need no size advice.
  if (!me || product.sizes.length < 2) return null;
  if (!me.user) {
    return (
      <p className="mt-3 text-xs text-ink-faint">
        <Link href="/login" className="link-line text-ink">
          Sign in
        </Link>{" "}
        to see the size that fits you.
      </p>
    );
  }
  if (!rec) {
    return (
      <p className="mt-3 text-xs text-ink-faint">
        Add your measurements in{" "}
        <Link href="/account" className="link-line text-ink">
          your profile
        </Link>{" "}
        for a size suggestion.
      </p>
    );
  }
  return (
    <div className="mt-3 flex items-start justify-between gap-3 bg-ink/[0.04] px-3 py-2.5 text-xs">
      <p>
        <span className="font-medium">
          Your size: {rec.size} · {rec.match}% match
        </span>
        <span className="block text-ink-faint">{rec.reason}</span>
      </p>
      {current !== rec.size ? (
        <button
          type="button"
          onClick={() => onPick(rec.size)}
          className="link-line shrink-0 font-medium"
        >
          Select {rec.size}
        </button>
      ) : null}
    </div>
  );
}

// -------------------------------------------------------------------------- alerts

/** Back-in-stock (for the chosen sold-out size) and price-drop alerts. */
export function StockAlerts({
  product,
  size,
  soldOut,
}: {
  product: Product;
  size: string;
  soldOut: boolean;
}) {
  const me = useSessionStore((s) => s.me);
  const refresh = useSessionStore((s) => s.refresh);
  const router = useRouter();
  const path = usePathname();
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const waiting = me?.waitlist ?? [];
  const restockSet = waiting.some(
    (w) => w.productId === product.id && w.kind === "restock" && w.size === size,
  );
  const priceSet = waiting.some((w) => w.productId === product.id && w.kind === "price");

  const subscribe = async (kind: "restock" | "price") => {
    if (!me?.user) {
      router.push(`/login?next=${encodeURIComponent(path)}`);
      return;
    }
    setError(null);
    try {
      await api("/api/waitlist", {
        productId: product.id,
        size: kind === "restock" ? size : undefined,
        kind,
      });
      setDone(
        kind === "restock"
          ? `We'll tell you the moment size ${size} is back.`
          : "We'll tell you if the price drops.",
      );
      void refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="mt-3 space-y-1.5 text-xs">
      {soldOut ? (
        restockSet ? (
          <p className="text-success">
            You are on the list for size {size} — first come, first served.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => subscribe("restock")}
            className="flex h-11 w-full items-center justify-center border border-ink text-[0.8125rem]"
          >
            Notify me when size {size} is back
          </button>
        )
      ) : null}
      {priceSet ? (
        <p className="text-ink-faint">Price-drop alert is on.</p>
      ) : (
        <button
          type="button"
          onClick={() => subscribe("price")}
          className="link-line text-ink-soft"
        >
          Alert me if the price drops
        </button>
      )}
      {done ? <p className="text-success">{done}</p> : null}
      {error ? <p className="text-danger">{error}</p> : null}
    </div>
  );
}

// ------------------------------------------------------------------- delivery estimate

const DISTRICT_KEY = "maison.district";

/** Fee and arrival date for the shopper's district, from the nearest warehouse with stock. */
export function DeliveryEstimate({ live, size }: { live: LiveStock | null; size: string }) {
  const me = useSessionStore((s) => s.me);
  const hydrated = useHydrated();
  const [picked, setPicked] = useState<string | null>(null);
  // The district chosen on an earlier visit (read only after hydration, so the static page
  // and the first browser render agree).
  let stored: string | null = null;
  if (hydrated) {
    try {
      stored = window.localStorage.getItem(DISTRICT_KEY);
    } catch {
      stored = null;
    }
  }
  const district = picked ?? stored ?? me?.user?.profile.district ?? "Dhaka";
  const byWarehouse = live?.sizes[size]?.byWarehouse;
  const warehouse = nearestWarehouses(district).find(
    (w) => !byWarehouse || (byWarehouse[w] ?? 0) > 0,
  );
  if (!warehouse) return null;
  const quote = deliveryQuote(warehouse, district);
  const eta = new Date(etaDate(quote.days)).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const name = WAREHOUSES.find((w) => w.id === warehouse)?.name;

  return (
    <div className="mt-6 flex items-start gap-3 border border-line bg-paper px-4 py-3 text-xs">
      <svg
        viewBox="0 0 24 24"
        aria-hidden
        className="mt-0.5 h-4 w-4 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z" strokeLinejoin="round" />
        <circle cx="7" cy="17.5" r="1.5" />
        <circle cx="17" cy="17.5" r="1.5" />
      </svg>
      <div className="flex-1">
        <p>
          Delivery to{" "}
          <select
            aria-label="Your district"
            value={district}
            onChange={(e) => {
              setPicked(e.target.value);
              try {
                window.localStorage.setItem(DISTRICT_KEY, e.target.value);
              } catch {
                /* private mode */
              }
            }}
            className="border-b border-ink bg-transparent font-medium outline-none"
          >
            {DISTRICT_NAMES.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>{" "}
          by <strong className="font-medium">{eta}</strong> · {formatPrice(quote.fee)}
        </p>
        <p className="mt-0.5 text-ink-faint">Ships from {name}. Free delivery from ৳5,000.</p>
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------- reviews

const FIT_LABEL = {
  RUNS_SMALL: "Runs small",
  TRUE_TO_SIZE: "True to size",
  RUNS_LARGE: "Runs large",
} as const;
const HEIGHTS = [
  ["", "Everyone"],
  ["140-159", "Under 160 cm"],
  ["160-169", "160–169 cm"],
  ["170-179", "170–179 cm"],
  ["180-220", "180 cm +"],
] as const;

/** Verified-buyer reviews with the fit consensus and a filter by reviewer height. */
export function ProductReviews({ productId }: { productId: string }) {
  const [height, setHeight] = useState("");
  const data = useReviews(productId, height);

  return (
    <section className="mx-auto max-w-[90rem] border-t border-line px-4 py-14 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Verified buyers only</p>
          <h2 className="display mt-2 text-4xl sm:text-5xl">
            Reviews <em className="italic">&amp; fit</em>
          </h2>
        </div>
        {data && data.total > 0 ? (
          <p className="text-sm">
            <span className="text-accent">{"★".repeat(Math.round(data.rating ?? 0))}</span>{" "}
            {data.rating?.toFixed(1)} · {data.total} review{data.total === 1 ? "" : "s"}
          </p>
        ) : null}
      </div>

      {!data ? (
        <p className="mt-6 text-sm text-ink-faint">Loading reviews…</p>
      ) : data.total === 0 ? (
        <p className="mt-6 max-w-prose text-sm text-ink-soft">
          No reviews yet. Only shoppers who received this piece can review it — and they tell you
          how it fits.
        </p>
      ) : (
        <>
          {/* Fit consensus */}
          <div className="mt-8 max-w-xl">
            <div className="flex justify-between text-xs text-ink-faint">
              <span>Runs small</span>
              <span>True to size</span>
              <span>Runs large</span>
            </div>
            <div className="relative mt-2 h-1.5 rounded-full bg-line">
              <span
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bone bg-ink"
                style={{ left: `${50 + data.fit.lean * 50}%` }}
              />
            </div>
            <p className="mt-3 text-sm">
              {data.fit.verdict === "RUNS_SMALL"
                ? "Most buyers say it runs small — consider a size up."
                : data.fit.verdict === "RUNS_LARGE"
                  ? "Most buyers say it runs large — consider a size down."
                  : "Most buyers say it is true to size."}
              <span className="text-ink-faint"> ({data.fit.total} fit votes)</span>
            </p>
          </div>

          <div className="no-scrollbar mt-8 flex gap-1.5 overflow-x-auto">
            {HEIGHTS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setHeight(value)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-[0.8125rem]",
                  height === value ? "bg-ink text-bone" : "text-ink-soft hover:bg-ink/5",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {data.reviews.length === 0 ? (
              <li className="text-sm text-ink-faint">No reviews from buyers of this height yet.</li>
            ) : (
              data.reviews.map((r) => (
                <li key={r.id} className="border border-line bg-paper p-5 text-sm">
                  <div className="flex items-baseline justify-between">
                    <span className="text-accent">
                      {"★".repeat(r.rating)}
                      <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                    </span>
                    <span className="text-xs text-ink-faint">
                      {new Date(r.createdAt).toLocaleDateString("en-GB")}
                    </span>
                  </div>
                  <p className="mt-3 leading-relaxed">{r.body}</p>
                  <p className="mt-3 text-xs text-ink-faint">
                    {r.name} · bought {r.sizePurchased}
                    {r.heightCm ? ` · ${r.heightCm} cm` : ""}
                    {r.weightKg ? ` · ${r.weightKg} kg` : ""} ·{" "}
                    <span className="text-ink">{FIT_LABEL[r.fit]}</span>
                  </p>
                </li>
              ))
            )}
          </ul>
        </>
      )}
    </section>
  );
}
