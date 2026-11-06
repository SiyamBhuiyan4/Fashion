"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Fabric, Product } from "@/lib/types";
import { categoryLabels, defaultSize, isInStock, stockLabel } from "@/lib/catalog";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { VideoPlayer } from "@/components/ui/VideoPlayer";

const CARE: Record<Fabric, string> = {
  cotton: "100% cotton. Machine wash cold with like colours, tumble dry low, warm iron.",
  denim: "Rigid cotton denim. Wash inside out, cold, and rarely; hang to dry.",
  knit: "Soft knit. Hand wash cold or dry clean; dry flat to keep its shape.",
  linen: "Pure linen. Machine wash cold, line dry; it softens with every wash.",
  silk: "Silk. Dry clean, or hand wash cold with a gentle detergent; iron on the reverse.",
  wool: "Wool. Dry clean. Brush and air between wears instead of washing.",
  leather: "Leather. Wipe clean with a damp cloth; condition now and then; keep from heat.",
  suede: "Suede. Brush to lift the nap; protect with a suede spray; avoid rain.",
  canvas: "Cotton canvas. Machine wash cold, line dry.",
  nylon: "Technical nylon. Machine wash cold, no fabric softener, hang to dry.",
};

type Media = { kind: "video" } | { kind: "photo"; image: string; alt: string };

