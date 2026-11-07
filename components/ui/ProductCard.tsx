"use client";

import Image from "next/image";
import { sizeLabel } from "@/lib/adminProduct";
import Link from "next/link";
import { useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isInStock, stockLabel } from "@/lib/catalog";
import { Price } from "@/components/ui/Price";
import { VideoPlayer } from "@/components/ui/VideoPlayer";
import { useCartStore } from "@/store/cartStore";

/**
 * A product in the grid.
 *
 * On a computer, hovering crossfades to the product's video (fetched only then) or, without one,
 * to the next colourway's photo, and a size row slides up for a one-tap "quick add". On phones
 * the card is a link to the product page, where the video plays at the top, and a sideways swipe
 * on the photo steps through the colourways.
 */
export function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const [colorName, setColorName] = useState(product.colors[0]!.name);
  const [hovering, setHovering] = useState(false);
  // Set once the shopper steps through the colours with the arrows: the hover video and the
  // hover crossfade then stand aside so the chosen photo stays in view.
  const [browsing, setBrowsing] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const add = useCartStore((state) => state.add);
  const openDrawer = useCartStore((state) => state.openDrawer);

  const index = Math.max(
    0,
    product.colors.findIndex((option) => option.name === colorName),
  );
  const color = product.colors[index]!;
  const alternate =
    product.colors.length > 1 ? product.colors[(index + 1) % product.colors.length] : null;
  const available = isInStock(product);
  const stock = stockLabel(product);
  const video = product.video;

  const step = (dir: number) => {
    const count = product.colors.length;
    setColorName(product.colors[(index + dir + count) % count]!.name);
    setBrowsing(true);
  };

  // Touch swipe: a mostly-horizontal drag of 40px or more changes colour instead of opening the
  // product (the browser drops the click after a drag, so the link is left alone).
  const touch = useRef<{ x: number; y: number } | null>(null);

  const quickAdd = (size: string) => {
    add({ productId: product.id, colorName: color.name, size, quantity: 1 });
    setAdded(size);
    window.setTimeout(() => {
      setAdded(null);
      openDrawer();
    }, 450);
  };

  return (
    <article
      className="group relative flex h-full flex-col"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovering(true);
        // Warm up the other colourways, so the arrows switch photos instantly.
        for (const option of product.colors) {
          if (option.image) new window.Image().src = option.image;
        }
      }}
      onPointerLeave={() => {
        setHovering(false);
        setBrowsing(false);
      }}
    >
      <div
        className="relative aspect-[3/4] touch-pan-y overflow-hidden bg-bone-dark"
        onTouchStart={(event) => {
          const point = event.touches[0];
          touch.current = point ? { x: point.clientX, y: point.clientY } : null;
        }}
        onTouchEnd={(event) => {
          const start = touch.current;
          const point = event.changedTouches[0];
          touch.current = null;
          if (!start || !point || product.colors.length < 2) return;
          const dx = point.clientX - start.x;
          const dy = point.clientY - start.y;
          if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
        }}
      >
        <Link
          href={`/product/${product.id}`}
          aria-label={product.name}
          className="absolute inset-0"
        >
          {color.image ? (
            <Image
              src={color.image}
              alt={`${product.name} in ${color.name}`}
              fill
              unoptimized
              priority={priority}
              sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
              className="object-cover transition-transform duration-[1400ms] ease-out-soft group-hover:scale-[1.035]"
            />
          ) : null}

          {/* Hover layer: the video if there is one, otherwise the next colourway. */}
          {video && hovering && !browsing ? (
            <VideoPlayer
              src={video.url}
              poster={video.poster}
              preview
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : !video && !browsing && alternate?.image ? (
            <Image
              src={alternate.image}
              alt=""
              fill
              unoptimized
              sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
              className="object-cover opacity-0 transition-opacity duration-700 ease-out-soft group-hover:opacity-100"
            />
          ) : null}
        </Link>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-1 p-2 sm:p-2.5">
          {video ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/85 px-1.5 py-0.5 text-[0.5625rem] font-medium uppercase tracking-[0.12em] text-ink backdrop-blur sm:px-2 sm:py-1 sm:text-[0.625rem] sm:tracking-[0.14em]">
              <svg viewBox="0 0 24 24" aria-hidden className="h-2.5 w-2.5" fill="currentColor">
                <path d="M8 5.5v13l11-6.5-11-6.5Z" />
              </svg>
              Video
            </span>
          ) : (
            <span />
          )}
          {!available ? (
            <span className="whitespace-nowrap rounded-full bg-ink/85 px-1.5 py-0.5 text-[0.5625rem] uppercase tracking-[0.12em] text-bone sm:px-2 sm:py-1 sm:text-[0.625rem] sm:tracking-[0.14em]">
              Sold out
            </span>
          ) : stock.tone === "low" ? (
            <span className="whitespace-nowrap rounded-full bg-accent px-1.5 py-0.5 text-[0.5625rem] uppercase tracking-[0.12em] text-white sm:px-2 sm:py-1 sm:text-[0.625rem] sm:tracking-[0.14em]">
              {stock.text}
            </span>
          ) : null}
        </div>

        {/* Previous / next colour photo: on hover with a mouse, always shown on touch screens. */}
        {product.colors.length > 1
          ? [
              {
                dir: -1,
                label: "Previous colour",
                path: "M15 6l-6 6 6 6",
                side: "left-1.5 sm:left-2",
              },
              { dir: 1, label: "Next colour", path: "M9 6l6 6-6 6", side: "right-1.5 sm:right-2" },
            ].map(({ dir, label, path, side }) => (
              <button
                key={label}
                type="button"
                aria-label={label}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  step(dir);
                }}
                className={cn(
                  "absolute top-1/2 z-10 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/75 text-ink shadow-sm backdrop-blur transition-[opacity,transform] duration-300 ease-out-soft hover:scale-110 sm:h-9 sm:w-9 sm:bg-white/85",
                  "opacity-80 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100",
                  // A bigger invisible hit area around the small round button.
                  "before:absolute before:-inset-2 before:content-['']",
                  side,
                )}
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d={path} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))
          : null}

        {/* Quick add: slides up on hover (computers only). */}
        {available ? (
          <div className="absolute inset-x-2 bottom-2 hidden translate-y-[calc(100%+0.5rem)] transition-transform duration-500 ease-out-soft group-hover:translate-y-0 [@media(hover:hover)]:block">
            <div className="rounded-sm bg-white/92 p-2 shadow-sm backdrop-blur">
              <p className="mb-1.5 text-center text-[0.625rem] uppercase tracking-[0.18em] text-ink-faint">
                {added ? "Added to bag" : "Quick add"}
              </p>
              <div className="flex flex-wrap justify-center gap-1">
                {product.sizes.map((size) => {
                  const inStock = isInStock(product, size);
                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={!inStock}
                      onClick={() => quickAdd(size)}
                      className={cn(
                        "min-w-9 rounded-sm px-2 py-1.5 text-xs transition-colors",
                        added === size ? "bg-ink text-bone" : "hover:bg-ink hover:text-bone",
                        !inStock &&
                          "cursor-not-allowed text-ink-faint line-through hover:bg-transparent hover:text-ink-faint",
                      )}
                    >
                      {sizeLabel(size)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 bg-bone/85 px-2 pb-2.5 pt-2.5">
        {/* Phones stack the name over the price; wider cards set them side by side. */}
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
          <Link
            href={`/product/${product.id}`}
            className="link-line line-clamp-2 text-[0.8125rem] leading-snug"
          >
            {product.name}
          </Link>
          <Price
            amount={product.price}
            className="shrink-0 text-[0.8125rem] font-medium tabular-nums text-ink sm:font-normal sm:text-ink-soft"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {product.colors.map((option) => {
            const active = option.name === color.name;
            return (
              <button
                key={option.name}
                type="button"
                title={option.name}
                aria-label={`${option.name}${active ? " (selected)" : ""}`}
                aria-pressed={active}
                onClick={() => {
                  setColorName(option.name);
                  setBrowsing(true);
                }}
                className={cn(
                  "h-3.5 w-3.5 rounded-full ring-offset-2 ring-offset-bone transition-[box-shadow,transform] duration-300",
                  active ? "ring-1 ring-ink" : "ring-1 ring-black/10 hover:scale-110",
                )}
                style={{ backgroundColor: option.hex }}
              />
            );
          })}
          <span className="ml-1 text-[0.6875rem] text-ink-faint">
            {product.colors.length} colour{product.colors.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>
    </article>
  );
}
