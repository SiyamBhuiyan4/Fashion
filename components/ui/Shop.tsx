"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Category, Gender, Product } from "@/lib/types";
import { categoryLabels, groupByCategory } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";
import { useSectionStore } from "@/store/sectionStore";
import { ProductCard } from "@/components/ui/ProductCard";
import { CategoryTabs } from "@/components/ui/CategoryTabs";

const STEPS = [
  {
    n: "01",
    title: "Watch",
    body: "Every piece is filmed on a real person. Hover a card to play it.",
  },
  { n: "02", title: "Choose", body: "Pick the colour and your size on the product page." },
  { n: "03", title: "Buy", body: "Add it to your cart and check out in one go." },
];

const GENDERS: Array<{ gender: Gender; label: string; blurb: string }> = [
  { gender: "men", label: "Men", blurb: "Tailoring, denim and everyday knits." },
  { gender: "women", label: "Women", blurb: "Silk, wool and clean lines." },
];

export function Shop({ men, women }: { men: Product[]; women: Product[] }) {
  const productsByGender = useMemo<Record<Gender, Product[]>>(() => ({ men, women }), [men, women]);
  const [tab, setTab] = useState<Record<Gender, Category | "all">>({ men: "all", women: "all" });
  const setActive = useSectionStore((state) => state.setActive);
  const sections = useRef<Partial<Record<Gender, HTMLElement | null>>>({});

  // The header highlights whichever collection fills the middle of the screen.
  useEffect(() => {
    const elements = Object.values(sections.current).filter(Boolean) as HTMLElement[];
    if (elements.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const gender = entry.target.getAttribute("data-gender") as Gender | null;
          if (gender && entry.isIntersecting) setActive(gender);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [setActive]);

  const videoCount = men.concat(women).filter((product) => product.video).length;

  return (
    <div className="mx-auto max-w-7xl">
      <header className="border-b border-line px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
        <p className="eyebrow">{site.name} · Dhaka</p>
        <h1 className="display mt-3 max-w-2xl text-3xl leading-[1.1] sm:text-5xl">
          See it move
          <span className="block text-accent">before you buy it.</span>
        </h1>
        <p className="mt-4 max-w-prose text-sm leading-relaxed text-ink-soft sm:text-base">
          {videoCount > 0
            ? "Pieces marked with a play icon have a video, filmed on a real person, so you can see how they fall and move. "
            : ""}
          Prices in Bangladeshi Taka.
        </p>

        <ol className="mt-6 grid max-w-3xl gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.n} className="bg-white p-4">
              <span className="eyebrow">{step.n}</span>
              <h2 className="display mt-1 text-base">{step.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-faint">{step.body}</p>
            </li>
          ))}
        </ol>

        <p className="mt-4 flex items-center gap-2 text-xs text-ink-faint">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />A demo store — nothing
          can be bought and no payment is ever taken.
        </p>
      </header>

      {GENDERS.map(({ gender, label, blurb }, index) => {
        const products = productsByGender[gender];
        const groups = groupByCategory(products, gender).filter((g) => g.items.length > 0);
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
            className={cn("scroll-mt-16", index > 0 && "border-t border-line")}
          >
            <div className="px-4 pb-3 pt-8 sm:px-6">
              <p className="eyebrow">The collection</p>
              <h2 className="display mt-1 text-3xl">
                {label}
                <span className="ml-2 text-sm font-normal text-ink-faint">
                  {products.length} pieces
                </span>
              </h2>
              <p className="mt-1 text-sm text-ink-soft">{blurb}</p>
              <div className="mt-4">
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

            <div className="space-y-10 px-4 pb-10 pt-4 sm:px-6">
              {visible.map((group) => (
                <div key={group.category}>
                  <h3 className="eyebrow mb-3">{categoryLabels[group.category]}</h3>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {group.items.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
