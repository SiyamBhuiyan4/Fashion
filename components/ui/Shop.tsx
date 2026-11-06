"use client";

import dynamic from "next/dynamic";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Category, Gender, Product } from "@/lib/types";
import { categoryLabels, groupByCategory } from "@/lib/catalog";
import { cn, formatPrice } from "@/lib/utils";
import { site } from "@/lib/site";
import { useOutfitStore } from "@/store/outfitStore";
import { useCatalogStore } from "@/store/catalogStore";
import { ProductCard } from "@/components/ui/ProductCard";
import { CategoryTabs } from "@/components/ui/CategoryTabs";
import { SkinToneSelector } from "@/components/ui/SkinToneSelector";
import { PoseButtons } from "@/components/ui/PoseButtons";
import { AddOutfitDialog } from "@/components/ui/AddOutfitDialog";
import { TryOnDeepLink } from "@/components/ui/TryOnDeepLink";

// The 3D scene is heavy and needs the DOM, so it is loaded only in the browser.
const Scene = dynamic(() => import("@/components/three/Scene").then((m) => m.Scene), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-bone-dark">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
    </div>
  ),
});

const STEPS = [
  { n: "01", title: "Choose", body: "Men's first, women's as you scroll. Nothing to click." },
  { n: "02", title: "Wear", body: "Tap Wear and the piece lands on the model instantly." },
  { n: "03", title: "Buy", body: "Send the whole look to your cart in one go." },
];

/** What each model wears when the page first opens, so nobody meets them in their base layer. */
const DEFAULT_OUTFIT: Record<Gender, string[]> = {
  men: ["m-tee-essential", "m-slim-jeans", "m-court-sneaker"],
  women: ["w-ribbed-tank", "w-wide-jeans", "w-leather-flat"],
};

const GENDERS: Array<{ gender: Gender; label: string; blurb: string }> = [
  { gender: "men", label: "Men", blurb: "Tailoring, denim and everyday knits." },
  { gender: "women", label: "Women", blurb: "Silk, wool and clean lines." },
];

