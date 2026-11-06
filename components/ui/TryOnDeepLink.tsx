"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { tryOnParamsSchema } from "@/lib/schemas";
import { useCatalogStore } from "@/store/catalogStore";
import { useOutfitStore } from "@/store/outfitStore";

/**
 * Handles "Try on in 3D" links: /?wear=<id>&color=<name>.
 *
 * It lives in its own component, wrapped in its own Suspense boundary, because reading the
 * search params opts whatever component does it out of static rendering. Keeping it here means
 * the shop itself is still server-rendered, so the collections are on screen before any
 * JavaScript runs.
 */
export function TryOnDeepLink() {
  const searchParams = useSearchParams();
  const applied = useRef(false);

  useEffect(() => {
    if (applied.current) return;
    const parsed = tryOnParamsSchema.safeParse({
      wear: searchParams.get("wear") ?? undefined,
      color: searchParams.get("color") ?? undefined,
    });
    if (!parsed.success || !parsed.data.wear) return;
    const product = useCatalogStore.getState().get(parsed.data.wear);
    if (!product) return;
    applied.current = true;
    useOutfitStore.getState().wear(product.id, parsed.data.color);
    useOutfitStore.getState().setActiveGender(product.gender);
    document.getElementById(product.gender)?.scrollIntoView({ block: "start" });
  }, [searchParams]);

  return null;
}
