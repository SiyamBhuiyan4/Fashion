/**
 * Puts product videos on the site, at full quality and any length.
 *
 *   1. Drop each video into the `videos/` folder, named after the product id, e.g.
 *        videos/m-tee-essential.mp4      videos/w-slip-dress.mov
 *      (any of .mp4 .mov .m4v .webm .mkv). Product ids are listed by `npm run db:dump`.
 *   2. npm run videos:upload
 *
 *   npm run videos:upload -- --dry           cut them into scripts/.preview, upload nothing
 *   npm run videos:upload -- --force         redo even unchanged files
 *   npm run videos:upload -- --remove <id>   take a product's video off the site
 *
 * Each video is cut into HLS pieces by scripts/video-hls.ts (original quality kept; smaller
 * copies added for slow connections), every piece is uploaded to the Telegram channel — each is
 * under the 20 MB bot download limit — and the "videos" table records them in order.
 *
 * Unchanged videos are skipped. Uploaded pieces are remembered in videos/.uploaded.json, so if a
 * run is interrupted the next one continues where it stopped instead of uploading everything again.
 */
import { createHash } from "node:crypto";
import {
  createReadStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
  cpSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { products as seedProducts } from "../data/products.ts";
import { productIdSchema, videoRowSchema, type VideoRow } from "../lib/schemas.ts";
import { loadSnapshot, uploadMedia, withWriteLock } from "../lib/db/telegramStore.ts";
import { mb, PIECE_LIMIT, posterFrame, toHls } from "./video-hls.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const FOLDER = join(root, "videos");
const LEDGER = join(FOLDER, ".uploaded.json");
const EXTENSIONS = new Set([".mp4", ".mov", ".m4v", ".webm", ".mkv"]);
const TABLE = "videos";
/** Bump when the cutting rules change, to redo every video on the next run. */
const CUT_VERSION = 2;

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

function hashFile(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(path)
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolve(`${CUT_VERSION}:${hash.digest("hex").slice(0, 40)}`));
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Telegram limits how fast a bot may post to a channel; wait and retry when it says so. */
async function uploadWithRetry(bytes: Uint8Array, filename: string, type: string) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await uploadMedia(bytes, filename, type);
    } catch (error) {
      if (attempt >= 6) throw error;
      const wait = 5_000 * attempt;
      console.warn(`    ${filename}: ${(error as Error).message} — retrying in ${wait / 1000}s`);
      await sleep(wait);
    }
  }
}

