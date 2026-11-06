import type { Metadata } from "next";
import { getGenderCatalog } from "@/lib/products.server";
import { TryOnPage } from "@/components/ui/TryOnPage";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Women",
  description: "Dress a 3D model in the women's collection and see the fit before you buy.",
};

export default async function WomenPage() {
  const products = await getGenderCatalog("women");
  return <TryOnPage gender="women" products={products} />;
}
