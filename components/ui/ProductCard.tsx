"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isInStock } from "@/lib/catalog";
import { Price } from "@/components/ui/Price";
import { VideoPlayer } from "@/components/ui/VideoPlayer";

/**
 * A product in the grid. On a computer, hovering a card that has a video plays it muted in
 * place of the photo; the video is only fetched once the pointer is over the card, so the grid
 * never downloads videos nobody looks at. On phones the card links to the product page, where
 * the video plays at the top.
 */
export function ProductCard({ product }: { product: Product }) {
  const [colorName, setColorName] = useState(product.colors[0]!.name);
  const [previewing, setPreviewing] = useState(false);
  const color = product.colors.find((option) => option.name === colorName) ?? product.colors[0]!;
  const available = isInStock(product);
  const video = product.video;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-line bg-white transition-shadow hover:shadow-md">
      <Link
        href={`/product/${product.id}`}
        className="relative block aspect-[4/5] overflow-hidden bg-bone-dark"
        onPointerEnter={(event) => {
          if (video && event.pointerType === "mouse") setPreviewing(true);
        }}
        onPointerLeave={() => setPreviewing(false)}
      >
        {color.image ? (
          <Image
            src={color.image}
            alt={`${product.name} in ${color.name}`}
            fill
            unoptimized
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="grid h-full place-items-center text-xs text-ink-faint">No image</span>
        )}

        {video && previewing ? (
          <VideoPlayer
            src={video.url}
            poster={video.poster}
            preview
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}

        {video ? (
          <span
            className={cn(
              "absolute left-2 top-2 flex items-center gap-1 rounded-full bg-ink/75 px-2 py-1 text-[0.625rem] font-medium uppercase tracking-wider text-bone transition-opacity",
              previewing && "opacity-0",
            )}
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3" fill="currentColor">
              <path d="M8 5.5v13l11-6.5-11-6.5Z" />
            </svg>
            Video
          </span>
        ) : null}

        {!available ? (
          <span className="absolute right-2 top-2 rounded-full bg-ink/80 px-2.5 py-1 text-[0.625rem] uppercase tracking-wider text-bone">
            Sold out
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/product/${product.id}`} className="text-sm leading-tight hover:underline">
            {product.name}
          </Link>
          <Price amount={product.price} className="shrink-0 text-sm text-ink-soft" />
        </div>

        <div className="mt-auto flex items-center gap-1.5">
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
                  "h-4 w-4 rounded-full border transition-transform",
                  active ? "scale-110 border-ink" : "border-line hover:scale-110",
                )}
                style={{ backgroundColor: option.hex }}
              />
            );
          })}
        </div>
      </div>
    </article>
  );
}