async function main(): Promise<void> {
  loadEnv();
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const force = args.includes("--force");
  const removeAt = args.indexOf("--remove");

  const { snapshot } = await loadSnapshot();
  const products = Array.isArray(snapshot.tables.products)
    ? (snapshot.tables.products as Array<{ id: string }>)
    : seedProducts;
  const knownIds = new Set(products.map((p) => p.id));
  const rows = new Map<string, VideoRow>();
  for (const row of (snapshot.tables[TABLE] as unknown[] | undefined) ?? []) {
    const parsed = videoRowSchema.safeParse(row);
    if (parsed.success) rows.set(parsed.data.productId, parsed.data);
  }

  if (removeAt !== -1) {
    const id = args[removeAt + 1] ?? "";
    if (!rows.has(id)) throw new Error(`No video stored for "${id}"`);
    const version = await withWriteLock((next) => {
      next.tables[TABLE] = ((next.tables[TABLE] as VideoRow[] | undefined) ?? []).filter(
        (row) => row.productId !== id,
      );
      return true;
    });
    console.log(`Removed the video of ${id} (database v${version}).`);
    return;
  }

  if (!existsSync(FOLDER)) {
    mkdirSync(FOLDER, { recursive: true });
    console.log(`Created ${FOLDER} — put videos in it named <product-id>.mp4 and run again.`);
    return;
  }
  const files = readdirSync(FOLDER)
    .filter((name) => EXTENSIONS.has(extname(name).toLowerCase()))
    .sort();
  if (files.length === 0) {
    console.log(`No videos in ${FOLDER}. Name them <product-id>.mp4, e.g. m-tee-essential.mp4`);
    return;
  }

  // piece hash -> Telegram file id, so an interrupted run resumes instead of starting over.
  let ledger: Record<string, string> = {};
  try {
    ledger = JSON.parse(readFileSync(LEDGER, "utf8")) as Record<string, string>;
  } catch {
    ledger = {};
  }

  const work = mkdtempSync(join(tmpdir(), "upload-videos-"));
  const preview = join(here, ".preview");
  const changed: VideoRow[] = [];
  try {
    for (const name of files) {
      const id = basename(name, extname(name)).toLowerCase();
      if (!productIdSchema.safeParse(id).success || !knownIds.has(id)) {
        console.warn(`skip ${name}: "${id}" is not a product id`);
        continue;
      }
      const source = join(FOLDER, name);
      const hash = await hashFile(source);
      if (!force && !dry && rows.get(id)?.hash === hash) {
        console.log(`same ${name} (already on the site)`);
        continue;
      }

      console.log(`${name}:`);
      const out = join(work, id);
      const { info, renditions } = await toHls(source, out, console.log);
      const still = join(out, "poster.jpg");
      await posterFrame(source, info.duration, still);

      if (dry) {
        mkdirSync(preview, { recursive: true });
        cpSync(out, join(preview, id), { recursive: true });
        continue;
      }

      const total = renditions.reduce((n, r) => n + r.segments.length, 0);
      let done = 0;
      let bytes = 0;
      const stored = [];
      for (const rendition of renditions) {
        const segments = [];
        for (const [index, segment] of rendition.segments.entries()) {
          const data = readFileSync(segment.file);
          if (data.byteLength > PIECE_LIMIT) throw new Error(`${segment.file} is over the limit`);
          const key = createHash("sha256").update(data).digest("hex");
          let fileId = ledger[key];
          if (!fileId) {
            const filename = `${id}-${rendition.name}-${String(index + 1).padStart(4, "0")}.ts`;
            ({ fileId } = await uploadWithRetry(data, filename, "video/mp2t"));
            ledger[key] = fileId;
            writeFileSync(LEDGER, JSON.stringify(ledger));
          }
          segments.push({ d: Math.round(segment.duration * 1000) / 1000, f: fileId });
          bytes += data.byteLength;
          done++;
          if (done % 5 === 0 || done === total) console.log(`  uploaded ${done}/${total} pieces`);
        }
        stored.push({
          name: rendition.name,
          width: rendition.width,
          height: rendition.height,
          bandwidth: rendition.bandwidth,
          codecs: rendition.codecs,
          segments,
        });
      }
      const image = await uploadWithRetry(readFileSync(still), `${id}-poster.jpg`, "image/jpeg");

      changed.push(
        videoRowSchema.parse({
          productId: id,
          poster: `/api/tg/${image.fileId}.jpg`,
          width: info.width,
          height: info.height,
          duration: Math.round(info.duration * 100) / 100,
          renditions: stored,
          hash,
          bytes,
          updatedAt: new Date().toISOString(),
        }),
      );
      console.log(`  ${id}: ${renditions.length} quality levels, ${mb(bytes)} in total`);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  if (dry) {
    console.log(`Dry run: the pieces are in ${preview} — nothing uploaded.`);
    return;
  }
  if (changed.length === 0) {
    console.log("Nothing new to upload.");
    return;
  }
  const version = await withWriteLock((next) => {
    const list = new Map(
      ((next.tables[TABLE] as VideoRow[] | undefined) ?? []).map((row) => [row.productId, row]),
    );
    for (const row of changed) list.set(row.productId, row);
    next.tables[TABLE] = [...list.values()];
    return true;
  });
  console.log(
    `Saved ${changed.length} video(s) to database v${version}. The site shows them within ~5 minutes.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
