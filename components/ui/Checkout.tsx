"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DISTRICT_NAMES } from "@/lib/warehouses";
import { cn, formatPrice } from "@/lib/utils";
import { useHydrated } from "@/lib/useHydrated";
import { useCartStore } from "@/store/cartStore";
import { useCatalogStore } from "@/store/catalogStore";
import { api, useSessionStore } from "@/store/sessionStore";

interface Quote {
  shipments: Array<{
    warehouse: string;
    name: string;
    fee: number;
    days: number;
    eta: string;
    items: number;
  }>;
  pricing: {
    subtotal: number;
    discounts: Array<{ id: string; label: string; amount: number }>;
    shipping: number;
    total: number;
    walletUsed: number;
    payable: number;
    walletBalance: number;
    savings: number;
  };
}

interface Missing {
  name: string;
  size: string;
  wanted: number;
  available: number;
}

const METHODS = [
  { id: "cod", label: "Cash on Delivery", note: "Pay the courier when it arrives" },
  { id: "bkash", label: "bKash", note: "Demo gateway — try success or failure" },
  { id: "nagad", label: "Nagad", note: "Demo gateway — try success or failure" },
] as const;

const field =
  "mt-1.5 h-12 w-full border border-line bg-paper px-3 text-sm outline-none transition-colors focus:border-ink";

/** Minutes and seconds left on the stock hold. */
function useCountdown(until: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    // Tick at once (the hold can arrive seconds after the page opened), then every second.
    const first = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [until]);
  if (!until) return null;
  const left = Math.max(0, Date.parse(until) - now);
  return {
    left,
    text: `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, "0")}`,
  };
}

