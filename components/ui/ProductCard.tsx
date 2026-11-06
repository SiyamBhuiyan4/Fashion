"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isInStock, resolveColor } from "@/lib/catalog";
import { Price } from "@/components/ui/Price";
import { useOutfitStore } from "@/store/outfitStore";

export function ProductCard({ product, compact = false }: { product: Product; compact?: boolean }) {
  const worn = useOutfitStore((state) => state.worn);
  const toggle = useOutfitStore((state) => state.toggle);
  const setColor = useOutfitStore((state) => state.setColor);

  const wornEntry = Object.values(worn).find((item) => item?.productId === product.id);
  const isWorn = Boolean(wornEntry);
  const color = resolveColor(product, wornEntry?.colorName);
  const available = isInStock(product);

  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-white transition-shadow",
        isWorn ? "border-accent shadow-md" : "border-line hover:shadow-md",
        compact ? "w-44 shrink-0 md:w-auto md:shrink" : "",
      )}
    >
      <Link
        href={`/product/${product.id}`}
        className="relative block aspect-[4/5] overflow-hidden bg-bone-dark"
      >
        {color.image ? (
          <Image
            src={color.image}
            alt={`${product.name} in ${color.name}`}
            fill
            unoptimized
            sizes={compact ? "176px" : "(max-width: 1024px) 45vw, 22vw"}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="grid h-full place-items-center text-xs text-ink-faint">No image</span>
        )}
        {isWorn ? (
          <span className="absolute left-2 top-2 rounded-full bg-accent px-2.5 py-1 text-[0.625rem] font-medium uppercase tracking-wider text-white">
            Wearing
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
                  if (isWorn) setColor(product.id, option.name);
                  else toggle(product.id, option.name);
                }}
                className={cn(
                  "h-4 w-4 rounded-full border transition-transform",
                  active ? "scale-110 border-ink" : "border-line hover:scale-110",
                )}
                style={{ backgroundColor: option.hex }}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => toggle(product.id, color.name)}
          className={cn(
            "mt-auto rounded-full px-4 py-2 text-sm font-medium transition-colors",
            isWorn
              ? "border border-accent text-accent hover:bg-accent hover:text-white"
              : "bg-ink text-bone hover:opacity-90",
          )}
        >
          {isWorn ? "Remove" : "Wear"}
        </button>
      </div>
    </article>
  );
}
