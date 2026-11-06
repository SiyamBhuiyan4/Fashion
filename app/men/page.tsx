import type { Metadata } from "next";
import { getGenderCatalog } from "@/lib/products.server";
import { TryOnPage } from "@/components/ui/TryOnPage";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Men",
  description: "Dress a 3D model in the men's collection and see the fit before you buy.",
};

export default async function MenPage() {
  const products = await getGenderCatalog("men");
  return <TryOnPage gender="men" products={products} />;
}
