"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn, formatPrice } from "@/lib/utils";
import { api, useSessionStore } from "@/store/sessionStore";

interface OrderRow {
  id: string;
  number: string;
  createdAt: string;
  status: string;
  items: Array<{ name: string; image?: string; size: string; colorName: string; quantity: number }>;
  pricing: { total: number };
  tracking: { current: string; delivered: boolean; delayed: boolean };
}

const TABS = ["Orders", "Notifications", "Wallet", "Profile & fit", "Waitlist"] as const;
type Tab = (typeof TABS)[number];

export function statusLabel(order: {
  status: string;
  tracking?: { current: string; delivered: boolean; delayed: boolean };
}) {
  if (order.status === "PENDING_PAYMENT") return "Awaiting payment";
  if (order.status === "PAYMENT_FAILED_RETRYABLE") return "Payment failed — retry";
  if (order.status === "CANCELLED") return "Cancelled";
  if (order.tracking?.delivered) return "Delivered";
  if (order.tracking?.delayed) return "Delayed";
  return (order.tracking?.current ?? "Confirmed")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

const field =
  "mt-1.5 h-11 w-full border border-line bg-paper px-3 text-sm outline-none transition-colors focus:border-ink";

export function Account() {
  const router = useRouter();
  const me = useSessionStore((s) => s.me);
  const refresh = useSessionStore((s) => s.refresh);
  const [tab, setTab] = useState<Tab>("Orders");
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    if (me && !me.user) router.replace("/login?next=/account");
  }, [me, router]);

  useEffect(() => {
    if (!me?.user) return;
    let cancelled = false;
    fetch("/api/orders", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { orders?: OrderRow[] }) => !cancelled && setOrders(d.orders ?? []))
      .catch(() => !cancelled && setOrders([]));
    return () => {
      cancelled = true;
    };
  }, [me?.user]);

  const openNotifications = () => {
    setTab("Notifications");
    if (me?.unread) void api("/api/notifications/read", {}).then(() => refresh());
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const num = (key: string) => {
      const v = String(form.get(key) ?? "").trim();
      return v === "" ? null : Number(v);
    };
    setSaved("Saving…");
    try {
      await api("/api/account/profile", {
        name: String(form.get("name") ?? "").trim() || undefined,
        heightCm: num("heightCm"),
        weightKg: num("weightKg"),
        chestCm: num("chestCm"),
        waistCm: num("waistCm"),
        footEu: num("footEu"),
        defaultSize: String(form.get("defaultSize") ?? "") || null,
      });
      await refresh();
      setSaved("Saved.");
    } catch (e) {
      setSaved((e as Error).message);
    }
  };

  const logout = async () => {
    await api("/api/auth/logout", {});
    await refresh();
    router.push("/");
  };

  if (!me?.user)
    return <p className="mx-auto max-w-5xl px-4 py-16 text-sm text-ink-faint">Loading…</p>;
  const { user } = me;

  return (
    <div className="mx-auto min-h-[70dvh] max-w-5xl bg-bone/90 px-4 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="display mt-3 text-5xl">Hello, {user.name.split(" ")[0]}</h1>
          <p className="mt-2 text-sm text-ink-soft">{user.email}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="border border-line bg-paper px-3 py-2">
            Wallet{" "}
            <strong className="ml-1 font-medium tabular-nums">
              {formatPrice(me.wallet?.balance ?? 0)}
            </strong>
          </span>
          <button type="button" onClick={logout} className="link-line">
            Sign out
          </button>
        </div>
      </div>

      <div
        role="tablist"
        className="no-scrollbar mt-8 flex gap-1.5 overflow-x-auto border-b border-line pb-3"
      >
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => (t === "Notifications" ? openNotifications() : setTab(t))}
            className={cn(
              "relative shrink-0 rounded-full px-4 py-2 text-[0.8125rem] transition-colors",
              tab === t ? "bg-ink text-bone" : "text-ink-soft hover:bg-ink/5",
            )}
          >
            {t}
            {t === "Notifications" && me.unread ? (
              <span className="ml-1.5 rounded-full bg-accent px-1.5 text-[0.625rem] text-white">
                {me.unread}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "Orders" ? (
          orders === null ? (
            <p className="text-sm text-ink-faint">Loading orders…</p>
          ) : orders.length === 0 ? (
            <p className="text-sm text-ink-soft">
              No orders yet.{" "}
              <Link href="/#women" className="link-line text-ink">
                Start shopping
              </Link>
            </p>
          ) : (
            <ul className="space-y-3">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/account/orders/${o.id}`}
                    className="flex items-center gap-4 border border-line bg-paper p-4 transition-colors hover:border-ink"
                  >
                    <div className="flex -space-x-3">
                      {o.items.slice(0, 3).map((item, i) => (
                        <div
                          key={i}
                          className="relative h-16 w-12 overflow-hidden border-2 border-paper bg-bone-dark"
                        >
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt=""
                              fill
                              unoptimized
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium">{o.number}</p>
                      <p className="text-xs text-ink-faint">
                        {new Date(o.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        · {o.items.reduce((n, i) => n + i.quantity, 0)} pieces
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="tabular-nums">{formatPrice(o.pricing.total)}</p>
                      <p
                        className={cn(
                          "text-xs",
                          o.status === "PAYMENT_FAILED_RETRYABLE" || o.tracking.delayed
                            ? "text-danger"
                            : "text-ink-faint",
                        )}
                      >
                        {statusLabel(o)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === "Notifications" ? (
          (me.notifications ?? []).length === 0 ? (
            <p className="text-sm text-ink-soft">
              Nothing yet. Order updates and back-in-stock alerts appear here.
            </p>
          ) : (
            <ul className="divide-y divide-line border border-line bg-paper">
              {(me.notifications ?? []).map((n) => (
                <li key={n.id} className="p-4 text-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-medium">{n.title}</p>
                    <span className="shrink-0 text-xs text-ink-faint">
                      {new Date(n.createdAt).toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-ink-soft">{n.body}</p>
                  {n.href ? (
                    <Link href={n.href} className="link-line mt-2 inline-block text-xs">
                      Open
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )
        ) : null}

        {tab === "Wallet" ? (
          <div>
            <p className="text-sm text-ink-soft">
              Refunds from returns land here and are used first at checkout. Balance:{" "}
              <strong className="text-ink tabular-nums">
                {formatPrice(me.wallet?.balance ?? 0)}
              </strong>
            </p>
            <ul className="mt-4 divide-y divide-line border border-line bg-paper">
              {(me.wallet?.history ?? []).length === 0 ? (
                <li className="p-4 text-sm text-ink-faint">No transactions yet.</li>
              ) : (
                me.wallet!.history.map((w) => (
                  <li key={w.id} className="flex items-center justify-between p-4 text-sm">
                    <span>
                      {w.reason}
                      <span className="block text-xs text-ink-faint">
                        {new Date(w.at).toLocaleDateString("en-GB")}
                      </span>
                    </span>
                    <span className={cn("tabular-nums", w.amount >= 0 ? "text-success" : "")}>
                      {w.amount >= 0 ? "+" : "−"}
                      {formatPrice(Math.abs(w.amount))}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        ) : null}

        {tab === "Profile & fit" ? (
          <form onSubmit={saveProfile} className="max-w-xl">
            <p className="text-sm text-ink-soft">
              Your measurements power the size suggestion on every product page. All optional.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-[0.8125rem] sm:col-span-2">
                Name
                <input name="name" defaultValue={user.name} className={field} />
              </label>
              {(
                [
                  ["heightCm", "Height (cm)"],
                  ["weightKg", "Weight (kg)"],
                  ["chestCm", "Chest (cm)"],
                  ["waistCm", "Waist (cm)"],
                  ["footEu", "Shoe size (EU)"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="text-[0.8125rem]">
                  {label}
                  <input
                    name={key}
                    type="number"
                    step="0.5"
                    inputMode="decimal"
                    defaultValue={user.profile[key] ?? ""}
                    className={field}
                  />
                </label>
              ))}
              <label className="text-[0.8125rem]">
                Usual size
                <select
                  name="defaultSize"
                  defaultValue={user.profile.defaultSize ?? ""}
                  className={field}
                >
                  <option value="">—</option>
                  {["XS", "S", "M", "L", "XL", "XXL"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <button type="submit" className="mt-6 h-12 bg-ink px-6 text-sm text-bone">
              Save
            </button>
            {saved ? <span className="ml-3 text-sm text-ink-soft">{saved}</span> : null}
          </form>
        ) : null}

        {tab === "Waitlist" ? (
          (me.waitlist ?? []).length === 0 ? (
            <p className="text-sm text-ink-soft">
              You are not waiting on anything. On a product page, tap a sold-out size to be told
              when it is back.
            </p>
          ) : (
            <ul className="divide-y divide-line border border-line bg-paper">
              {me.waitlist!.map((w) => (
                <li key={w.id} className="flex items-center justify-between p-4 text-sm">
                  <Link href={`/product/${w.productId}`} className="link-line">
                    {w.name}
                    {w.size ? ` · ${w.size}` : ""}
                  </Link>
                  <span className="text-xs text-ink-faint">
                    {w.kind === "price" ? "Price drop alert" : "Back-in-stock alert"}
                  </span>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </div>
  );
}
