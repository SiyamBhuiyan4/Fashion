"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { defaultSize, isInStock, stockLabel } from "@/lib/catalog";
import { cn, formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { VideoPlayer } from "@/components/ui/VideoPlayer";

export function ProductDetail({ product }: { product: Product }) {
  const [colorName, setColorName] = useState(product.colors[0]!.name);
  const [size, setSize] = useState(() => defaultSize(product));
  const [added, setAdded] = useState(false);
  const video = product.video;
  // The video opens the gallery; picking a colour switches to that colour's photo.
  const [showVideo, setShowVideo] = useState(Boolean(video));
  const pickColor = (name: string) => {
    setColorName(name);
    setShowVideo(false);
  };
  const add = useCartStore((state) => state.add);
  const openDrawer = useCartStore((state) => state.openDrawer);

  const color = product.colors.find((option) => option.name === colorName) ?? product.colors[0]!;
  const stock = stockLabel(product);
  const sizeInStock = isInStock(product, size);

  const addToCart = () => {
    add({ productId: product.id, colorName: color.name, size, quantity: 1 });
    setAdded(true);
    openDrawer();
    window.setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:py-12">
      {/* Gallery: the video first (when there is one), then one photo per colourway. Both are
          served from the Telegram channel. */}
      <div className="flex flex-col gap-3">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-white">
          {showVideo && video ? (
            <VideoPlayer
              key={video.url}
              src={video.url}
              poster={video.poster}
              controls
              className="h-full w-full bg-ink object-contain"
            />
          ) : color.image ? (
            <Image
              src={color.image}
              alt={`${product.name} in ${color.name}`}
              fill
              unoptimized
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          ) : (
            <span className="grid h-full place-items-center text-sm text-ink-faint">No image</span>
          )}
        </div>
        <div className="flex gap-2">
          {video ? (
            <button
              type="button"
              onClick={() => setShowVideo(true)}
              aria-label="Play video"
              aria-pressed={showVideo}
              className={cn(
                "relative grid h-20 w-16 place-items-center overflow-hidden rounded-lg border bg-ink transition-colors",
                showVideo ? "border-ink" : "border-line hover:border-ink-faint",
              )}
            >
              {video.poster ? (
                <Image
                  src={video.poster}
                  alt=""
                  fill
                  unoptimized
                  sizes="64px"
                  className="object-cover opacity-70"
                />
              ) : null}
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="relative h-6 w-6 text-bone"
                fill="currentColor"
              >
                <path d="M8 5.5v13l11-6.5-11-6.5Z" />
              </svg>
            </button>
          ) : null}
          {product.colors.map((option) => (
            <button
              key={option.name}
              type="button"
              onClick={() => pickColor(option.name)}
              aria-label={option.name}
              aria-pressed={!showVideo && option.name === color.name}
              className={cn(
                "relative h-20 w-16 overflow-hidden rounded-lg border transition-colors",
                !showVideo && option.name === color.name
                  ? "border-ink"
                  : "border-line hover:border-ink-faint",
              )}
            >
              {option.image ? (
                <Image
                  src={option.image}
                  alt=""
                  fill
                  unoptimized
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <span className="block h-full w-full" style={{ backgroundColor: option.hex }} />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="lg:py-4">
        <nav className="eyebrow" aria-label="Breadcrumb">
          <Link href={`/#${product.gender}`} className="hover:text-ink">
            {product.gender === "men" ? "Men" : "Women"}
          </Link>
          <span className="mx-2">/</span>
          <span>{product.category}</span>
        </nav>

        <h1 className="display mt-3 text-3xl sm:text-4xl">{product.name}</h1>
        <p className="mt-2 text-xl text-ink-soft">{formatPrice(product.price)}</p>

        <p className="mt-5 max-w-prose text-sm leading-relaxed text-ink-soft">
          {product.description}
        </p>

        <div className="mt-6">
          <p className="eyebrow mb-2">
            Colour — <span className="text-ink-soft">{color.name}</span>
          </p>
          <div className="flex gap-2">
            {product.colors.map((option) => (
              <button
                key={option.name}
                type="button"
                title={option.name}
                aria-label={option.name}
                aria-pressed={option.name === color.name}
                onClick={() => pickColor(option.name)}
                className={cn(
                  "h-8 w-8 rounded-full border-2 transition-transform",
                  option.name === color.name
                    ? "scale-110 border-ink"
                    : "border-white hover:scale-110",
                )}
                style={{ backgroundColor: option.hex }}
              />
            ))}
          </div>
        </div>

        <div className="mt-6">
          <p className="eyebrow mb-2">Size</p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((option) => {
              const available = isInStock(product, option);
              return (
                <button
                  key={option}
                  type="button"
                  disabled={!available}
                  onClick={() => setSize(option)}
                  className={cn(
                    "min-w-12 rounded-lg border px-3 py-2 text-sm transition-colors",
                    size === option
                      ? "border-ink bg-ink text-bone"
                      : "border-line bg-white hover:border-ink",
                    available ? "" : "cursor-not-allowed line-through opacity-40",
                  )}
                >
                  {option}
                </button>
              );
            })}
          </div>
          <p
            className={cn(
              "mt-2 text-xs",
              stock.tone === "out"
                ? "text-danger"
                : stock.tone === "low"
                  ? "text-warn"
                  : "text-success",
            )}
          >
            {stock.text}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={addToCart}
            disabled={!sizeInStock}
            className="flex-1 rounded-full bg-ink px-6 py-3 text-sm font-medium text-bone transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {added ? "Added ✓" : sizeInStock ? "Add to cart" : "Sold out"}
          </button>
        </div>
      </div>
    </div>
  );
}
