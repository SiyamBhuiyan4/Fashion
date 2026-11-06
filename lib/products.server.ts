/**
 * Server-side catalog access. The products live in the Telegram-backed database
 * (lib/db/telegramStore.ts, table "products"); data/products.ts is the seed the database was
 * filled from and the fallback when the database is unreachable or not yet seeded, so a build
 * never fails because Telegram is down.
 *
 * Swapping Telegram for another database only means changing this file.
 */
import "server-only";
import { products as seedProducts } from "@/data/products";
import { catalogSchema, type Gender, type Product } from "@/lib/schemas";
import type { Catalog } from "@/lib/catalog";
import { findById, groupByCategory } from "@/lib/catalog";
import { isConfigured, loadSnapshot } from "@/lib/db/telegramStore";

export const PRODUCTS_TABLE = "products";

/** How long a fetched catalog is reused within one server process. */
const TTL_MS = 60_000;

let cached: { catalog: Catalog; at: number; source: CatalogSource } | null = null;
let inFlight: Promise<{ catalog: Catalog; source: CatalogSource }> | null = null;

export type CatalogSource = "telegram" | "seed";

const seedCatalog: Catalog = Object.freeze(catalogSchema.parse(seedProducts));

async function fetchCatalog(): Promise<{ catalog: Catalog; source: CatalogSource }> {
  if (!isConfigured()) return { catalog: seedCatalog, source: "seed" };
  try {
    const { snapshot } = await loadSnapshot();
    const rows = snapshot.tables[PRODUCTS_TABLE];
    if (!Array.isArray(rows) || rows.length === 0) {
      return { catalog: seedCatalog, source: "seed" };
    }
    // Snapshot rows are validated: the channel is shared, so its contents are not trusted.
    const parsed = catalogSchema.safeParse(rows);
    if (!parsed.success) {
      console.error("[catalog] snapshot rejected by schema:", parsed.error.issues.slice(0, 3));
      return { catalog: seedCatalog, source: "seed" };
    }
    return { catalog: Object.freeze(parsed.data), source: "telegram" };
  } catch (error) {
    console.error("[catalog] Telegram database unavailable, using seed data:", error);
    return { catalog: seedCatalog, source: "seed" };
  }
}

export async function getCatalogWithSource(): Promise<{ catalog: Catalog; source: CatalogSource }> {
  if (cached && Date.now() - cached.at < TTL_MS) {
    return { catalog: cached.catalog, source: cached.source };
  }
  inFlight ??= fetchCatalog()
    .then((result) => {
      cached = { ...result, at: Date.now() };
      return result;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export async function getCatalog(): Promise<Catalog> {
  return (await getCatalogWithSource()).catalog;
}

export async function getProduct(id: unknown): Promise<Product | undefined> {
  return findById(await getCatalog(), id);
}

export async function getProductIds(): Promise<string[]> {
  return (await getCatalog()).map((p) => p.id);
}

export async function getGenderCatalog(gender: Gender): Promise<Product[]> {
  return (await getCatalog()).filter((p) => p.gender === gender);
}

export async function getCollection(gender: Gender) {
  return groupByCategory(await getCatalog(), gender);
}

/** The seed catalog, for scripts that fill the database. */
export function getSeedCatalog(): Catalog {
  return seedCatalog;
}