export function ProductDetail({ product }: { product: Product }) {
  const [colorName, setColorName] = useState(product.colors[0]!.name);
  const [size, setSize] = useState(() => defaultSize(product));
  const [added, setAdded] = useState(false);
  const [open, setOpen] = useState<string | null>("details");
  const add = useCartStore((state) => state.add);
  const openDrawer = useCartStore((state) => state.openDrawer);

  const color = product.colors.find((option) => option.name === colorName) ?? product.colors[0]!;
  const stock = stockLabel(product);
  const sizeInStock = isInStock(product, size);
  const video = product.video;

  // The video first, then the selected colour's photo, then the other colourways.
  const media = useMemo<Media[]>(() => {
    const photos = [color, ...product.colors.filter((c) => c.name !== color.name)]
      .filter((c) => c.image)
      .map((c) => ({
        kind: "photo" as const,
        image: c.image!,
        alt: `${product.name} in ${c.name}`,
      }));
    return video ? [{ kind: "video" }, ...photos] : photos;
  }, [color, product, video]);

  const gallery = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const pickColor = (name: string) => {
    setColorName(name);
    // Bring the newly chosen colour into view: on phones the carousel, on desktop the page.
    const target = video ? 1 : 0;
    const rail = gallery.current;
    if (rail && rail.scrollWidth > rail.clientWidth) {
      rail.scrollTo({ left: rail.clientWidth * target, behavior: "smooth" });
    }
  };

  // Which slide the phone carousel is on, for the counter.
  useEffect(() => {
    const rail = gallery.current;
    if (!rail) return;
    const onScroll = () => setSlide(Math.round(rail.scrollLeft / Math.max(1, rail.clientWidth)));
    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => rail.removeEventListener("scroll", onScroll);
  }, []);

  const addToCart = () => {
    if (!sizeInStock) return;
    add({ productId: product.id, colorName: color.name, size, quantity: 1 });
    setAdded(true);
    window.setTimeout(() => {
      setAdded(false);
      openDrawer();
    }, 650);
  };

  const sections = [
    { id: "details", title: "Details", body: product.description },
    { id: "fabric", title: "Fabric & care", body: CARE[product.garment.fabric] },
    {
      id: "delivery",
      title: "Delivery & returns",
      body: "This is a demo store: nothing is shipped and no payment is ever taken. In a live store, delivery times and the returns window would be listed here.",
    },
  ];

  return (
    <div className="mx-auto max-w-[90rem] pb-28 lg:grid lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,1fr)] lg:gap-12 lg:px-8 lg:pb-16 lg:pt-6">
      {/* ---------------------------------------------------------------- gallery */}
      <div className="relative">
        <div
          ref={gallery}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto lg:grid lg:grid-cols-2 lg:gap-2 lg:overflow-visible"
        >
          {media.map((item, i) => (
            <div
              key={item.kind === "video" ? "video" : item.image}
              className={cn(
                "relative aspect-[3/4] w-full shrink-0 snap-start overflow-hidden bg-bone-dark",
                // The first piece of media runs full width; so does a last one left on its own.
                (i === 0 || (i === media.length - 1 && i % 2 === 1)) &&
                  "lg:col-span-2 lg:aspect-[4/5]",
              )}
            >
              {item.kind === "video" && video ? (
                <VideoPlayer
                  src={video.url}
                  poster={video.poster}
                  controls
                  className="h-full w-full bg-ink object-cover"
                />
              ) : item.kind === "photo" ? (
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  unoptimized
                  priority={i < 2}
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="animate-[fade-up_0.8s_var(--ease-out-soft)_both] object-cover"
                />
              ) : null}
            </div>
          ))}
        </div>
        {/* Phone carousel position. */}
        {media.length > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5 lg:hidden">
            {media.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 rounded-full bg-white transition-all duration-500 ease-out-soft",
                  i === slide ? "w-6 opacity-100" : "w-1.5 opacity-60",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* ------------------------------------------------------------ info panel */}
      <div className="px-4 pt-8 sm:px-8 lg:px-0 lg:pt-2">
        <div className="lg:sticky lg:top-24">
          <nav className="eyebrow flex items-center gap-2" aria-label="Breadcrumb">
            <Link href={`/#${product.gender}`} className="link-line hover:text-ink">
              {product.gender === "men" ? "Men" : "Women"}
            </Link>
            <span aria-hidden>/</span>
            <span>{categoryLabels[product.category]}</span>
          </nav>

          <h1 className="display mt-4 text-5xl leading-[0.95] sm:text-6xl">{product.name}</h1>
          <p className="mt-4 text-lg tabular-nums" suppressHydrationWarning>
            {formatPrice(product.price)}
          </p>

          <div className="mt-8">
            <p className="text-[0.8125rem]">
              Colour <span className="text-ink-faint">— {color.name}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {product.colors.map((option) => {
                const active = option.name === color.name;
                return (
                  <button
                    key={option.name}
                    type="button"
                    title={option.name}
                    aria-label={option.name}
                    aria-pressed={active}
                    onClick={() => pickColor(option.name)}
                    className={cn(
                      "relative h-14 w-11 overflow-hidden ring-offset-2 ring-offset-bone transition-[box-shadow] duration-300",
                      active ? "ring-1 ring-ink" : "ring-1 ring-transparent hover:ring-line",
                    )}
                  >
                    {option.image ? (
                      <Image
                        src={option.image}
                        alt=""
                        fill
                        unoptimized
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      <span
                        className="block h-full w-full"
                        style={{ backgroundColor: option.hex }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8">
            <div className="flex items-baseline justify-between text-[0.8125rem]">
              <p>Size</p>
              <p
                className={cn(
                  "text-xs",
                  stock.tone === "out"
                    ? "text-danger"
                    : stock.tone === "low"
                      ? "text-accent"
                      : "text-success",
                )}
              >
                {stock.text}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {product.sizes.map((option) => {
                const available = isInStock(product, option);
                const active = size === option;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={!available}
                    onClick={() => setSize(option)}
                    aria-pressed={active}
                    className={cn(
                      "h-11 border text-[0.8125rem] transition-[background-color,color,border-color] duration-300",
                      active
                        ? "border-ink bg-ink text-bone"
                        : "border-line bg-paper hover:border-ink",
                      !available &&
                        "cursor-not-allowed text-ink-faint line-through hover:border-line",
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={addToCart}
            disabled={!sizeInStock}
            className="group mt-8 hidden h-14 w-full items-center justify-between bg-ink px-6 text-sm font-medium text-bone transition-colors duration-300 hover:bg-black disabled:opacity-40 lg:flex"
          >
            <span>
              {added ? "Added to bag" : sizeInStock ? `Add to bag — ${size}` : "Sold out"}
            </span>
            <span className="transition-transform duration-500 ease-out-soft group-hover:translate-x-1">
              {added ? "✓" : "→"}
            </span>
          </button>

          <div className="mt-8 border-t border-line">
            {sections.map((section) => {
              const expanded = open === section.id;
              return (
                <div key={section.id} className="border-b border-line">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : section.id)}
                    className="flex w-full items-center justify-between py-4 text-left text-[0.8125rem]"
                  >
                    {section.title}
                    <span
                      aria-hidden
                      className={cn(
                        "text-lg leading-none transition-transform duration-500 ease-out-soft",
                        expanded && "rotate-45",
                      )}
                    >
                      +
                    </span>
                  </button>
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-500 ease-out-soft",
                      expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <p className="overflow-hidden pr-6 text-sm leading-relaxed text-ink-soft">
                      <span className="block pb-5">{section.body}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Phones: the price and the button stay within thumb's reach. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bone/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={addToCart}
          disabled={!sizeInStock}
          className="flex h-13 w-full items-center justify-between bg-ink px-5 text-sm font-medium text-bone disabled:opacity-40"
        >
          <span>
            {added ? "Added to bag ✓" : sizeInStock ? `Add to bag — ${size}` : "Sold out"}
          </span>
          <span className="tabular-nums" suppressHydrationWarning>
            {formatPrice(product.price)}
          </span>
        </button>
      </div>
    </div>
  );
}
