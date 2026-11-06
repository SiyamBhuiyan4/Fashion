import type { Metadata } from "next";
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

  return <Shop men={men} women={women} />;
}