export function Checkout() {
  const router = useRouter();
  const hydrated = useHydrated();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clear);
  const get = useCatalogStore((s) => s.get);
  const me = useSessionStore((s) => s.me);
  const refresh = useSessionStore((s) => s.refresh);

  const [hold, setHold] = useState<{ id: string; expiresAt: string } | null>(null);
  const [missing, setMissing] = useState<Missing[]>([]);
  const [holdError, setHoldError] = useState<string | null>(null);
  const [districtChoice, setDistrict] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("cod");
  const [useWallet, setUseWallet] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const countdown = useCountdown(hold?.expiresAt ?? null);
  // The district from the last order, until the shopper picks one.
  const district = districtChoice || me?.user?.profile.district || "";

  const lines = useMemo(
    () =>
      items.map(({ productId, colorName, size, quantity }) => ({
        productId,
        colorName,
        size,
        quantity,
      })),
    [items],
  );

  // Signed out → sign in first, then come straight back here.
  useEffect(() => {
    if (me && !me.user) router.replace("/login?next=/checkout");
  }, [me, router]);

  // Hold the bag for 15 minutes as soon as checkout opens.
  const held = useRef(false);
  const takeHold = useCallback(async () => {
    setHoldError(null);
    setMissing([]);
    try {
      const res = await api<{ reservationId: string; expiresAt: string }>("/api/checkout/reserve", {
        lines,
        district: district || undefined,
      });
      setHold({ id: res.reservationId, expiresAt: res.expiresAt });
    } catch (e) {
      const data = (e as { data?: { missing?: Missing[] } }).data;
      if (data?.missing?.length) setMissing(data.missing);
      else setHoldError((e as Error).message);
    }
  }, [lines, district]);
  useEffect(() => {
    if (!hydrated || !me?.user || lines.length === 0 || held.current) return;
    held.current = true;
    void takeHold();
  }, [hydrated, me, lines.length, takeHold]);

  // Re-price whenever the district or the wallet switch changes.
  useEffect(() => {
    if (!district || lines.length === 0 || !me?.user) return;
    let cancelled = false;
    api<Quote>("/api/checkout/quote", { lines, district, useWallet, reservationId: hold?.id })
      .then((q) => !cancelled && setQuote(q))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [district, useWallet, lines, hold?.id, me]);

  const expired = countdown !== null && countdown.left === 0;

  const place = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hold) return;
    const form = new FormData(event.currentTarget);
    setPlacing(true);
    setError(null);
    try {
      const res = await api<{ orderId: string; next: string }>("/api/orders", {
        reservationId: hold.id,
        payment: method,
        useWallet,
        address: {
          name: form.get("name"),
          phone: form.get("phone"),
          district,
          area: form.get("area"),
          line: form.get("line"),
        },
      });
      clearCart();
      void refresh();
      router.push(res.next);
    } catch (e) {
      setError((e as Error).message);
      setPlacing(false);
    }
  };

  if (!hydrated || !me)
    return <p className="mx-auto max-w-5xl px-4 py-16 text-sm text-ink-faint">Loading…</p>;
  if (!me.user) return null;
  if (lines.length === 0) {
    return (
      <div className="mx-auto grid min-h-[60dvh] max-w-md place-items-center bg-bone/90 px-4 text-center">
        <div>
          <h1 className="display text-4xl">Your bag is empty</h1>
          <Link
            href="/#women"
            className="mt-6 inline-flex h-12 items-center bg-ink px-6 text-sm text-bone"
          >
            Start shopping
          </Link>
        </div>
      </div>
    );
  }

  const p = quote?.pricing;
  return (
    <form
      onSubmit={place}
      className="mx-auto grid max-w-6xl gap-10 bg-bone/90 px-4 py-10 sm:px-8 lg:grid-cols-[1fr_24rem]"
    >
      <div>
        <p className="eyebrow">Checkout</p>
        <h1 className="display mt-3 text-5xl">Delivery &amp; payment</h1>

        {/* The stock hold. */}
        <div
          className={cn(
            "mt-6 flex items-center justify-between gap-4 border px-4 py-3 text-sm",
            expired || holdError || missing.length
              ? "border-danger/40 bg-danger/5"
              : "border-line bg-paper",
          )}
        >
          {missing.length > 0 ? (
            <div>
              <p className="font-medium text-danger">
                Some pieces sold out while they were in your bag:
              </p>
              <ul className="mt-1 text-ink-soft">
                {missing.map((m) => (
                  <li key={`${m.name}${m.size}`}>
                    {m.name}, size {m.size} —{" "}
                    {m.available > 0 ? `only ${m.available} left` : "sold out"}
                  </li>
                ))}
              </ul>
              <Link href="/cart" className="link-line mt-2 inline-block text-ink">
                Update your bag
              </Link>
            </div>
          ) : holdError ? (
            <span className="text-danger">{holdError}</span>
          ) : expired ? (
            <>
              <span>Your hold has run out — the pieces may have gone back on sale.</span>
              <button
                type="button"
                onClick={() => void takeHold()}
                className="link-line shrink-0 font-medium"
              >
                Hold again
              </button>
            </>
          ) : hold && countdown ? (
            <>
              <span>Your pieces are held for you — nobody else can buy them.</span>
              <span className="shrink-0 font-medium tabular-nums">{countdown.text}</span>
            </>
          ) : (
            <span className="text-ink-faint">Holding your pieces…</span>
          )}
        </div>

        <fieldset className="mt-8 grid gap-4 sm:grid-cols-2">
          <legend className="display mb-2 text-2xl">Address</legend>
          <label className="text-[0.8125rem]">
            Receiver&apos;s name
            <input
              name="name"
              required
              defaultValue={me.user.name}
              autoComplete="name"
              className={field}
            />
          </label>
          <label className="text-[0.8125rem]">
            Mobile number
            <input
              name="phone"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder="01712345678"
              defaultValue={me.user.profile.phone ?? ""}
              className={field}
            />
          </label>
          <label className="text-[0.8125rem]">
            District
            <select
              required
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className={field}
            >
              <option value="" disabled>
                Choose your district
              </option>
              {DISTRICT_NAMES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[0.8125rem]">
            Area / thana
            <input name="area" required placeholder="e.g. Dhanmondi" className={field} />
          </label>
          <label className="text-[0.8125rem] sm:col-span-2">
            House, road, landmark
            <input
              name="line"
              required
              placeholder="House 12, Road 5, near the mosque"
              autoComplete="street-address"
              className={field}
            />
          </label>
        </fieldset>

        {quote ? (
          <div className="mt-8">
            <h2 className="display text-2xl">Delivery</h2>
            <ul className="mt-3 space-y-2">
              {quote.shipments.map((s) => (
                <li
                  key={s.warehouse}
                  className="flex items-center justify-between border border-line bg-paper px-4 py-3 text-sm"
                >
                  <span>
                    {s.items} piece{s.items === 1 ? "" : "s"} from{" "}
                    <strong className="font-medium">{s.name}</strong>
                    <span className="block text-xs text-ink-faint">
                      Arrives by{" "}
                      {new Date(s.eta).toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}{" "}
                      · {s.days} day{s.days === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="tabular-nums">{formatPrice(s.fee)}</span>
                </li>
              ))}
            </ul>
            {quote.shipments.length > 1 ? (
              <p className="mt-2 text-xs text-ink-faint">
                No single warehouse has every piece, so your order ships from the nearest warehouse
                for each.
              </p>
            ) : null}
          </div>
        ) : null}

        <fieldset className="mt-8">
          <legend className="display mb-3 text-2xl">Payment</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {METHODS.map((m) => (
              <label
                key={m.id}
                className={cn(
                  "cursor-pointer border px-4 py-3 text-sm transition-colors",
                  method === m.id ? "border-ink bg-paper" : "border-line hover:border-ink-faint",
                )}
              >
                <input
                  type="radio"
                  name="method"
                  value={m.id}
                  checked={method === m.id}
                  onChange={() => setMethod(m.id)}
                  className="sr-only"
                />
                <span className="font-medium">{m.label}</span>
                <span className="mt-0.5 block text-xs text-ink-faint">{m.note}</span>
              </label>
            ))}
          </div>
          {p && p.walletBalance > 0 ? (
            <label className="mt-3 flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={useWallet}
                onChange={(e) => setUseWallet(e.target.checked)}
                className="h-4 w-4 accent-ink"
              />
              Use my wallet balance ({formatPrice(p.walletBalance)}) first
            </label>
          ) : null}
        </fieldset>
      </div>

      {/* Summary */}
      <aside className="h-fit border border-line bg-paper p-5 lg:sticky lg:top-24">
        <h2 className="display text-2xl">Your order</h2>
        <ul className="mt-4 space-y-3">
          {items.map((item) => {
            const product = get(item.productId);
            if (!product) return null;
            const color = product.colors.find((c) => c.name === item.colorName);
            return (
              <li
                key={`${item.productId}${item.size}${item.colorName}`}
                className="flex gap-3 text-sm"
              >
                <div className="relative h-16 w-12 shrink-0 overflow-hidden bg-bone-dark">
                  {color?.image ? (
                    <Image
                      src={color.image}
                      alt=""
                      fill
                      unoptimized
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{product.name}</p>
                  <p className="text-xs text-ink-faint">
                    {item.colorName} · {item.size} · ×{item.quantity}
                  </p>
                </div>
                <span className="tabular-nums">{formatPrice(product.price * item.quantity)}</span>
              </li>
            );
          })}
        </ul>

        <dl className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm">
          {p ? (
            <>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="tabular-nums">{formatPrice(p.subtotal)}</dd>
              </div>
              {p.discounts.map((d) => (
                <div key={d.id} className="flex justify-between text-success">
                  <dt>{d.label}</dt>
                  <dd className="tabular-nums">−{formatPrice(d.amount)}</dd>
                </div>
              ))}
              <div className="flex justify-between">
                <dt className="text-ink-soft">Delivery</dt>
                <dd className="tabular-nums">
                  {p.shipping === 0 ? "Free" : formatPrice(p.shipping)}
                </dd>
              </div>
              {p.walletUsed > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Wallet</dt>
                  <dd className="tabular-nums">−{formatPrice(p.walletUsed)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-line pt-2 text-base font-medium">
                <dt>{method === "cod" ? "To pay on delivery" : "To pay now"}</dt>
                <dd className="tabular-nums">{formatPrice(p.payable)}</dd>
              </div>
              {p.savings > 0 ? (
                <p className="pt-1 text-xs text-success">
                  You save {formatPrice(p.savings)} — the best offer is applied for you.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-ink-faint">Choose your district to see delivery and the total.</p>
          )}
        </dl>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!hold || !quote || placing || expired}
          className="mt-5 flex h-13 w-full items-center justify-between bg-ink px-5 text-sm font-medium text-bone transition-colors hover:bg-black disabled:opacity-40"
        >
          <span>
            {placing
              ? "Placing your order…"
              : method === "cod"
                ? "Place order"
                : "Continue to payment"}
          </span>
          <span aria-hidden>→</span>
        </button>
        <p className="mt-2 text-center text-xs text-ink-faint">
          A demo store — no real payment is taken.
        </p>
      </aside>
    </form>
  );
}
