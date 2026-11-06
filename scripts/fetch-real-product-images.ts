/**
 * Downloads real high-resolution fashion photos from Unsplash for each product,
 * converts them to optimized WebP format (900x1125), and saves them to public/images/products/.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const IMAGES: Record<string, string> = {
  // Women
  "w-silk-blouse": "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=900&q=85",
  "w-ribbed-tank": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=900&q=85",
  "w-slip-dress": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=900&q=85",
  "w-cashmere-crew": "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=900&q=85",
  "w-wide-jeans": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=900&q=85",
  "w-midi-skirt": "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=900&q=85",
  "w-tailored-trouser": "https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=900&q=85",
  "w-trench-coat": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=900&q=85",
  "w-cropped-blazer": "https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?w=900&q=85",
  "w-zip-hoodie": "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=900&q=85",
  "w-leather-flat": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=900&q=85",
  "w-block-heel": "https://images.unsplash.com/photo-1562273138-f46be4ebdf33?w=900&q=85",
  "w-runner-sneaker": "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=900&q=85",

  // Men
  "m-tee-essential": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=900&q=85",
  "m-oxford-shirt": "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=900&q=85",
  "m-polo-pique": "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=900&q=85",
  "m-merino-sweater": "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=900&q=85",
  "m-slim-jeans": "https://images.unsplash.com/photo-1542272604-780c96856592?w=900&q=85",
  "m-pleated-trouser": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=900&q=85",
  "m-cargo-short": "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=900&q=85",
  "m-denim-jacket": "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=900&q=85",
  "m-wool-blazer": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=900&q=85",
  "m-hooded-parka": "https://images.unsplash.com/photo-1544923246-77307dd654cb?w=900&q=85",
  "m-court-sneaker": "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=900&q=85",
  "m-chelsea-boot": "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=900&q=85",
};

const TARGET_DIR = path.resolve(process.cwd(), "public/images/products");

async function downloadAndProcess(id: string, url: string) {
  const dest = path.join(TARGET_DIR, `${id}.webp`);
  console.log(`Fetching ${id}...`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await sharp(buffer)
      .resize(900, 1125, { fit: "cover", position: "centre" })
      .webp({ quality: 84 })
      .toFile(dest);

    console.log(`✓ Saved ${dest}`);
  } catch (err) {
    console.error(`Failed to process ${id}:`, err);
  }
}

async function main() {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
  for (const [id, url] of Object.entries(IMAGES)) {
    await downloadAndProcess(id, url);
  }
  console.log("All real product images downloaded and saved!");
}

main().catch(console.error);
