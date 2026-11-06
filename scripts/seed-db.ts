/**
 * Fills the Telegram-backed database with the catalogue.
 *
 *   npm run db:seed            update products and any artwork that changed
 *   npm run db:seed -- --force re-render and re-upload every image
 *   npm run db:seed -- --dry   render locally to scripts/.preview, upload nothing
 *
 * For every colourway it renders the flat-lay illustration (scripts/product-art.ts), uploads it
 * to the Telegram channel as a document and stores the permanent /api/tg/<file_id>.webp link on
 * the product. Artwork already in the channel is reused: the `media` table remembers a hash of
 * the bytes per colourway, so a second run uploads nothing.
 *
 * This is the only writer. The website itself only ever reads the database.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { products as seedProducts } from "../data/products.ts";
import { catalogSchema, type Product } from "../lib/schemas.ts";
import {
  loadSnapshot,
  withWriteLock,
  uploadMedia,
  type Snapshot,
} from "../lib/db/telegramStore.ts";
import { productArtSvg } from "./product-art.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

/** Minimal .env.local reader, so the script needs no extra dependency. */
function loadEnv(): void {
  for (const file of [".env.local", ".env"]) {
    let text: string;
    try {
      text = readFileSync(join(root, file), "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (match && !process.env[match[1]!]) {
        process.env[match[1]!] = match[2]!.replace(/^["']|["']$/g, "");
      }
    }
  }
}

const IMAGE = { width: 900, height: 1125, quality: 82 };
const ART_VERSION = 1; // bump to force every image to be rendered again

interface MediaRow {
  key: string;
  hash: string;
  fileId: string;
  url: string;
  updatedAt: string;
}

const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const dryRun = args.has("--dry");

async function renderArt(product: Product, colorIndex: number): Promise<Buffer> {
  const color = product.colors[colorIndex]!;
  const svg = productArtSvg(product, color);
  return sharp(Buffer.from(svg))
    .resize(IMAGE.width, IMAGE.height, { fit: "fill" })
    .webp({ quality: IMAGE.quality, effort: 5 })
    .toBuffer();
}

async function main(): Promise<void> {
  loadEnv();
  const catalog = catalogSchema.parse(seedProducts);
  console.log(
    `Catalogue: ${catalog.length} products, ${catalog.reduce((n, p) => n + p.colors.length, 0)} colourways`,
  );

  if (dryRun) {
    const out = join(here, ".preview");
    mkdirSync(out, { recursive: true });
    for (const product of catalog) {
      const webp = await renderArt(product, 0);
      writeFileSync(join(out, `${product.id}.webp`), webp);
    }
    console.log(`Rendered ${catalog.length} previews to ${out} — nothing uploaded.`);
    return;
  }

  // What the channel already holds.
  const { snapshot: existing, version } = await loadSnapshot();
  const media = new Map<string, MediaRow>(
    ((existing.tables.media as MediaRow[] | undefined) ?? []).map((row) => [row.key, row]),
  );
  console.log(`Database v${version}: ${media.size} media files already stored`);

  const nextMedia = new Map(media);
  let uploaded = 0;
  let reused = 0;

  const products: Product[] = [];
  for (const product of catalog) {
    const colors = [];
    for (const [index, color] of product.colors.entries()) {
      const key = `art:v${ART_VERSION}:${product.id}:${color.name}`;
      const bytes = await renderArt(product, index);
      const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 32);
      const known = nextMedia.get(key);
      if (!force && known?.hash === hash) {
        reused++;
        colors.push({ ...color, image: known.url });
        continue;
      }
      const filename = `${product.id}-${color.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.webp`;
      const { fileId, url } = await uploadMedia(bytes, filename, "image/webp");
      nextMedia.set(key, { key, hash, fileId, url, updatedAt: new Date().toISOString() });
      uploaded++;
      console.log(`  uploaded ${filename} -> ${url}`);
      colors.push({ ...color, image: url });
    }
    products.push({ ...product, colors: colors as Product["colors"] });
  }

  // Validate once more: this is exactly what the website will read back.
  const validated = catalogSchema.parse(products);
  console.log(`Images: ${uploaded} uploaded, ${reused} reused`);

  const saved = await withWriteLock((snapshot: Snapshot) => {
    snapshot.tables.products = validated;
    snapshot.tables.media = [...nextMedia.values()];
    return true;
  });
  console.log(`Saved database v${saved} (${validated.length} products) to the Telegram channel.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
