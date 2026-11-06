"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchProducts, SEARCH_SUGGESTIONS } from "@/lib/search";
import { cn, formatPrice } from "@/lib/utils";
import { useCatalogStore } from "@/store/catalogStore";
import { useSessionStore } from "@/store/sessionStore";

/** Full-screen search: instant results, typo- and Banglish-tolerant, stock-aware ranking. */
export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const catalog = useCatalogStore((s) => s.catalog);
  const size = useSessionStore((s) => s.me?.user?.profile.defaultSize ?? null);
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => input.current?.focus(), 50);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const hits = useMemo(
    () => searchProducts(catalog, query, { size }).slice(0, 24),
    [catalog, query, size],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-bone/97 backdrop-blur-xl transition-[opacity,visibility] duration-500 ease-out-soft",
        open ? "visible opacity-100" : "invisible opacity-0",
      )}
    >
      <div className="mx-auto flex w-full max-w-[90rem] items-center gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8 sm:pt-8">
        <svg
          viewBox="0 0 24 24"
          aria-hidden
          className="h-6 w-6 shrink-0 text-ink-faint"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l4.5 4.5" strokeLinecap="round" />
        </svg>
        <input
          ref={input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          tabIndex={open ? 0 : -1}
          placeholder="Search — try “kalo shirt”"
          aria-label="Search products"
          enterKeyHint="search"
          autoComplete="off"
          className="display min-w-0 flex-1 bg-transparent py-3 text-[1.75rem] outline-none placeholder:text-ink-faint/70 sm:text-5xl"
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          tabIndex={open ? 0 : -1}
          className="grid h-11 w-11 shrink-0 place-items-center"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="mx-auto w-full max-w-[90rem] flex-1 overflow-y-auto px-4 pb-10 sm:px-8">
        <div className="border-t border-line pt-5">
          {query.trim() === "" ? (
            <div>
              <p className="eyebrow">Try</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SEARCH_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    tabIndex={open ? 0 : -1}
                    onClick={() => setQuery(s)}
                    className="rounded-full border border-line px-4 py-2 text-sm hover:border-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : hits.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Nothing found for “{query}”. Try a simpler word, like “shirt” or “shoes”.
            </p>
          ) : (
            <>
              <p className="text-xs text-ink-faint">
                {hits.length} piece{hits.length === 1 ? "" : "s"}
                {size ? ` · in stock in your size ${size} first` : ""}
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
                {hits.map(({ product, inYourSize, soldOut }) => (
                  <li key={product.id}>
                    <Link
                      href={`/product/${product.id}`}
                      onClick={onClose}
                      tabIndex={open ? 0 : -1}
                      className="group block"
                    >
                      <div
                        className={cn(
                          "relative aspect-[3/4] overflow-hidden bg-bone-dark",
                          soldOut && "opacity-60",
                        )}
                      >
                        {product.colors[0]?.image ? (
                          <Image
                            src={product.colors[0].image}
                            alt=""
                            fill
                            unoptimized
                            sizes="200px"
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : null}
                        {soldOut ? (
                          <span className="absolute left-2 top-2 rounded-full bg-ink/85 px-2 py-1 text-[0.625rem] uppercase tracking-[0.14em] text-bone">
                            Sold out
                          </span>
                        ) : inYourSize ? (
                          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[0.625rem] uppercase tracking-[0.14em] text-success">
                            In your size
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-[0.8125rem]">{product.name}</p>
                      <p className="text-[0.8125rem] text-ink-faint tabular-nums">
                        {formatPrice(product.price)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
