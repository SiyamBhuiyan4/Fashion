import type { Metadata } from "next";
import { Suspense } from "react";
import { getGenderCatalog } from "@/lib/products.server";
import { site } from "@/lib/site";
import { Shop } from "@/components/ui/Shop";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `${site.name} — ${site.tagline}`,
  description: site.description,
};

export default async function HomePage() {
  const [men, women] = await Promise.all([getGenderCatalog("men"), getGenderCatalog("women")]);

  return (
    <Suspense
      fallback={
        <div className="grid min-h-[70dvh] place-items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
        </div>
      }
    >
      <Shop men={men} women={women} />
    </Suspense>
  );
}
