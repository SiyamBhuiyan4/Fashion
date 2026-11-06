"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
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
 * the card is a link to the product page, where the video plays at the top.
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
      className="group relative flex flex-col"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovering(true);
      }}
      onPointerLeave={() => setHovering(false)}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-bone-dark">
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
          {video && hovering ? (
            <VideoPlayer
              src={video.url}
              poster={video.poster}
              preview
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : !video && alternate?.image ? (
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

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
          {video ? (
            <span className="flex items-center gap-1 rounded-full bg-white/85 px-2 py-1 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink backdrop-blur">
              <svg viewBox="0 0 24 24" aria-hidden className="h-2.5 w-2.5" fill="currentColor">
                <path d="M8 5.5v13l11-6.5-11-6.5Z" />
              </svg>
              Video
            </span>
          ) : (
            <span />
          )}
          {!available ? (
            <span className="rounded-full bg-ink/85 px-2 py-1 text-[0.625rem] uppercase tracking-[0.14em] text-bone">
              Sold out
            </span>
          ) : stock.tone === "low" ? (
            <span className="rounded-full bg-accent px-2 py-1 text-[0.625rem] uppercase tracking-[0.14em] text-white">
              {stock.text}
            </span>
          ) : null}
        </div>

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
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5 pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <Link href={`/product/${product.id}`} className="link-line text-[0.8125rem] leading-snug">
            {product.name}
          </Link>
          <Price
            amount={product.price}
            className="shrink-0 text-[0.8125rem] tabular-nums text-ink-soft"
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
                onClick={() => setColorName(option.name)}
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
