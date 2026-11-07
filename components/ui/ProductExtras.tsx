"use client";

import { useEffect, useState } from "react";
import {
  deliveryQuote,
  DISTRICT_NAMES,
  etaDate,
  nearestWarehouses,
  WAREHOUSES,
  type WarehouseId,
} from "@/lib/warehouses";
import { formatPrice } from "@/lib/utils";
import { useHydrated } from "@/lib/useHydrated";
import { useCatalogStore } from "@/store/catalogStore";

// ----------------------------------------------------------------------- live stock

export interface LiveStock {
  sizes: Record<string, { total: number; byWarehouse: Record<WarehouseId, number> }>;
}

/** Stock as it is right now , refreshed every 30 s. */
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

// ------------------------------------------------------------------- delivery estimate

const DISTRICT_KEY = "aurevya.district";

/** Fee and arrival date for the shopper's district, from the nearest warehouse with stock. */
export function DeliveryEstimate({ live, size }: { live: LiveStock | null; size: string }) {
  const settings = useCatalogStore((s) => s.settings);
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
  const district = picked ?? stored ?? "Dhaka";
  const byWarehouse = live?.sizes[size]?.byWarehouse;
  const warehouse = nearestWarehouses().find((w) => !byWarehouse || (byWarehouse[w] ?? 0) > 0);
  if (!warehouse) return null;
  const quote = deliveryQuote(warehouse, district, settings);
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
        <p className="mt-0.5 text-ink-faint">Ships from {name}.</p>
      </div>
    </div>
  );
}
