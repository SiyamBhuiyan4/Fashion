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
import {
  catalogSchema,
  videoRowSchema,
  type Gender,
  type Product,
  type VideoRow,
} from "@/lib/schemas";
import type { Catalog } from "@/lib/catalog";
import { findById, groupByCategory } from "@/lib/catalog";
import { isConfigured, loadSnapshot } from "@/lib/db/telegramStore";

export const PRODUCTS_TABLE = "products";
/** Product videos live in their own table so re-seeding the products never drops them. */
export const VIDEOS_TABLE = "videos";

function parseVideos(rows: unknown): Map<string, VideoRow> {
  const byProduct = new Map<string, VideoRow>();
  if (!Array.isArray(rows)) return byProduct;
  for (const row of rows) {
    const parsed = videoRowSchema.safeParse(row);
    if (parsed.success) byProduct.set(parsed.data.productId, parsed.data);
  }
  return byProduct;
}

/** Attaches each product's video from the "videos" table. Bad rows are skipped, not fatal. */
function withVideos(products: Product[], videos: Map<string, VideoRow>): Product[] {
  if (videos.size === 0) return products;
  return products.map((product) => {
    const row = videos.get(product.id);
    if (!row) return product;
    const video = {
      url: `/api/video/${product.id}/master.m3u8`,
      poster: row.poster,
      width: row.width,
      height: row.height,
      duration: row.duration,
    };
    return { ...product, video };
  });
}

/** How long a fetched catalog is reused within one server process. */
const TTL_MS = 60_000;

interface Loaded {
  catalog: Catalog;
  source: CatalogSource;
  videos: Map<string, VideoRow>;
}

let cached: (Loaded & { at: number }) | null = null;
let inFlight: Promise<Loaded> | null = null;

export type CatalogSource = "telegram" | "seed";

const seedCatalog: Catalog = Object.freeze(catalogSchema.parse(seedProducts));

const noVideos = new Map<string, VideoRow>();

async function fetchCatalog(): Promise<Loaded> {
  if (!isConfigured()) return { catalog: seedCatalog, source: "seed", videos: noVideos };
  try {
    const { snapshot } = await loadSnapshot();
    const rows = snapshot.tables[PRODUCTS_TABLE];
    if (!Array.isArray(rows) || rows.length === 0) {
      return { catalog: seedCatalog, source: "seed", videos: noVideos };
    }
    // Snapshot rows are validated: the channel is shared, so its contents are not trusted.
    const parsed = catalogSchema.safeParse(rows);
    if (!parsed.success) {
      console.error("[catalog] snapshot rejected by schema:", parsed.error.issues.slice(0, 3));
      return { catalog: seedCatalog, source: "seed", videos: noVideos };
    }
    const videos = parseVideos(snapshot.tables[VIDEOS_TABLE]);
    return {
      catalog: Object.freeze(withVideos(parsed.data, videos)),
      source: "telegram",
      videos,
    };
  } catch (error) {
    console.error("[catalog] Telegram database unavailable, using seed data:", error);
    return { catalog: seedCatalog, source: "seed", videos: noVideos };
  }
}

async function load(): Promise<Loaded> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached;
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

export async function getCatalogWithSource(): Promise<{ catalog: Catalog; source: CatalogSource }> {
  const { catalog, source } = await load();
  return { catalog, source };
}

/** The stored pieces of a product's video, for the HLS playlists in /api/video. */
export async function getVideoRow(productId: string): Promise<VideoRow | undefined> {
  return (await load()).videos.get(productId);
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
