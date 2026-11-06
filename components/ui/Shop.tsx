"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Category, Gender, Product } from "@/lib/types";
import { groupByCategory } from "@/lib/catalog";
import { site } from "@/lib/site";
import { useSectionStore } from "@/store/sectionStore";
import { ProductCard } from "@/components/ui/ProductCard";
import { CategoryTabs } from "@/components/ui/CategoryTabs";
import { Reveal } from "@/components/ui/Reveal";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { Price } from "@/components/ui/Price";

const TICKER = [
  "New season · Autumn / Winter 26",
  "Filmed on real people",
  "Dhaka",
  "Prices in Bangladeshi Taka",
  "A demo store — no payment is ever taken",
];

const GENDERS: Array<{ gender: Gender; label: string; blurb: string }> = [
  { gender: "women", label: "Women", blurb: "Silk, wool and clean lines." },
  { gender: "men", label: "Men", blurb: "Tailoring, denim and everyday knits." },
];

/** Picks a photo for an editorial slot: the named product if it exists, else the first one. */
function photoOf(products: Product[], preferred: string) {
  const product = products.find((p) => p.id === preferred) ?? products[0];
  const image = product?.colors[0]?.image;
  return product && image ? { product, image } : null;
}

export function Shop({ men, women }: { men: Product[]; women: Product[] }) {
  const productsByGender = useMemo<Record<Gender, Product[]>>(() => ({ men, women }), [men, women]);
  const [tab, setTab] = useState<Record<Gender, Category | "all">>({ men: "all", women: "all" });
  const setActive = useSectionStore((state) => state.setActive);
  const sections = useRef<Partial<Record<Gender, HTMLElement | null>>>({});

  // The header underlines whichever collection fills the middle of the screen.
  useEffect(() => {
    const elements = Object.values(sections.current).filter(Boolean) as HTMLElement[];
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

  const all = useMemo(() => [...women, ...men], [women, men]);
  const withVideo = all.filter((product) => product.video);
  const heroVideo = withVideo.find((p) => p.id === "w-trench-coat") ?? withVideo[0];
  const heroLeft = photoOf(women, "w-trench-coat");
  const heroRight = photoOf(men, "m-denim-jacket");
  const tileWomen = photoOf(women, "w-slip-dress");
  const tileMen = photoOf(men, "m-wool-blazer");

  return (
    <div>
      {/* ------------------------------------------------------------------ hero */}
      {/* The cherry tree and its petals (SakuraBackground) play behind this section. */}
      <section className="relative min-h-[100svh] w-full overflow-hidden">
        <div className="relative mx-auto grid min-h-[100svh] max-w-[90rem] items-end gap-10 px-4 pb-16 pt-28 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:pb-10">
          <div>
            <p className="eyebrow animate-fade-up [animation-delay:200ms]">
              {site.name} · Spring blossom edit
            </p>
            <h1 className="display mt-5 animate-fade-up text-[clamp(3.2rem,8.4vw,8rem)] [animation-delay:320ms]">
              Quiet clothes,
              <br />
              <em className="italic text-accent">loud</em> details.
            </h1>
            <p className="mt-6 max-w-md animate-fade-up text-[0.9375rem] leading-relaxed text-ink-soft [animation-delay:420ms]">
              Soft tailoring, washed denim and silk that moves like petals in the wind. Every piece
              shown in its real colour{withVideo.length > 0 ? ", many on video" : ""}.
            </p>
            <div className="mt-9 flex animate-fade-up flex-wrap gap-3 [animation-delay:520ms]">
              <Link
                href="#women"
                className="rounded-full bg-ink px-7 py-3.5 text-sm font-medium text-bone transition-transform duration-300 ease-out-soft hover:scale-[1.03]"
              >
                Shop women
              </Link>
              <Link
                href="#men"
                className="rounded-full border border-ink/25 bg-white/50 px-7 py-3.5 text-sm font-medium backdrop-blur transition-colors duration-300 hover:bg-ink hover:text-bone"
              >
                Shop men
              </Link>
            </div>
          </div>

          {/* Two framed pieces float in front of the blossom (computers only). */}
          <div className="relative mr-[10%] hidden h-[31rem] lg:block">
            {[heroLeft, heroRight].map((slot, i) =>
              slot ? (
                <Link
                  key={slot.product.id}
                  href={`/product/${slot.product.id}`}
                  // A blue butterfly rests on this card's top-right corner (butterflies.ts).
                  data-butterfly-perch={i}
                  className={
                    i === 0
                      ? "group absolute left-0 top-0 w-[52%] -rotate-2 animate-fade-up shadow-2xl shadow-ink/20 [animation-delay:450ms]"
                      : "group absolute bottom-0 right-0 w-[46%] rotate-3 animate-fade-up shadow-2xl shadow-ink/20 [animation-delay:650ms]"
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
                        src={slot.image}
                        alt={slot.product.name}
                        fill
                        priority
                        unoptimized
                        sizes="24vw"
                        className="object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between bg-paper px-3 py-2.5 text-xs">
                    <span>{i === 0 && heroVideo ? heroVideo.name : slot.product.name}</span>
                    <Price
                      amount={i === 0 && heroVideo ? heroVideo.price : slot.product.price}
                      className="tabular-nums text-ink-faint"
                    />
                  </div>
                </Link>
              ) : null,
            )}
          </div>
        </div>

        <a
          href="#ticker"
          aria-label="Scroll down"
          className="absolute bottom-6 left-1/2 hidden h-12 w-12 -translate-x-1/2 place-items-center rounded-full border border-ink/20 bg-white/40 backdrop-blur transition-colors hover:bg-ink hover:text-bone sm:grid"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 animate-bounce"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M12 5v14M6 13l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </section>

      {/* Below the hero a light veil keeps the blossom visible while text stays legible. */}
      <div className="bg-bone/50">
        {/* ---------------------------------------------------------------- ticker */}
        <div
          id="ticker"
          className="overflow-hidden border-y border-line bg-paper/70 py-3.5 backdrop-blur-md"
        >
          <div className="flex w-max animate-marquee gap-12 whitespace-nowrap text-xs uppercase tracking-[0.22em] text-ink-soft">
            {[...TICKER, ...TICKER].map((item, i) => (
              <span key={i} className="flex items-center gap-12">
                {item}
                <span aria-hidden className="h-1 w-1 rounded-full bg-accent" />
              </span>
            ))}
          </div>
        </div>

        {/* -------------------------------------------------------- category tiles */}
        <section className="mx-auto grid max-w-[90rem] gap-3 px-4 py-14 sm:grid-cols-2 sm:px-8 sm:py-20">
          {[
            { slot: tileWomen, href: "#women", label: "Women", count: women.length },
            { slot: tileMen, href: "#men", label: "Men", count: men.length },
          ].map(({ slot, href, label, count }, i) =>
            slot ? (
              <Reveal key={label} delay={i * 120}>
                <Link
                  href={href}
                  className="group relative block aspect-[4/5] overflow-hidden bg-bone-dark sm:aspect-auto sm:h-[78vh] sm:max-h-[54rem]"
                >
                  <Image
                    src={slot.image}
                    alt={`${label}'s collection`}
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover transition-transform duration-[1600ms] ease-out-soft group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6 text-white sm:p-8">
                    <div>
                      <p className="eyebrow text-white/70">{count} pieces</p>
                      <h2 className="display mt-2 text-5xl sm:text-6xl">{label}</h2>
                    </div>
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-ink transition-transform duration-500 ease-out-soft group-hover:translate-x-1 group-hover:-rotate-45">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      >
                        <path
                          d="M5 12h14M13 6l6 6-6 6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </div>
                </Link>
              </Reveal>
            ) : null,
          )}
        </section>

        {/* ------------------------------------------------------------- in motion */}
        {withVideo.length > 0 ? (
          <section
            id="in-motion"
            className="scroll-mt-16 border-y border-line/60 bg-paper/35 py-14 sm:py-20"
          >
            <div className="mx-auto flex max-w-[90rem] items-end justify-between px-4 sm:px-8">
              <Reveal>
                <p className="eyebrow">Filmed on real people</p>
                <h2 className="display mt-3 text-5xl sm:text-6xl">
                  In <em className="italic">motion</em>
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

        {/* ----------------------------------------------------------- collections */}
        {GENDERS.map(({ gender, label, blurb }, sectionIndex) => {
          const products = productsByGender[gender];
          const groups = groupByCategory(products, gender).filter((g) => g.items.length > 0);
          const current = tab[gender];
          const visible =
            current === "all"
              ? products
              : (groups.find((g) => g.category === current)?.items ?? []);

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
              <div className="mx-auto max-w-[90rem] px-4 pt-16 sm:px-8 sm:pt-24">
                <Reveal className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow">
                      Collection {String(sectionIndex + 1).padStart(2, "0")}
                    </p>
                    <h2 className="display mt-3 text-6xl sm:text-7xl">
                      {label}
                      <sup className="ml-2 align-top font-sans text-sm tracking-normal text-ink-faint">
                        {products.length}
                      </sup>
                    </h2>
                    <p className="mt-3 text-sm text-ink-soft">{blurb}</p>
                  </div>
                </Reveal>
              </div>

              {/* Category filter sticks under the header while the collection scrolls by. */}
              <div className="sticky top-16 z-20 mt-6 border-y border-line bg-bone/85 backdrop-blur-xl">
                <div className="mx-auto max-w-[90rem] px-4 py-3 sm:px-8">
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

              <div className="mx-auto grid max-w-[90rem] grid-cols-2 gap-x-3 gap-y-10 px-4 py-10 sm:gap-x-5 sm:px-8 md:grid-cols-3 xl:grid-cols-4">
                {visible.map((product, i) => (
                  <Reveal key={`${current}-${product.id}`} delay={(i % 4) * 70}>
                    <ProductCard product={product} />
                  </Reveal>
                ))}
              </div>

              {sectionIndex === 0 ? <Editorial /> : null}
            </section>
          );
        })}
      </div>
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

/** A quiet editorial pause between the two collections. */
function Editorial() {
  return (
    <div className="border-y border-line bg-ink text-bone">
      <Reveal className="mx-auto flex max-w-[90rem] flex-col items-center px-4 py-20 text-center sm:px-8 sm:py-28">
        <p className="eyebrow text-bone/50">The idea</p>
        <p className="display mt-6 max-w-4xl text-4xl leading-[1.08] sm:text-6xl">
          Made to be <em className="italic">worn</em>, not kept. Pieces marked video are filmed on a
          real person, so you know how they move before they arrive.
        </p>
        <Link
          href="#men"
          className="mt-10 rounded-full border border-bone/40 px-7 py-3.5 text-sm transition-colors duration-300 hover:bg-bone hover:text-ink"
        >
          Continue to men
        </Link>
      </Reveal>
    </div>
  );
}
