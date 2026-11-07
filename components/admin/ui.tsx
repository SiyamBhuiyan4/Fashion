"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** GET from the admin API. A signed-out panel goes back to the sign-in page. */
export async function adminFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Signed out");
  }
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

export async function adminPost<T = { ok: true }>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.status === 401) {
    window.location.href = "/admin/login";
    throw new Error("Signed out");
  }
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

/** Loads admin data and reloads it on demand. */
export function useAdminData<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    adminFetch<T>(path)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [path, version]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, error, reload };
}

export const taka = (n: number) => `৳${Math.round(n).toLocaleString("en-US")}`;

export function when(iso: string | undefined, withTime = true) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "numeric", minute: "2-digit", hour12: true } : { year: "numeric" }),
    timeZone: "Asia/Dhaka",
  });
}

export function Card({
  title,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-line bg-white p-4 sm:p-6", className)}>
      {title || action ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? <h2 className="text-base font-semibold">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display text-4xl sm:text-5xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-ink-soft">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export const input =
  "mt-1.5 h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[0.9375rem] outline-none transition-colors placeholder:text-ink-faint focus:border-ink";

export const button = {
  primary:
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-medium text-bone transition-opacity hover:opacity-90 disabled:opacity-40",
  secondary:
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-medium transition-colors hover:border-ink disabled:opacity-40",
  danger:
    "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-40",
  gold: "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40",
};

export function Loading() {
  return <p className="py-16 text-center text-sm text-ink-faint">Loading…</p>;
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
      {message}
    </p>
  );
}

/** A short "Saved" message that disappears on its own. */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);
  const toast = message ? (
    <div
      role="status"
      className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit rounded-full bg-ink px-5 py-3 text-sm text-bone shadow-xl lg:bottom-8"
    >
      {message}
    </div>
  ) : null;
  return { toast, show: setMessage };
}
