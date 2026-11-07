"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { sectionName, type SectionRow } from "@/lib/sections";
import { categoryName, type CategoryRow } from "@/lib/categories";
import { sizeLabel } from "@/lib/adminProduct";
import type { Product } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import {
  adminPost,
  button,
  ErrorNote,
  input,
  Loading,
  PageTitle,
  taka,
  useAdminData,
  useToast,
} from "@/components/admin/ui";

export type AdminProduct = Product & { hasVideo: boolean };

export function ProductsList() {
  const { data, error, reload } = useAdminData<{ products: AdminProduct[] }>("/api/admin/products");
  const { data: catData } = useAdminData<{
    categories: CategoryRow[];
    sections: SectionRow[];
  }>("/api/admin/categories");
  const categories = catData?.categories ?? [];
  const sections = catData?.sections ?? [];
  const [query, setQuery] = useState("");
  /** "all" | "live" | "hidden" | "out" | "section:<id>" */
  const [filter, setFilter] = useState<string>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const { toast, show } = useToast();

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.products ?? []).filter((p) => {
      const total = Object.values(p.stock).reduce((a, b) => a + b, 0);
      if (filter.startsWith("section:") && p.gender !== filter.slice(8)) return false;
      if (filter === "live" && p.hidden) return false;
      if (filter === "hidden" && !p.hidden) return false;
      if (filter === "out" && total > 0) return false;
      return !q || p.name.toLowerCase().includes(q) || p.id.includes(q);
    });
  }, [data, query, filter]);

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Loading />;

  const toggle = async (p: AdminProduct) => {
    setBusy(p.id);
    try {
      await adminPost("/api/admin/products/visibility", { id: p.id, hidden: !p.hidden });
      show(p.hidden ? "Now showing in the shop" : "Hidden from the shop");
      reload();
    } catch (e) {
      show((e as Error).message);
    }
    setBusy(null);
  };

  return (
    <div>
      <PageTitle
        title="Products"
        subtitle={`${data.products.length} product${data.products.length === 1 ? "" : "s"}`}
        action={
          <Link href="/admin/products/new" className={button.gold}>
            + Add product
          </Link>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="Search products…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn(input, "mt-0 sm:max-w-xs")}
        />
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {(
            [
              ["all", "All"],
              ...sections.map((x) => [`section:${x.id}`, x.name]),
              ["live", "In shop"],
              ["hidden", "Hidden"],
              ["out", "Sold out"],
            ] as Array<[string, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "h-10 shrink-0 rounded-full border px-4 text-sm",
                filter === key ? "border-ink bg-ink text-bone" : "border-line bg-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {data.products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
          <p className="text-lg font-semibold">No products yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            Add your first piece — a name, a price, photos and the sizes you have.
          </p>
          <Link href="/admin/products/new" className={cn(button.primary, "mt-5")}>
            Add product
          </Link>
        </div>
      ) : list.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-faint">Nothing matches.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const total = Object.values(p.stock).reduce((a, b) => a + b, 0);
            const image = p.colors.find((c) => c.image)?.image ?? p.images?.[0];
            return (
              <li
                key={p.id}
                className={cn(
                  "flex gap-3 rounded-2xl border border-line bg-white p-3",
                  p.hidden && "opacity-60",
                )}
              >
                <Link
                  href={`/admin/products/${p.id}`}
                  className="relative h-28 w-22 shrink-0 overflow-hidden rounded-xl bg-bone-dark"
                >
                  {image ? (
                    <Image
                      src={image}
                      alt=""
                      fill
                      unoptimized
                      sizes="88px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-xs text-ink-faint">
                      No photo
                    </span>
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link href={`/admin/products/${p.id}`} className="truncate font-medium">
                    {p.name}
                  </Link>
                  <p className="text-xs text-ink-faint">
                    {sectionName(sections, p.gender)} ·{" "}
                    {categoryName(categories, p.category, p.gender)}
                    {p.hasVideo ? " · 🎬 video" : ""}
                  </p>
                  <p className="mt-1 font-medium tabular-nums">{taka(p.price)}</p>
                  <p
                    className={cn(
                      "mt-0.5 text-xs",
                      total === 0
                        ? "text-red-700"
                        : total <= 3
                          ? "text-amber-700"
                          : "text-ink-soft",
                    )}
                  >
                    {total === 0
                      ? "Sold out"
                      : p.sizes.map((s) => `${sizeLabel(s)} ${p.stock[s] ?? 0}`).join(" · ")}
                  </p>
                  <div className="mt-auto flex gap-2 pt-2">
                    <Link
                      href={`/admin/products/${p.id}`}
                      className={cn(button.secondary, "h-9 px-3 text-xs")}
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      disabled={busy === p.id}
                      onClick={() => toggle(p)}
                      className={cn(button.secondary, "h-9 px-3 text-xs")}
                    >
                      {p.hidden ? "Show in shop" : "Hide"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {toast}
    </div>
  );
}
