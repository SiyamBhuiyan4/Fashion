"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api, useSessionStore } from "@/store/sessionStore";

/** Only same-site paths are accepted as the page to return to after signing in. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const refresh = useSessionStore((s) => s.refresh);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await api(`/api/auth/${mode}`, {
        name: form.get("name") ?? undefined,
        email: form.get("email"),
        password: form.get("password"),
      });
      await refresh();
      router.push(next);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const signup = mode === "signup";
  return (
    <div className="mx-auto grid min-h-[70dvh] max-w-md place-items-center bg-bone/90 px-4 py-12">
      <form onSubmit={submit} className="w-full">
        <p className="eyebrow">{signup ? "New here" : "Welcome back"}</p>
        <h1 className="display mt-3 text-5xl">{signup ? "Create account" : "Sign in"}</h1>
        <p className="mt-3 text-sm text-ink-soft">
          {signup
            ? "Your first order gets 10% off automatically."
            : "Sign in to check out, track orders and use your wallet."}
        </p>

        <div className="mt-8 space-y-4">
          {signup ? (
            <label className="block text-[0.8125rem]">
              Name
              <input
                name="name"
                required
                autoComplete="name"
                className="mt-1.5 h-12 w-full border border-line bg-paper px-3 text-sm outline-none transition-colors focus:border-ink"
              />
            </label>
          ) : null}
          <label className="block text-[0.8125rem]">
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1.5 h-12 w-full border border-line bg-paper px-3 text-sm outline-none transition-colors focus:border-ink"
            />
          </label>
          <label className="block text-[0.8125rem]">
            Password
            <input
              name="password"
              type="password"
              required
              minLength={signup ? 8 : 1}
              autoComplete={signup ? "new-password" : "current-password"}
              className="mt-1.5 h-12 w-full border border-line bg-paper px-3 text-sm outline-none transition-colors focus:border-ink"
            />
            {signup ? (
              <span className="mt-1 block text-xs text-ink-faint">At least 8 characters.</span>
            ) : null}
          </label>
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 flex h-13 w-full items-center justify-between bg-ink px-5 text-sm font-medium text-bone transition-colors hover:bg-black disabled:opacity-60"
        >
          <span>
            {busy
              ? signup
                ? "Creating your account…"
                : "Signing in…"
              : signup
                ? "Create account"
                : "Sign in"}
          </span>
          <span aria-hidden>→</span>
        </button>

        <p className="mt-5 text-center text-sm text-ink-soft">
          {signup ? "Already have an account? " : "New to MAISON? "}
          <Link
            href={`/${signup ? "login" : "signup"}?next=${encodeURIComponent(next)}`}
            className="link-line text-ink"
          >
            {signup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </form>
    </div>
  );
}