export function Shop({ men, women }: { men: Product[]; women: Product[] }) {
  const productsByGender = useMemo<Record<Gender, Product[]>>(() => ({ men, women }), [men, women]);
  const [tab, setTab] = useState<Record<Gender, Category | "all">>({ men: "all", women: "all" });
  const [sizeDialog, setSizeDialog] = useState(false);

  const activeGender = useOutfitStore((state) => state.activeGender);
  const setActiveGender = useOutfitStore((state) => state.setActiveGender);
  const worn = useOutfitStore((state) => state.worn);
  const wear = useOutfitStore((state) => state.wear);
  const remove = useOutfitStore((state) => state.remove);
  const resetOutfit = useOutfitStore((state) => state.resetOutfit);
  const resetView = useOutfitStore((state) => state.resetView);
  const autoRotate = useOutfitStore((state) => state.autoRotate);
  const setAutoRotate = useOutfitStore((state) => state.setAutoRotate);
  const get = useCatalogStore((state) => state.get);

  const sections = useRef<Partial<Record<Gender, HTMLElement | null>>>({});

  // Dress both models once, on the first visit of the session. Anything the shopper has already
  // put on is left alone.
  const dressed = useRef(false);
  useEffect(() => {
    if (dressed.current) return;
    dressed.current = true;
    const state = useOutfitStore.getState();
    for (const gender of ["men", "women"] as const) {
      if (Object.keys(state.worn[gender]).length > 0) continue;
      for (const id of DEFAULT_OUTFIT[gender]) state.wear(id);
    }
  }, []);

  /**
   * The model follows the scroll: whichever collection fills the middle of the screen is the one
   * being worn. No tab to press — the women's section simply arrives as you keep scrolling.
   */
  useEffect(() => {
    const elements = Object.entries(sections.current).filter(
      (entry): entry is [Gender, HTMLElement] => Boolean(entry[1]),
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the section covering the most of the viewport band.
        let best: { gender: Gender; ratio: number } | null = null;
        for (const entry of entries) {
          const gender = entry.target.getAttribute("data-gender") as Gender | null;
          if (!gender || !entry.isIntersecting) continue;
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { gender, ratio: entry.intersectionRatio };
          }
        }
        if (best) setActiveGender(best.gender);
      },
      {
        // A band across the middle of the screen decides, so the swap happens at the boundary
        // between the two collections rather than at the very top or bottom of one.
        rootMargin: "-45% 0px -45% 0px",
        threshold: [0, 0.01, 0.25, 0.5, 1],
      },
    );
    for (const [, element] of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [setActiveGender]);

  const wornItems = useCallback(
    (gender: Gender) => {
      const wardrobe = worn[gender];
      const seen = new Set<string>();
      const list: Array<{
        productId: string;
        colorName: string;
        colorHex: string;
        product: Product;
      }> = [];
      for (const slot of ["top", "bottom", "outerwear", "shoes"] as const) {
        const item = wardrobe[slot];
        if (!item || seen.has(item.productId)) continue;
        const product = get(item.productId);
        if (!product) continue;
        seen.add(item.productId);
        list.push({ ...item, product });
      }
      return list;
    },
    [worn, get],
  );

  const activeItems = wornItems(activeGender);
  const total = activeItems.reduce((sum, item) => sum + item.product.price, 0);

  return (
    <div className="lg:flex lg:items-start">
      <Suspense fallback={null}>
        <TryOnDeepLink />
      </Suspense>

      {/* ---------------------------------------------------------------- 3D side */}
      <section
        aria-label="Fitting room"
        className="sticky top-16 z-30 border-b border-line lg:h-[calc(100dvh-4rem)] lg:w-1/2 lg:border-b-0 lg:border-r"
      >
        <div className="h-[46dvh] w-full lg:h-full">
          <Scene gender={activeGender} />
        </div>

        {/* Which model is showing, and the controls for it. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2 sm:p-3">
          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-bone/90 p-2 backdrop-blur-sm sm:p-2.5">
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <span className="display text-sm">
                {activeGender === "men" ? "Men's" : "Women's"} model
              </span>
            </span>
            <SkinToneSelector gender={activeGender} />
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

          {/* Current outfit for the model on screen. */}
          {activeItems.length > 0 ? (
            <div className="pointer-events-auto mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-bone/90 p-2 backdrop-blur-sm">
              {activeItems.map((item) => (
                <span
                  key={item.productId}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1.5 pr-1 text-xs"
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-line"
                    style={{ backgroundColor: item.colorHex }}
                  />
                  <span className="max-w-32 truncate">{item.product.name}</span>
                  <button
                    type="button"
                    onClick={() => remove(item.productId)}
                    aria-label={`Remove ${item.product.name}`}
                    className="grid h-5 w-5 place-items-center rounded-full text-ink-faint hover:bg-bone-dark hover:text-ink"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                    >
                      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                </span>
              ))}
              <span className="ml-auto flex items-center gap-2">
                <span className="text-xs text-ink-soft">{formatPrice(total)}</span>
                <button
                  type="button"
                  onClick={() => resetOutfit(activeGender)}
                  className="rounded-full border border-line bg-white px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-ink"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setSizeDialog(true)}
                  className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                >
                  Add outfit
                </button>
              </span>
            </div>
          ) : null}
        </div>
      </section>

      {/* --------------------------------------------------- one scroll, both collections */}
      <div className="lg:w-1/2">
        {/* A short introduction, so the page opens like a shop rather than a tool. */}
        <header className="border-b border-line px-4 pb-6 pt-8 sm:px-6 sm:pt-10">
          <p className="eyebrow">{site.name} · Fitting room, Dhaka</p>
          <h1 className="display mt-3 text-3xl leading-[1.1] sm:text-4xl">
            See it on a body
            <span className="block text-accent">before you buy it.</span>
          </h1>
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink-soft sm:text-base">
            Every piece on this page can be worn by the model beside you. Turn it, zoom in, change
            the skin tone and play a pose — then decide. Prices in Bangladeshi Taka.
          </p>

          <ol className="mt-6 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="bg-white p-4">
                <span className="eyebrow">{step.n}</span>
                <h2 className="display mt-1 text-base">{step.title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-ink-faint">{step.body}</p>
              </li>
            ))}
          </ol>

          <p className="mt-4 flex items-center gap-2 text-xs text-ink-faint">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />A demo store —
            nothing can be bought and no payment is ever taken.
          </p>
        </header>
        {GENDERS.map(({ gender, label, blurb }, index) => {
          const products = productsByGender[gender];
          const groups = groupByCategory(products, gender);
          const current = tab[gender];
          const visible = current === "all" ? groups : groups.filter((g) => g.category === current);

          return (
            <section
              key={gender}
              id={gender}
              data-gender={gender}
              ref={(element) => {
                sections.current[gender] = element;
              }}
              className="scroll-mt-16"
            >
              <div
                className={cn(
                  "px-4 pb-3 pt-6 sm:px-6",
                  index > 0 && "mt-4 border-t border-line bg-bone-dark/40",
                )}
              >
                <p className="eyebrow">
                  {index === 0 ? "The collection" : "Keep scrolling · the second collection"}
                </p>
                <h2 className="display mt-1 text-3xl">
                  {label}
                  <span className="ml-2 text-sm font-normal text-ink-faint">
                    {products.length} pieces
                  </span>
                </h2>
                <p className="mt-1 text-sm text-ink-soft">{blurb}</p>
                <div className="mt-3">
                  <CategoryTabs
                    categories={groups.map((group) => ({
                      category: group.category,
                      label: group.label,
                      count: group.items.length,
                    }))}
                    active={current}
                    onSelect={(category) => setTab((state) => ({ ...state, [gender]: category }))}
                  />
                </div>
              </div>

              <div className="space-y-8 px-4 py-4 sm:px-6">
                {visible.map((group) => (
                  <div key={group.category}>
                    <h3 className="eyebrow mb-3">{categoryLabels[group.category]}</h3>
                    {/* A swipe rail on small screens, a grid from md up. */}
                    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-3">
                      {group.items.map((product) => (
                        <ProductCard key={product.id} product={product} compact />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {index === 0 ? (
                <p className="flex items-center justify-center gap-2 pb-6 text-xs text-ink-faint">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 animate-bounce"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Keep scrolling for the women&apos;s collection — the model changes with you
                </p>
              ) : null}
            </section>
          );
        })}
      </div>

      {sizeDialog ? (
        <AddOutfitDialog
          items={activeItems.map(({ productId, colorName, colorHex }) => ({
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
