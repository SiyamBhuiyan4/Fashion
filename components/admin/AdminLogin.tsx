"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminPost, button, ErrorNote, input } from "@/components/admin/ui";

export function AdminLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid min-h-dvh place-items-center bg-bone px-4">
      <form
        className="w-full max-w-sm rounded-3xl border border-line bg-white p-7 shadow-xl shadow-ink/5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await adminPost("/api/admin/login", { password });
            router.replace("/admin");
            router.refresh();
          } catch (err) {
            setError((err as Error).message);
            setBusy(false);
          }
        }}
      >
        <Image
          src="/brand/logo-dark.png"
          alt="Aurevya Ladies Collection"
          width={390}
          height={382}
          priority
          className="mx-auto h-auto w-40"
        />
        <h1 className="mt-6 text-center text-lg font-semibold">Admin panel</h1>
        <p className="mt-1 text-center text-sm text-ink-soft">Sign in to manage the shop.</p>
        {configured ? (
          <>
            <label className="mt-6 block text-sm font-medium">
              Password
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  autoFocus
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${input} pr-16`}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 mt-[3px] -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-ink-soft"
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            <div className="mt-4">
              <ErrorNote message={error} />
            </div>
            <button type="submit" disabled={busy} className={`${button.primary} mt-4 w-full`}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </>
        ) : (
          <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            The admin password is not set up yet. Add <code>ADMIN_PASSWORD</code> (8+ characters) to
            the site&apos;s environment settings, then reload this page.
          </p>
        )}
      </form>
    </div>
  );
}
