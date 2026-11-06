"use client";

import { useState } from "react";
import { cn, formatPrice } from "@/lib/utils";
import { api } from "@/store/sessionStore";
import { useCatalogStore } from "@/store/catalogStore";

export interface CaseView {
  id: string;
  itemIndex: number;
  type: "return" | "exchange";
  newSize?: string;
  trackingId?: string;
  refund?: number;
}

const RETURN_WINDOW_DAYS = 7;
const REASONS = ["Too small", "Too large", "Not as pictured", "Changed my mind", "Faulty"] as const;
const FITS = [
  ["RUNS_SMALL", "Runs small"],
  ["TRUE_TO_SIZE", "True to size"],
  ["RUNS_LARGE", "Runs large"],
] as const;

/** Return, exchange and review actions for one delivered piece. */
export function OrderAftercare({
  orderId,
  index,
  item,
  delivered,
  deliveredAt,
  cases,
  reviewed,
  onChange,
}: {
  orderId: string;
  index: number;
  item: { productId: string; size: string };
  delivered: boolean;
  deliveredAt?: string;
  cases: CaseView[];
  reviewed: boolean;
  onChange: () => void;
}) {
  const product = useCatalogStore((s) => s.get(item.productId));
  const [panel, setPanel] = useState<null | "return" | "exchange" | "review">(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kase = cases.find((c) => c.itemIndex === index);
  // The time this panel opened, for the days left in the return window.
  const [openedAt] = useState(() => Date.now());

  if (!delivered) return null;
  const daysLeft = deliveredAt
    ? RETURN_WINDOW_DAYS - Math.floor((openedAt - Date.parse(deliveredAt)) / 86_400_000)
    : 0;

  const submit = async (path: string, body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      await api(path, body);
      setPanel(null);
      onChange();
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="mt-3 text-xs">
      {kase ? (
        <p className="text-success">
          {kase.type === "return"
            ? `Return approved · pickup ${kase.trackingId} · ${formatPrice(kase.refund ?? 0)} refunded to your wallet`
            : `Exchange approved · size ${kase.newSize} set aside · pickup ${kase.trackingId}`}
        </p>
      ) : (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {daysLeft >= 0 ? (
            <>
              <button
                type="button"
                onClick={() => setPanel(panel === "exchange" ? null : "exchange")}
                className="link-line"
              >
                Exchange size
              </button>
              <button
                type="button"
                onClick={() => setPanel(panel === "return" ? null : "return")}
                className="link-line"
              >
                Return
              </button>
              <span className="text-ink-faint">
                {daysLeft} day{daysLeft === 1 ? "" : "s"} left to return
              </span>
            </>
          ) : (
            <span className="text-ink-faint">Return window closed</span>
          )}
        </div>
      )}
      {!reviewed ? (
        <button
          type="button"
          onClick={() => setPanel(panel === "review" ? null : "review")}
          className="link-line mt-1 block"
        >
          Write a review
        </button>
      ) : (
        <p className="mt-1 text-ink-faint">Thanks for your review.</p>
      )}

      {panel === "exchange" && product ? (
        <div className="mt-3 border border-line p-3">
          <p>Swap size {item.size} for:</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {product.sizes
              .filter((s) => s !== item.size)
              .map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    submit(`/api/orders/${orderId}/case`, {
                      type: "exchange",
                      itemIndex: index,
                      newSize: s,
                    })
                  }
                  className="h-9 min-w-10 border border-line px-2 hover:border-ink disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
          </div>
          <p className="mt-2 text-ink-faint">The new size is set aside the moment you choose it.</p>
        </div>
      ) : null}

      {panel === "return" ? (
        <div className="mt-3 border border-line p-3">
          <p>Why are you returning it?</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REASONS.map((r) => (
              <button
                key={r}
                type="button"
                disabled={busy}
                onClick={() =>
                  submit(`/api/orders/${orderId}/case`, {
                    type: "return",
                    itemIndex: index,
                    reason: r,
                  })
                }
                className="h-9 border border-line px-3 hover:border-ink disabled:opacity-50"
              >
                {r}
              </button>
            ))}
          </div>
          <p className="mt-2 text-ink-faint">Approved instantly; the refund goes to your wallet.</p>
        </div>
      ) : null}

      {panel === "review" ? (
        <ReviewForm orderId={orderId} productId={item.productId} busy={busy} onSubmit={submit} />
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ReviewForm({
  orderId,
  productId,
  busy,
  onSubmit,
}: {
  orderId: string;
  productId: string;
  busy: boolean;
  onSubmit: (path: string, body: unknown) => Promise<void>;
}) {
  const [rating, setRating] = useState(5);
  const [fit, setFit] = useState<(typeof FITS)[number][0]>("TRUE_TO_SIZE");
  return (
    <form
      className="mt-3 space-y-3 border border-line p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const num = (k: string) => (form.get(k) ? Number(form.get(k)) : undefined);
        void onSubmit("/api/reviews", {
          orderId,
          productId,
          rating,
          fit,
          body: String(form.get("body") ?? ""),
          heightCm: num("heightCm"),
          weightKg: num("weightKg"),
        });
      }}
    >
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} stars`}
            onClick={() => setRating(n)}
            className={cn("text-lg", n <= rating ? "text-accent" : "text-line")}
          >
            ★
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FITS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFit(value)}
            className={cn(
              "h-9 border px-3",
              fit === value ? "border-ink bg-ink text-bone" : "border-line",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <textarea
        name="body"
        required
        minLength={10}
        rows={3}
        placeholder="How does it fit and feel?"
        className="w-full border border-line bg-paper p-2 text-sm"
      />
      <div className="flex gap-2">
        <input
          name="heightCm"
          type="number"
          placeholder="Your height (cm)"
          className="h-9 w-1/2 border border-line bg-paper px-2"
        />
        <input
          name="weightKg"
          type="number"
          placeholder="Weight (kg)"
          className="h-9 w-1/2 border border-line bg-paper px-2"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="h-10 bg-ink px-4 text-bone disabled:opacity-50"
      >
        Post review
      </button>
    </form>
  );
}
