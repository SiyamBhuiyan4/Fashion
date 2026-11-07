/**
 * Server-side catalog access. The products live in the Telegram-backed database
 * (lib/db/telegramStore.ts, table "products") and are added and edited by the owner in the
 * admin panel (/admin/products). When the database is unreachable the catalogue is empty for
 * that request, so a build never fails because Telegram is down.
 *
 * Swapping Telegram for another database only means changing this file.
 */
import "server-only";
import { productSchema, videoRowSchema, type Product, type VideoRow } from "@/lib/schemas";
import type { Catalog } from "@/lib/catalog";
import { findById } from "@/lib/catalog";
import { isConfigured, loadSnapshot } from "@/lib/db/telegramStore";
import { defaultSettings, parseSettings, type Settings } from "@/lib/settings";
import { DEFAULT_CATEGORIES, parseCategories, type CategoryRow } from "@/lib/categories";
import { DEFAULT_SECTIONS, parseSections, type SectionRow } from "@/lib/sections";

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

/**
 * How long a fetched catalog is reused within one server process. Short, so a change made in the
 * admin panel shows up on the next page render.
 */
const TTL_MS = 5_000;

interface Loaded {
  catalog: Catalog;
  source: CatalogSource;
  videos: Map<string, VideoRow>;
  settings: Settings;
  categories: CategoryRow[];
  sections: SectionRow[];
}

let cached: (Loaded & { at: number }) | null = null;
let inFlight: Promise<Loaded> | null = null;

export type CatalogSource = "telegram" | "empty";

const emptyCatalog: Catalog = Object.freeze([]);
const noVideos = new Map<string, VideoRow>();
const nothing = (): Loaded => ({
  catalog: emptyCatalog,
  source: "empty",
  videos: noVideos,
  settings: defaultSettings,
  categories: DEFAULT_CATEGORIES,
  sections: DEFAULT_SECTIONS,
});

/** Valid products only: one bad row is skipped instead of hiding the whole shop. */
function parseProducts(rows: unknown): Product[] {
  if (!Array.isArray(rows)) return [];
  const out: Product[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const parsed = productSchema.safeParse(row);
    if (!parsed.success) {
      console.error("[catalog] product skipped:", parsed.error.issues.slice(0, 2));
      continue;
    }
    if (seen.has(parsed.data.id)) continue;
    seen.add(parsed.data.id);
    out.push(parsed.data);
  }
  return out;
}

async function fetchCatalog(): Promise<Loaded> {
  if (!isConfigured()) return nothing();
  try {
    const { snapshot } = await loadSnapshot();
    const settings = parseSettings(snapshot.tables.settings);
    // Snapshot rows are validated: the channel is shared, so its contents are not trusted.
    const products = parseProducts(snapshot.tables[PRODUCTS_TABLE]).filter((p) => !p.hidden);
    const videos = parseVideos(snapshot.tables[VIDEOS_TABLE]);
    return {
      catalog: Object.freeze(withVideos(products, videos)),
      source: "telegram",
      videos,
      settings,
      categories: parseCategories(snapshot.tables.categories),
      sections: parseSections(snapshot.tables.sections),
    };
  } catch (error) {
    console.error("[catalog] Telegram database unavailable:", error);
    return nothing();
  }
}

/** Forgets the cached catalogue, after the admin panel changed it. */
export function resetCatalogCache() {
  cached = null;
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

export async function getSections(): Promise<SectionRow[]> {
  return (await load()).sections;
}

export async function getCategories(): Promise<CategoryRow[]> {
  return (await load()).categories;
}

export async function getSettings(): Promise<Settings> {
  return (await load()).settings;
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
