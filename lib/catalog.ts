/**
 * Pure catalog helpers. No I/O, so the same code runs on the server (where the catalog comes
 * from the Telegram database) and in the browser (where it arrives as props).
 */
import {
  categorySchema,
  productIdSchema,
  type Category,
  type Gender,
  type Product,
  type Slot,
} from "@/lib/schemas";

export type Catalog = readonly Product[];

export function findById(catalog: Catalog, id: unknown): Product | undefined {
  const parsed = productIdSchema.safeParse(id);
  if (!parsed.success) return undefined;
  return catalog.find((p) => p.id === parsed.data);
}

export function byGender(catalog: Catalog, gender: Gender): Product[] {
  return catalog.filter((p) => p.gender === gender);
}

export function byCategory(catalog: Catalog, gender: Gender, category: Category): Product[] {
  return catalog.filter((p) => p.gender === gender && p.category === category);
}

export const categoryLabels: Record<Category, string> = {
  tops: "Tops",
  bottoms: "Bottoms",
  outerwear: "Outerwear",
  shoes: "Shoes",
};

export interface CollectionGroup {
  category: Category;
  label: string;
  items: Product[];
}

/** The catalog grouped by category in tab order, for the try-on page. */
export function groupByCategory(catalog: Catalog, gender: Gender): CollectionGroup[] {
  return categorySchema.options.map((category) => ({
    category,
    label: categoryLabels[category],
    items: byCategory(catalog, gender, category),
  }));
}

export function relatedProducts(catalog: Catalog, product: Product, limit = 4): Product[] {
  return catalog
    .filter((p) => p.id !== product.id && p.gender === product.gender)
    .sort((a, b) => {
      const sameCategory =
        Number(b.category === product.category) - Number(a.category === product.category);
      return sameCategory !== 0 ? sameCategory : a.price - b.price;
    })
    .slice(0, limit);
}

/** Which avatar slots a product covers. A dress fills top and bottom at once. */
export function slotsForProduct(product: Product): Slot[] {
  if (product.garment.kind === "dress") return ["top", "bottom"];
  switch (product.category) {
    case "tops":
      return ["top"];
    case "bottoms":
      return ["bottom"];
    case "outerwear":
      return ["outerwear"];
    case "shoes":
      return ["shoes"];
  }
}

export function isInStock(product: Product, size?: string): boolean {
  if (size) return (product.stock[size] ?? 0) > 0;
  return Object.values(product.stock).some((n) => n > 0);
}

export function totalStock(product: Product): number {
  return Object.values(product.stock).reduce((sum, n) => sum + n, 0);
}

/**
 * The size to offer first: the middle of the range if it is in stock (M for apparel, 42 for a
 * men's shoe), otherwise the nearest stocked size to it.
 */
export function defaultSize(product: Product): string {
  const sizes = product.sizes;
  if (sizes.length === 0) return "M";
  const middle = Math.floor((sizes.length - 1) / 2);
  const stocked = (size: string) => (product.stock[size] ?? 0) > 0;
  for (let distance = 0; distance < sizes.length; distance++) {
    const before = sizes[middle - distance];
    const after = sizes[middle + distance];
    if (before && stocked(before)) return before;
    if (after && stocked(after)) return after;
  }
  return sizes[middle] ?? sizes[0]!;
}

/** Resolves a colour name against the product, falling back to its first colour. */
export function resolveColor(product: Product, colorName?: string) {
  const match = product.colors.find((c) => c.name.toLowerCase() === colorName?.toLowerCase());
  return match ?? product.colors[0]!;
}

export function stockLabel(product: Product): { text: string; tone: "in" | "low" | "out" } {
  const total = totalStock(product);
  if (total === 0) return { text: "Sold out", tone: "out" };
  if (total <= 5) return { text: `Only ${total} left`, tone: "low" };
  return { text: "In stock", tone: "in" };
}
