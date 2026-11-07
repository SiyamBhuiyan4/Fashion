"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FEATURED_SLOTS } from "@/lib/featured";
import { cn } from "@/lib/utils";
import type { AdminProduct } from "@/components/admin/ProductsList";
import {
  adminPost,
  button,
  Card,
  ErrorNote,
  input,
  Loading,
  PageTitle,
  taka,
  useAdminData,
  useToast,
} from "@/components/admin/ui";

const photo = (p: AdminProduct) => p.colors.find((c) => c.image)?.image ?? p.images?.[0];

/** The two products framed at the top of the home page, and picking new ones. */
export function FeaturedEditor() {
  const { data: products, error } = useAdminData<{ products: AdminProduct[] }>(
    "/api/admin/products",
  );
  const { data: featuredData, reload } = useAdminData<{ featured: string[] }>(
    "/api/admin/featured",
  );
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { toast, show } = useToast();

  const featured = featuredData?.featured ?? [];
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products?.products ?? []).filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [products, query]);

  if (error) return <ErrorNote message={error} />;
  if (!products || !featuredData) return <Loading />;
  const byId = (id: string) => products.products.find((p) => p.id === id);

  const toggle = async (p: AdminProduct, on: boolean) => {
    setBusy(p.id);
    setActionError(null);
    try {
      await adminPost("/api/admin/featured", { id: p.id, on });
      show(on ? "Now shown on top of the home page" : "Taken off the top");
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
    setBusy(null);
  };

  return (
    <div>
      <PageTitle
        title="Show on top"
        subtitle="The two framed pieces (with the butterflies) at the top of the home page."
      />

      <Card title="Now on top">
        <div className="grid grid-cols-2 gap-3 sm:max-w-xl">
          {Array.from({ length: FEATURED_SLOTS }, (_, i) => {
            const p = featured[i] ? byId(featured[i]!) : undefined;
            return (
              <div key={i} className="rounded-xl border border-line p-2">
                <p className="mb-2 text-xs font-medium text-ink-faint">
                  {i === 0 ? "1st (left)" : "2nd (right)"}
                </p>
                {p ? (
                  <>
                    <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-bone-dark">
                      {photo(p) ? (
                        <Image
                          src={photo(p)!}
                          alt=""
                          fill
                          unoptimized
                          sizes="200px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <p className="mt-2 truncate text-sm font-medium">{p.name}</p>
                    <button
                      type="button"
                      disabled={busy === p.id}
                      onClick={() => toggle(p, false)}
                      className={cn(button.secondary, "mt-2 h-9 w-full text-xs")}
                    >
                      Remove from top
                    </button>
                  </>
                ) : (
                  <div className="grid aspect-[3/4] place-items-center rounded-lg border border-dashed border-line px-3 text-center text-xs text-ink-faint">
                    Empty — the newest product is shown here
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-ink-soft">
          Picking a new product moves the 2nd to 1st, puts the new one 2nd and takes the old 1st off
          the top.
        </p>
      </Card>

      <div className="mt-6">
        <ErrorNote message={actionError} />
      </div>

      <Card title="Choose a product" className="mt-6">
        <input
          type="search"
          placeholder="Search products…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn(input, "mt-0 sm:max-w-sm")}
        />
        {products.products.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-faint">
            No products yet.{" "}
            <Link href="/admin/products/new" className="underline">
              Add one
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((p) => {
              const on = featured.includes(p.id);
              return (
                <li
                  key={p.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-2",
                    on ? "border-accent bg-accent/5" : "border-line",
                  )}
                >
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-bone-dark">
                    {photo(p) ? (
                      <Image
                        src={photo(p)!}
                        alt=""
                        fill
                        unoptimized
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-ink-faint">
                      {taka(p.price)}
                      {p.hidden ? " · hidden" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy === p.id || (!on && p.hidden)}
                    title={p.hidden ? "Show the product in the shop first" : undefined}
                    onClick={() => toggle(p, !on)}
                    className={cn(on ? button.secondary : button.gold, "h-9 shrink-0 px-3 text-xs")}
                  >
                    {on ? "Remove" : "★ Show on top"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {toast}
    </div>
  );
}
