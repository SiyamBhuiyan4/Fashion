"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Category, Gender, Product } from "@/lib/types";
import { categoryLabels, groupByCategory } from "@/lib/catalog";
import { tryOnParamsSchema } from "@/lib/schemas";
import { cn, formatPrice } from "@/lib/utils";
import { useOutfitStore } from "@/store/outfitStore";
import { useCatalogStore } from "@/store/catalogStore";
import { ProductCard } from "@/components/ui/ProductCard";
import { CategoryTabs } from "@/components/ui/CategoryTabs";
import { SkinToneSelector } from "@/components/ui/SkinToneSelector";
import { PoseButtons } from "@/components/ui/PoseButtons";
import { AddOutfitDialog } from "@/components/ui/AddOutfitDialog";

// The 3D scene is heavy and needs the DOM, so it is loaded only in the browser.
const Scene = dynamic(() => import("@/components/three/Scene").then((m) => m.Scene), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-bone-dark">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
    </div>
  ),
});

export function TryOn({ gender, products }: { gender: Gender; products: Product[] }) {
  const [tab, setTab] = useState<Category | "all">("all");
  const [sizeDialog, setSizeDialog] = useState(false);
  const searchParams = useSearchParams();

  const worn = useOutfitStore((state) => state.worn);
  const wear = useOutfitStore((state) => state.wear);
  const remove = useOutfitStore((state) => state.remove);
  const resetOutfit = useOutfitStore((state) => state.resetOutfit);
  const resetView = useOutfitStore((state) => state.resetView);
  const autoRotate = useOutfitStore((state) => state.autoRotate);
  const setAutoRotate = useOutfitStore((state) => state.setAutoRotate);
  const resetForGender = useOutfitStore((state) => state.resetForGender);
  const get = useCatalogStore((state) => state.get);

  // Anything worn for the other gender is dropped when this page opens.
  useEffect(() => {
    resetForGender(gender);
  }, [gender, resetForGender]);

  // "Try on in 3D" from a product page arrives as ?wear=<id>&color=<name>.
  useEffect(() => {
    const parsed = tryOnParamsSchema.safeParse({
      wear: searchParams.get("wear") ?? undefined,
      color: searchParams.get("color") ?? undefined,
    });
    if (!parsed.success || !parsed.data.wear) return;
    const product = get(parsed.data.wear);
    if (product?.gender === gender) wear(product.id, parsed.data.color);
  }, [searchParams, gender, get, wear]);

  const groups = useMemo(() => groupByCategory(products, gender), [products, gender]);
  const visible = tab === "all" ? groups : groups.filter((group) => group.category === tab);

  const wornItems = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ productId: string; colorName: string; colorHex: string; product: Product }> = [];
    for (const slot of ["top", "bottom", "outerwear", "shoes"] as const) {
      const item = worn[slot];
      if (!item || seen.has(item.productId)) continue;
      const product = get(item.productId);
      if (!product) continue;
      seen.add(item.productId);
      list.push({ ...item, product });
    }
    return list;
  }, [worn, get]);

  const total = wornItems.reduce((sum, item) => sum + item.product.price, 0);

  return (
    <div className="lg:flex lg:min-h-[calc(100dvh-4rem)]">
      {/* ---------------------------------------------------------------- 3D side */}
      <section
        aria-label={`${gender === "men" ? "Male" : "Female"} model`}
        className="relative lg:sticky lg:top-16 lg:h-[calc(100dvh-4rem)] lg:w-1/2"
      >
        <div className="h-[55dvh] w-full lg:h-full">
          <Scene gender={gender} />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3">
          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-bone/90 p-2.5 backdrop-blur-sm">
            <SkinToneSelector gender={gender} />
            <div className="flex flex-wrap items-center gap-2">
              <PoseButtons />
              <button
                type="button"
                onClick={() => setAutoRotate(!autoRotate)}
                aria-pressed={autoRotate}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  autoRotate
                    ? "border-ink bg-ink text-bone"
                    : "border-line bg-white text-ink-soft hover:border-ink",
                )}
              >
                Auto-rotate
              </button>
              <button
                type="button"
                onClick={resetView}
                className="rounded-full border border-line bg-white px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-ink"
              >
                Reset view
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ collection */}
      <section aria-label="Collection" className="lg:w-1/2">
        <div className="sticky top-16 z-20 border-y border-line bg-bone/95 px-4 py-3 backdrop-blur-sm sm:px-6 lg:border-t-0">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="display text-2xl">
              {gender === "men" ? "Men" : "Women"}
              <span className="ml-2 text-sm font-normal text-ink-faint">{products.length} pieces</span>
            </h1>
          </div>
          <div className="mt-3">
            <CategoryTabs
              categories={groups.map((group) => ({
                category: group.category,
                label: group.label,
                count: group.items.length,
              }))}
              active={tab}
              onSelect={setTab}
            />
          </div>
        </div>

        {/* Current outfit */}
        <div className="border-b border-line bg-white/60 px-4 py-3 sm:px-6">
          {wornItems.length === 0 ? (
            <p className="text-sm text-ink-faint">
              Nothing on yet — tap <span className="text-ink">Wear</span> on any piece below.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {wornItems.map((item) => (
                  <span
                    key={item.productId}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1.5 pr-1 text-xs"
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-line"
                      style={{ backgroundColor: item.colorHex }}
                    />
                    <span className="max-w-40 truncate">{item.product.name}</span>
                    <button
                      type="button"
                      onClick={() => remove(item.productId)}
                      aria-label={`Remove ${item.product.name}`}
                      className="grid h-5 w-5 place-items-center rounded-full text-ink-faint hover:bg-bone-dark hover:text-ink"
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4">
                        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink-soft">
                  Outfit total <span className="text-ink">{formatPrice(total)}</span>
                </span>
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={resetOutfit}
                    className="rounded-full border border-line bg-white px-4 py-2 text-xs text-ink-soft transition-colors hover:border-ink"
                  >
                    Reset outfit
                  </button>
                  <button
                    type="button"
                    onClick={() => setSizeDialog(true)}
                    className="rounded-full bg-accent px-4 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90"
                  >
                    Add outfit to cart
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-8 px-4 py-6 sm:px-6">
          {visible.map((group) => (
            <div key={group.category}>
              <h2 className="eyebrow mb-3">{categoryLabels[group.category]}</h2>
              {/* A swipe rail on small screens, a grid from md up. */}
              <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-3">
                {group.items.map((product) => (
                  <ProductCard key={product.id} product={product} compact />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {sizeDialog ? (
        <AddOutfitDialog
          items={wornItems.map(({ productId, colorName, colorHex }) => ({
            productId,
            colorName,
            colorHex,
          }))}
          onClose={() => setSizeDialog(false)}
        />
      ) : null}
    </div>
  );
}
