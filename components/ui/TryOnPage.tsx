"use client";

import { Suspense } from "react";
import type { Gender, Product } from "@/lib/types";
import { TryOn } from "@/components/ui/TryOn";

/** useSearchParams needs a Suspense boundary for the page to stay statically rendered. */
export function TryOnPage({ gender, products }: { gender: Gender; products: Product[] }) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[60dvh] place-items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
        </div>
      }
    >
      <TryOn gender={gender} products={products} />
    </Suspense>
  );
}
