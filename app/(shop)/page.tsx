import type { Metadata } from "next";
import { getCatalog } from "@/lib/products.server";
import { site } from "@/lib/site";
import { Shop } from "@/components/ui/Shop";

export const revalidate = 300;

export const metadata: Metadata = {
  title: `${site.name} ${site.subtitle} — ${site.tagline}`,
  description: site.description,
};

export default async function HomePage() {
  return <Shop products={[...(await getCatalog())]} />;
}
