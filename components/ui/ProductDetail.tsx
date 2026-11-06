"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Fabric, Product } from "@/lib/types";
import { categoryLabels, defaultSize, isInStock, stockLabel } from "@/lib/catalog";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import {
  DeliveryEstimate,
  SizeAdvisor,
  StockAlerts,
  useLiveStock,
  useReviews,
} from "@/components/ui/ProductExtras";

const CARE: Record<Fabric, string> = {
  khadi: "Handwoven khadi cotton. Hand wash cold, dry in the shade; it softens with every wash.",
  jamdani: "Handwoven Dhakai jamdani. Dry clean only; store folded in muslin, refold now and then.",
  katan: "Pure katan silk. Dry clean only; keep away from perfume and direct sun.",
  lawn: "Fine cotton lawn. Hand wash cold separately the first time; iron on the reverse.",
  georgette: "Soft georgette. Hand wash cold or dry clean; dry flat; low iron.",
  chiffon: "Light chiffon. Hand wash cold, do not wring; cool iron through a cloth.",
  jacquard: "Woven jacquard. Dry clean to keep the weave crisp.",
  velvet: "Velvet. Dry clean only; steam, never iron directly.",
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

type Media = { kind: "video" } | { kind: "photo"; image: string; alt: string; color: string };

export function ProductDetail({ product }: { product: Product }) {
  const [colorName, setColorName] = useState(product.colors[0]!.name);
  const [size, setSize] = useState(() => defaultSize(product));
  const [added, setAdded] = useState(false);
  const [open, setOpen] = useState<string | null>("details");
  const add = useCartStore((state) => state.add);
  const openDrawer = useCartStore((state) => state.openDrawer);

  const color = product.colors.find((option) => option.name === colorName) ?? product.colors[0]!;
  // Live stock (orders and checkout holds included); the catalogue's numbers until it loads.
  const live = useLiveStock(product.id);
  const inStock = (option: string) =>
    live ? (live.sizes[option]?.total ?? 0) > 0 : isInStock(product, option);
  const liveTotal = live ? Object.values(live.sizes).reduce((n, s) => n + s.total, 0) : null;
  const stock =
    liveTotal === null
      ? stockLabel(product)
      : liveTotal === 0
        ? { text: "Sold out", tone: "out" as const }
        : liveTotal <= 5
          ? { text: `Only ${liveTotal} left`, tone: "low" as const }
          : { text: "In stock", tone: "in" as const };
  const sizeInStock = inStock(size);
  const fitLean = useReviews(product.id, "")?.fit.lean ?? 0;
  const video = product.video;

  // The video first, then one photo per colourway, in a fixed order so the arrows and the
  // thumbnails always step through the same sequence.
  const media = useMemo<Media[]>(() => {
    const photos = product.colors
      .filter((c) => c.image)
      .map((c) => ({
        kind: "photo" as const,
        image: c.image!,
        alt: `${product.name} in ${c.name}`,
        color: c.name,
      }));
    return video ? [{ kind: "video" }, ...photos] : photos;
  }, [product, video]);

  const gallery = useRef<HTMLDivElement>(null);
  const [slide, setSlide] = useState(0);
  const goTo = (index: number) => {
    const rail = gallery.current;
    if (!rail) return;
    const target = Math.max(0, Math.min(media.length - 1, index));
    rail.scrollTo({ left: rail.clientWidth * target, behavior: "smooth" });
  };
  const pickColor = (name: string) => {
    setColorName(name);
    // Show the chosen colour's photo.
    const index = media.findIndex((item) => item.kind === "photo" && item.color === name);
    if (index >= 0) goTo(index);
  };

  // Which slide is showing (the rail scrolls by swipe, arrows, thumbnails or keys), and which
  // one it has come to rest on — only that one moves the colour picker, so it does not flicker
  // through every colour the rail passes on the way.
  const [settled, setSettled] = useState(0);
  useEffect(() => {
    const rail = gallery.current;
    if (!rail) return;
    const onScroll = () => {
      const width = Math.max(1, rail.clientWidth);
      const index = Math.round(rail.scrollLeft / width);
      setSlide(index);
      if (Math.abs(rail.scrollLeft - index * width) < 2) setSettled(index);
    };
    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => rail.removeEventListener("scroll", onScroll);
  }, []);

  const resting = media[settled];
  const [synced, setSynced] = useState(0);
  if (synced !== settled) {
    setSynced(settled);
    if (resting?.kind === "photo" && resting.color !== colorName) setColorName(resting.color);
  }

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
      {/* One piece of media at a time: swipe, the arrows, the thumbnails or the arrow keys. */}
      <div
        className="relative lg:sticky lg:top-24 lg:self-start"
        role="region"
        aria-roledescription="carousel"
        aria-label={`${product.name} photos and video`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") goTo(slide + 1);
          if (event.key === "ArrowLeft") goTo(slide - 1);
        }}
      >
        <div className="relative">
          <div ref={gallery} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
            {media.map((item, i) => (
              <div
                key={item.kind === "video" ? "video" : item.image}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${media.length}`}
                className="relative aspect-[3/4] w-full shrink-0 snap-start overflow-hidden bg-bone-dark lg:aspect-auto lg:h-[calc(100svh-8.5rem)]"
              >
                {item.kind === "video" && video ? (
                  <VideoPlayer
                    src={video.url}
                    poster={video.poster}
                    controls
                    className="h-full w-full bg-ink object-cover lg:object-contain"
                  />
                ) : item.kind === "photo" ? (
                  <>
                    {/* Desktop frames are wider than the photos: the whole photo is shown,
                        over a soft blurred copy of itself instead of empty bars. */}
                    <Image
                      src={item.image}
                      alt=""
                      fill
                      unoptimized
                      sizes="55vw"
                      className="hidden scale-110 object-cover opacity-70 blur-2xl lg:block"
                    />
                    <Image
                      src={item.image}
                      alt={item.alt}
                      fill
                      unoptimized
                      priority={i < 2}
                      sizes="(max-width: 1024px) 100vw, 55vw"
                      className="object-cover lg:object-contain"
                    />
                  </>
                ) : null}
              </div>
            ))}
          </div>

          {media.length > 1 ? (
            <>
              {/* Previous / next. */}
              {[
                { dir: -1, label: "Previous", path: "M15 6l-6 6 6 6", side: "left-3" },
                { dir: 1, label: "Next", path: "M9 6l6 6-6 6", side: "right-3" },
              ].map(({ dir, label, path, side }) => {
                const disabled = dir < 0 ? slide === 0 : slide === media.length - 1;
                return (
                  <button
                    key={label}
                    type="button"
                    aria-label={label}
                    disabled={disabled}
                    onClick={() => goTo(slide + dir)}
                    className={cn(
                      "absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink shadow-md backdrop-blur transition-[opacity,transform] duration-300 ease-out-soft hover:scale-105 disabled:pointer-events-none disabled:opacity-0",
                      side,
                    )}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                );
              })}

              <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[0.6875rem] tabular-nums text-ink backdrop-blur">
                {slide + 1} / {media.length}
              </span>

              <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
                {media.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 rounded-full bg-white shadow-sm transition-all duration-500 ease-out-soft",
                      i === slide ? "w-6 opacity-100" : "w-1.5 opacity-60",
                    )}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>

        {/* Thumbnails: jump straight to any photo or the video. */}
        {media.length > 1 ? (
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-4 sm:px-8 lg:px-0">
            {media.map((item, i) => (
              <button
                key={item.kind === "video" ? "video" : item.image}
                type="button"
                onClick={() => goTo(i)}
                aria-label={item.kind === "video" ? "Play video" : item.alt}
                aria-current={i === slide ? "true" : undefined}
                className={cn(
                  "relative h-20 w-16 shrink-0 overflow-hidden bg-bone-dark ring-offset-2 ring-offset-bone transition-[box-shadow,opacity] duration-300",
                  i === slide ? "ring-1 ring-ink" : "opacity-70 hover:opacity-100",
                )}
              >
                {item.kind === "photo" ? (
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    unoptimized
                    sizes="64px"
                    className="object-cover"
                  />
                ) : video?.poster ? (
                  <Image
                    src={video.poster}
                    alt=""
                    fill
                    unoptimized
                    sizes="64px"
                    className="object-cover"
                  />
                ) : null}
                {item.kind === "video" ? (
                  <span className="absolute inset-0 grid place-items-center bg-ink/35 text-white">
                    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="currentColor">
                      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
                    </svg>
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* ------------------------------------------------------------ info panel */}
      <div className="bg-bone/90 px-4 pt-8 sm:px-8 lg:bg-transparent lg:px-0 lg:pt-2">
        <div className="lg:sticky lg:top-24 lg:bg-bone/90 lg:p-7 lg:shadow-sm">
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
                const available = inStock(option);
                const active = size === option;
                return (
                  <button
                    key={option}
                    type="button"
                    // Sold-out sizes stay selectable, to sign up for the back-in-stock alert.
                    title={available ? undefined : "Sold out — tap to be notified"}
                    onClick={() => setSize(option)}
                    aria-pressed={active}
                    className={cn(
                      "h-11 border text-[0.8125rem] transition-[background-color,color,border-color] duration-300",
                      active
                        ? "border-ink bg-ink text-bone"
                        : "border-line bg-paper hover:border-ink",
                      !available && !active && "text-ink-faint line-through",
                      !available && active && "bg-ink/60 line-through",
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            <SizeAdvisor product={product} fitLean={fitLean} onPick={setSize} current={size} />
            <StockAlerts product={product} size={size} soldOut={!sizeInStock} />
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

          <DeliveryEstimate live={live} size={size} />

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
