import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog, getProduct, getProductIds } from "@/lib/products.server";
import { relatedProducts } from "@/lib/catalog";
import { ProductDetail } from "@/components/ui/ProductDetail";
import { ProductCard } from "@/components/ui/ProductCard";

export const revalidate = 300;
/** Any id that is not in the catalogue falls through to the 404 page. */
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getProductIds()).map((id) => ({ id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: "Not found" };
  return { title: product.name, description: product.description.slice(0, 160) };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const related = relatedProducts(await getCatalog(), product, 4);

  return (
    <>
      <ProductDetail product={product} />
      {related.length > 0 ? (
        <section className="mx-auto max-w-6xl border-t border-line px-4 py-10 sm:px-6">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-xl">Wear it with</h2>
            <Link href={`/#${product.gender}`} className="text-sm text-ink-soft hover:text-ink">
              See the fitting room →
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
