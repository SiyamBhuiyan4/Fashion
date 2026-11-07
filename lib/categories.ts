/**
 * Shop categories, made by the owner in the admin panel (/admin/categories): any name, for the
 * Women or the Men section, in the order the owner sets. Stored in the Telegram database (table
 * "categories"); until the owner changes anything the starting list below is used.
 *
 * A product keeps its category's id, so renaming a category never touches its products.
 * Free of server code: the shop and the admin panel both read it.
 */
import { z } from "zod";
import type { Gender } from "@/lib/schemas";

export const categoryIdSchema = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid category id");

export const categoryRowSchema = z.object({
  id: categoryIdSchema,
  name: z.string().trim().min(1, "Write the category name.").max(40, "Keep the name short."),
  gender: z.enum(["women", "men"]),
});
export type CategoryRow = z.infer<typeof categoryRowSchema>;

export const categoryListSchema = z.array(categoryRowSchema).max(80);

export const DEFAULT_CATEGORIES: CategoryRow[] = [
  { id: "saree", name: "Saree", gender: "women" },
  { id: "three-piece", name: "Three-piece", gender: "women" },
  { id: "kurti", name: "Kurti & Co-ords", gender: "women" },
  { id: "modest", name: "Abaya & Hijab", gender: "women" },
  { id: "tops", name: "Tops & Dresses", gender: "women" },
  { id: "bottoms", name: "Pants & Palazzo", gender: "women" },
  { id: "outerwear", name: "Shawl & Outerwear", gender: "women" },
  { id: "shoes", name: "Footwear", gender: "women" },
  { id: "panjabi", name: "Panjabi & Kabli", gender: "men" },
  { id: "tops", name: "Shirts & T-shirts", gender: "men" },
  { id: "bottoms", name: "Pants & Jeans", gender: "men" },
  { id: "outerwear", name: "Koti & Sherwani", gender: "men" },
  { id: "shoes", name: "Footwear", gender: "men" },
];

/** The stored list, or the starting list when the owner has not saved one yet. */
export function parseCategories(rows: unknown): CategoryRow[] {
  if (!Array.isArray(rows)) return DEFAULT_CATEGORIES;
  const out: CategoryRow[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const parsed = categoryRowSchema.safeParse(row);
    if (!parsed.success) continue;
    const key = `${parsed.data.gender}|${parsed.data.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(parsed.data);
  }
  return out;
}

export function categoriesFor(list: readonly CategoryRow[], gender: Gender): CategoryRow[] {
  return list.filter((c) => c.gender === gender);
}

/** A category's name; an id with no category (deleted) is shown in a readable form. */
export function categoryName(list: readonly CategoryRow[], id: string, gender: Gender): string {
  const found = list.find((c) => c.id === id && c.gender === gender);
  if (found) return found.name;
  return id.replace(/-/g, " ").replace(/^\w/, (ch) => ch.toUpperCase());
}

/** A new id for a category name, unique within its section. */
export function newCategoryId(name: string, gender: Gender, list: readonly CategoryRow[]): string {
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30)
      .replace(/-+$/g, "") || "category";
  const taken = new Set(categoriesFor(list, gender).map((c) => c.id));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}
