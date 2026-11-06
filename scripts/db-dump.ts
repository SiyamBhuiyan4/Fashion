/**
 * Prints what the Telegram-backed database currently holds.
 *   npm run db:dump            summary
 *   npm run db:dump -- --json  the whole snapshot as JSON
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSnapshot } from "../lib/db/telegramStore.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(join(root, file), "utf8").split("\n")) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (match && !process.env[match[1]!]) process.env[match[1]!] = match[2]!;
    }
  } catch {
    /* no such file */
  }
}

const { snapshot, version } = await loadSnapshot();
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(snapshot, null, 2));
} else {
  console.log(`version ${version} · updated ${snapshot.updated_at}`);
  for (const [table, rows] of Object.entries(snapshot.tables)) {
    console.log(`  ${table}: ${Array.isArray(rows) ? rows.length : 0} rows`);
  }
  const products = (snapshot.tables.products ?? []) as Array<{
    id: string;
    name: string;
    colors: Array<{ image?: string }>;
  }>;
  for (const product of products.slice(0, 3)) {
    console.log(
      `  e.g. ${product.id} "${product.name}" -> ${product.colors[0]?.image ?? "no image"}`,
    );
  }
}
