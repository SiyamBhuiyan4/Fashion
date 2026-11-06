import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog, getProduct, getProductIds } from "@/lib/products.server";
import { similarProducts } from "@/lib/catalog";
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

  const related = similarProducts(await getCatalog(), product, 8);

  return (
    // A light veil over the blossom background; the info panel has its own paper.
    <div className="bg-bone/45">
      <ProductDetail product={product} />
      {related.length > 0 ? (
        <section className="mx-auto max-w-[90rem] border-t border-line px-4 py-14 sm:px-8 sm:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">You may also like</p>
              <h2 className="display mt-2 text-4xl sm:text-5xl">
                Similar <em className="italic">pieces</em>
              </h2>
            </div>
            <Link href={`/#${product.gender}`} className="link-line pb-1 text-[0.8125rem]">
              See the collection
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
