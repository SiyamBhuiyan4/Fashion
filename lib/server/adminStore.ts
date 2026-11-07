/**
 * What the admin panel changes: products, their stock and the shop settings. Each change runs
 * under the database's write lock (lib/db/telegramStore.ts), then the shop's pages are refreshed
 * so customers see it on their next visit.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { loadSnapshot, withWriteLock, type Snapshot } from "@/lib/db/telegramStore";
import type { AdminProductInput } from "@/lib/adminProduct";
import { productSchema, type Product } from "@/lib/schemas";
import { parseSettings, settingsSchema, type Settings } from "@/lib/settings";
import {
  categoryListSchema,
  categoryName,
  parseCategories,
  type CategoryRow,
} from "@/lib/categories";
import { parseSections, sectionListSchema, sectionName, type SectionRow } from "@/lib/sections";
import { Db, TABLE_NAMES, UserError, nowIso, tablesOf, type InventoryRow } from "@/lib/server/db";
import { sendEmail } from "@/lib/server/email";
import { resetCatalogCache, VIDEOS_TABLE } from "@/lib/products.server";
import { parseFeatured, withFeatured } from "@/lib/featured";

/** Every product row that passes the schema, hidden ones included. */
export function productsOf(snapshot: Snapshot): Product[] {
  const rows = snapshot.tables.products;
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    const parsed = productSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function loadAdmin() {
  const { snapshot, version } = await loadSnapshot();
  return {
    snapshot,
    version,
    products: productsOf(snapshot),
    settings: parseSettings(snapshot.tables.settings),
    categories: parseCategories(snapshot.tables.categories),
    sections: parseSections(snapshot.tables.sections),
    featured: parseFeatured(snapshot.tables.featured),
    db: new Db(
      tablesOf(snapshot),
      productsOf(snapshot).filter((p) => !p.hidden),
      parseSettings(snapshot.tables.settings),
    ),
  };
}

function refreshShop() {
  resetCatalogCache();
  revalidatePath("/", "layout");
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

function newProductId(name: string, section: string, taken: Set<string>): string {
  for (;;) {
    const suffix = randomBytes(3).toString("hex").slice(0, 4);
    const base = slug(name);
    const prefix = section.slice(0, 12).replace(/-+$/, "");
    const id = base ? `${prefix}-${base}-${suffix}` : `${prefix}-piece-${suffix}`;
    if (!taken.has(id)) return id;
  }
}

/** Runs waitlist alerts against the new catalogue and keeps the tables it touched. */
function afterCatalogChange(snapshot: Snapshot, outbox: Db["outbox"]) {
  const db = new Db(
    tablesOf(snapshot),
    productsOf(snapshot).filter((p) => !p.hidden),
    parseSettings(snapshot.tables.settings),
  );
  db.processWaitlist();
  for (const name of TABLE_NAMES) snapshot.tables[name] = db.t[name];
  outbox.push(...db.outbox);
}

export async function saveProduct(input: AdminProductInput): Promise<Product> {
  let saved: Product | null = null;
  const outbox: Db["outbox"] = [];
  await withWriteLock((snapshot) => {
    const rows = Array.isArray(snapshot.tables.products)
      ? (snapshot.tables.products as Array<Record<string, unknown>>)
      : [];
    const index = input.id ? rows.findIndex((row) => row.id === input.id) : -1;
    if (input.id && index === -1) throw new UserError("This product no longer exists.", 404);
    const existing = index >= 0 ? productSchema.safeParse(rows[index]) : null;
    const previous = existing?.success ? existing.data : undefined;

    const id =
      input.id ?? newProductId(input.name, input.gender, new Set(rows.map((r) => String(r.id))));
    const sizes = [...new Set(input.sizes)];
    const names = new Set<string>();
    for (const color of input.colors) {
      const key = color.name.trim().toLowerCase();
      if (names.has(key)) throw new UserError(`The colour "${color.name}" is listed twice.`);
      names.add(key);
    }
    const colorImages = input.colors.flatMap((c) => (c.image ? [c.image] : []));
    const now = nowIso();
    const product = productSchema.parse({
      id,
      name: input.name,
      gender: input.gender,
      category: input.category,
      price: input.price,
      description: input.description,
      colors: input.colors.map((c) => ({ ...c, name: c.name.trim() })),
      sizes,
      stock: Object.fromEntries(sizes.map((size) => [size, input.stock[size] ?? 0])),
      garment: {
        ...(previous?.garment ?? { fit: "regular" }),
        kind: input.kind,
        fabric: input.fabric,
      },
      images: [...new Set([...colorImages, ...input.images])].slice(0, 12),
      tags: input.tags.length > 0 ? input.tags : undefined,
      hidden: input.hidden || undefined,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    });
    if (index >= 0) rows[index] = product;
    else rows.push(product);
    snapshot.tables.products = rows;

    // The stock typed in the form is what is on the shelf now.
    const inventory = (
      Array.isArray(snapshot.tables.inventory) ? snapshot.tables.inventory : []
    ) as InventoryRow[];
    snapshot.tables.inventory = [
      ...inventory.filter((row) => row.productId !== id),
      ...sizes.map((size) => ({
        productId: id,
        size,
        warehouse: "dhaka" as const,
        units: input.stock[size] ?? 0,
      })),
    ];
    afterCatalogChange(snapshot, outbox);
    saved = product;
    return true;
  });
  await Promise.allSettled(outbox.map((mail) => sendEmail(mail)));
  refreshShop();
  return saved!;
}

/** Quick show / hide from the product list. */
export async function setProductHidden(id: string, hidden: boolean) {
  await withWriteLock((snapshot) => {
    const rows = (snapshot.tables.products ?? []) as Array<Record<string, unknown>>;
    const row = rows.find((r) => r.id === id);
    if (!row) throw new UserError("This product no longer exists.", 404);
    if (hidden) row.hidden = true;
    else delete row.hidden;
    row.updatedAt = nowIso();
    return true;
  });
  refreshShop();
}

/** Removes a product, its stock rows, waitlist entries and video. Past orders keep their copy. */
export async function deleteProduct(id: string) {
  await withWriteLock((snapshot) => {
    const rows = (snapshot.tables.products ?? []) as Array<{ id?: string }>;
    if (!rows.some((r) => r.id === id)) throw new UserError("This product no longer exists.", 404);
    snapshot.tables.products = rows.filter((r) => r.id !== id);
    snapshot.tables.featured = withFeatured(parseFeatured(snapshot.tables.featured), id, false);
    for (const table of ["inventory", "waitlist", VIDEOS_TABLE]) {
      const list = snapshot.tables[table];
      if (Array.isArray(list)) {
        snapshot.tables[table] = list.filter((r) => (r as { productId?: string }).productId !== id);
      }
    }
    return true;
  });
  refreshShop();
}

export async function saveSettings(input: Settings): Promise<Settings> {
  const settings = settingsSchema.parse(input);
  await withWriteLock((snapshot) => {
    snapshot.tables.settings = [settings];
    return true;
  });
  refreshShop();
  return settings;
}

/**
 * Saves the owner's sections (Women, Men, Kids…) and their categories, names and order. A
 * section or category that still has products cannot be removed: the owner moves those products
 * first, so nothing disappears from the shop.
 */
export async function saveStructure(
  sectionsInput: SectionRow[],
  categoriesInput: CategoryRow[],
): Promise<{ sections: SectionRow[]; categories: CategoryRow[] }> {
  const sections = sectionListSchema
    .parse(sectionsInput)
    .map((x) => ({ ...x, name: x.name.trim() }));
  const list = categoryListSchema
    .parse(categoriesInput)
    .map((c) => ({ ...c, name: c.name.trim() }));
  if (sections.length === 0) throw new UserError("Keep at least one section.");
  const sectionIds = new Set<string>();
  const sectionNames = new Set<string>();
  for (const x of sections) {
    if (sectionIds.has(x.id)) throw new UserError("Two sections have the same id.");
    if (sectionNames.has(x.name.toLowerCase())) throw new UserError(`"${x.name}" is listed twice.`);
    sectionIds.add(x.id);
    sectionNames.add(x.name.toLowerCase());
  }
  const keys = new Set<string>();
  const names = new Set<string>();
  for (const c of list) {
    if (!sectionIds.has(c.gender)) throw new UserError(`"${c.name}" belongs to a removed section.`);
    const key = `${c.gender}|${c.id}`;
    const name = `${c.gender}|${c.name.toLowerCase()}`;
    if (keys.has(key)) throw new UserError("Two categories have the same id.");
    if (names.has(name)) throw new UserError(`"${c.name}" is listed twice in the same section.`);
    keys.add(key);
    names.add(name);
  }
  await withWriteLock((snapshot) => {
    const beforeSections = parseSections(snapshot.tables.sections);
    const beforeCategories = parseCategories(snapshot.tables.categories);
    const products = productsOf(snapshot);
    for (const product of products) {
      if (!sectionIds.has(product.gender)) {
        const count = products.filter((p) => p.gender === product.gender).length;
        throw new UserError(
          `The section "${sectionName(beforeSections, product.gender)}" still has ${count} product${count === 1 ? "" : "s"} (e.g. ${product.name}). Move them to another section first.`,
          409,
        );
      }
      if (!keys.has(`${product.gender}|${product.category}`)) {
        const count = products.filter(
          (p) => p.gender === product.gender && p.category === product.category,
        ).length;
        throw new UserError(
          `"${categoryName(beforeCategories, product.category, product.gender)}" still has ${count} product${count === 1 ? "" : "s"} (e.g. ${product.name}). Move them to another category first.`,
          409,
        );
      }
    }
    snapshot.tables.sections = sections;
    snapshot.tables.categories = list;
    return true;
  });
  refreshShop();
  return { sections, categories: list };
}

/** Puts a product in (or takes it out of) the two "Show on top" slots of the home page. */
export async function setFeatured(id: string, on: boolean): Promise<string[]> {
  let next: string[] = [];
  await withWriteLock((snapshot) => {
    if (on && !productsOf(snapshot).some((p) => p.id === id)) {
      throw new UserError("This product no longer exists.", 404);
    }
    next = withFeatured(parseFeatured(snapshot.tables.featured), id, on);
    snapshot.tables.featured = next;
    return true;
  });
  refreshShop();
  return next;
}
