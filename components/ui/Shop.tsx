"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Category, Product } from "@/lib/types";
import { groupByCategory } from "@/lib/catalog";
import { site } from "@/lib/site";
import { useCatalogStore } from "@/store/catalogStore";
import { ProductCard } from "@/components/ui/ProductCard";
import { CategoryTabs } from "@/components/ui/CategoryTabs";
import { Reveal } from "@/components/ui/Reveal";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { Price } from "@/components/ui/Price";

export function Shop({ products }: { products: Product[] }) {
  const settings = useCatalogStore((s) => s.settings);
  const [tab, setTab] = useState<Category | "all">("all");

  const ticker = useMemo(() => {
    const own = settings.announcement
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
    if (own.length > 0) return own;
    return [
      site.tagline,
      "Order on WhatsApp",
      "Delivery all over Bangladesh",
      settings.address,
      "Prices in Taka (৳)",
    ].filter(Boolean);
  }, [settings]);

  const withVideo = products.filter((product) => product.video);
  const heroVideo = withVideo[0];
  const framed = products.filter((p) => p.colors[0]?.image).slice(0, 2);
  // Newest first: the admin panel stamps every product when it is added.
  const sorted = useMemo(
    () => [...products].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")),
    [products],
  );
  const groups = groupByCategory(sorted, "women")
    .concat(groupByCategory(sorted, "men"))
    .filter((g) => g.items.length > 0);
  const merged = new Map<Category, { category: Category; label: string; items: Product[] }>();
  for (const g of groups) {
    const existing = merged.get(g.category);
    merged.set(g.category, existing ? { ...g, items: [...existing.items, ...g.items] } : g);
  }
  const categories = [...merged.values()];
  const visible = tab === "all" ? sorted : (merged.get(tab)?.items ?? []);

  return (
    <div>
      {/* ------------------------------------------------------------------ hero */}
      <section className="relative w-full overflow-hidden bg-[radial-gradient(ellipse_at_top,var(--color-paper),var(--color-bone)_70%)]">
        <div className="relative mx-auto grid min-h-[92svh] max-w-[90rem] items-center gap-10 px-4 pb-16 pt-28 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-10">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <Image
              src="/brand/logo-dark.png"
              alt={`${site.name} ${site.subtitle} — ${site.tagline}`}
              width={390}
              height={382}
              priority
              className="h-auto w-[min(72vw,20rem)] animate-fade-up [animation-delay:150ms]"
            />
            <p className="mt-8 max-w-md animate-fade-up text-[0.9375rem] leading-relaxed text-ink-soft [animation-delay:320ms]">
              Sarees, three-pieces, kurtis and modest wear, chosen with care in Kamrangir Char and
              delivered to your door anywhere in Bangladesh.
            </p>
            <div className="mt-9 flex animate-fade-up flex-wrap justify-center gap-3 [animation-delay:440ms] lg:justify-start">
              <Link
                href="#shop"
                className="rounded-full bg-ink px-7 py-3.5 text-sm font-medium text-bone transition-transform duration-300 ease-out-soft hover:scale-[1.03]"
              >
                Shop the collection
              </Link>
              {settings.facebook ? (
                <a
                  href={settings.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-accent/50 px-7 py-3.5 text-sm font-medium transition-colors duration-300 hover:bg-ink hover:text-bone"
                >
                  Facebook page
                </a>
              ) : null}
            </div>
          </div>

          {/* Two framed pieces (computers only); the brand photo until products exist. */}
          <div className="relative mr-[8%] hidden h-[31rem] lg:block">
            {framed.length === 0 ? (
              <div className="absolute inset-0 m-auto aspect-square h-full overflow-hidden rounded-full border border-accent/40 shadow-2xl shadow-ink/15">
                <Image
                  src="/brand/aurevya-cover.jpg"
                  alt={`${site.name} ${site.subtitle}`}
                  fill
                  priority
                  sizes="31rem"
                  className="object-cover"
                />
              </div>
            ) : (
              framed.map((product, i) => (
                <Link
                  key={product.id}
                  href={`/product/${product.id}`}
                  className={
                    i === 0
                      ? "group absolute left-0 top-0 w-[52%] -rotate-2 animate-fade-up border border-accent/30 shadow-2xl shadow-ink/20 [animation-delay:450ms]"
                      : "group absolute bottom-0 right-0 w-[46%] rotate-3 animate-fade-up border border-accent/30 shadow-2xl shadow-ink/20 [animation-delay:650ms]"
                  }
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-bone-dark">
                    {heroVideo?.video && i === 0 ? (
                      <VideoPlayer
                        src={heroVideo.video.url}
                        poster={heroVideo.video.poster}
                        preview
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <Image
                        src={product.colors[0]!.image!}
                        alt={product.name}
                        fill
                        priority
                        unoptimized
                        sizes="24vw"
                        className="object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between bg-paper px-3 py-2.5 text-xs">
                    <span>{i === 0 && heroVideo ? heroVideo.name : product.name}</span>
                    <Price
                      amount={i === 0 && heroVideo ? heroVideo.price : product.price}
                      className="tabular-nums text-ink-faint"
                    />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- ticker */}
      <div
        id="ticker"
        className="overflow-hidden border-y border-accent/25 bg-ink py-3.5 text-bone"
      >
        <div className="flex w-max animate-marquee gap-12 whitespace-nowrap text-xs uppercase tracking-[0.22em] text-bone/80">
          {[...ticker, ...ticker, ...ticker, ...ticker].map((item, i) => (
            <span key={i} className="flex items-center gap-12">
              {item}
              <span aria-hidden className="h-1 w-1 rotate-45 bg-accent-soft" />
            </span>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- in motion */}
      {withVideo.length > 0 ? (
        <section
          id="in-motion"
          className="scroll-mt-16 border-b border-line bg-paper/60 py-14 sm:py-20"
        >
          <div className="mx-auto flex max-w-[90rem] items-end justify-between px-4 sm:px-8">
            <Reveal>
              <p className="eyebrow">See it move</p>
              <h2 className="display mt-3 text-5xl sm:text-6xl">
                On <em className="italic">video</em>
              </h2>
            </Reveal>
            <p className="hidden max-w-xs text-sm text-ink-soft sm:block">
              See how it falls, folds and moves before it arrives.
            </p>
          </div>
          <div className="no-scrollbar mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:px-8">
            {withVideo.map((product) => (
              <MotionCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ collection */}
      <section id="shop" className="scroll-mt-16">
        <div className="mx-auto max-w-[90rem] px-4 pt-16 text-center sm:px-8 sm:pt-24">
          <Reveal>
            <p className="eyebrow">{site.subtitle}</p>
            <h2 className="display mt-3 text-6xl sm:text-7xl">
              The <em className="italic">collection</em>
              {products.length > 0 ? (
                <sup className="ml-2 align-top font-sans text-sm tracking-normal text-ink-faint">
                  {products.length}
                </sup>
              ) : null}
            </h2>
            <p className="gold-rule mx-auto mt-5 max-w-xs text-xs uppercase tracking-[0.2em]">
              {site.tagline}
            </p>
          </Reveal>
        </div>

        {products.length === 0 ? (
          <div className="mx-auto max-w-md px-4 py-20 text-center">
            <p className="display text-3xl">New pieces are on their way.</p>
            <p className="mt-3 text-sm text-ink-soft">
              Our collection is being photographed right now.
              {settings.facebook ? " Follow us on Facebook to see them first." : ""}
            </p>
          </div>
        ) : (
          <>
            {categories.length > 1 ? (
              <div className="sticky top-16 z-20 mt-8 border-y border-line bg-bone/85 backdrop-blur-xl">
                <div className="mx-auto max-w-[90rem] px-4 py-3 sm:px-8">
                  <CategoryTabs
                    categories={categories.map((group) => ({
                      category: group.category,
                      label: group.label,
                      count: group.items.length,
                    }))}
                    active={tab}
                    onSelect={setTab}
                  />
                </div>
              </div>
            ) : null}

            <div className="mx-auto grid max-w-[90rem] grid-cols-2 gap-x-3 gap-y-10 px-4 py-10 sm:gap-x-5 sm:px-8 md:grid-cols-3 xl:grid-cols-4">
              {visible.map((product, i) => (
                <Reveal key={`${tab}-${product.id}`} delay={(i % 4) * 70} className="h-full">
                  <ProductCard product={product} />
                </Reveal>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/** A tall video card in the "In motion" rail; the video only loads once it scrolls into view. */
function MotionCard({ product }: { product: Product }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(Boolean(entry?.isIntersecting)),
      {
        rootMargin: "0px 200px",
      },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const video = product.video!;

  return (
    <Link
      ref={ref}
      href={`/product/${product.id}`}
      className="group relative aspect-[9/14] w-[68vw] shrink-0 snap-start overflow-hidden bg-ink sm:w-[22rem]"
    >
      {visible ? (
        <VideoPlayer
          src={video.url}
          poster={video.poster}
          preview
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-[1.03]"
        />
      ) : video.poster ? (
        <Image src={video.poster} alt="" fill unoptimized sizes="22rem" className="object-cover" />
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white">
        <span className="text-sm">{product.name}</span>
        <Price amount={product.price} className="text-sm tabular-nums text-white/80" />
      </div>
    </Link>
  );
}
