/**
 * Removes the old demo catalogue (and everything that pointed at it) from the database, so the
 * shop starts empty and the owner adds real products in the admin panel.
 *
 *   npm run db:clear-demo            show what would be removed
 *   npm run db:clear-demo -- --yes   remove it
 *
 * Customer accounts are kept (their wallet and notifications are cleared). Settings are kept.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSnapshot, withWriteLock } from "../lib/db/telegramStore.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(join(root, file), "utf8").split("\n")) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (match && !process.env[match[1]!])
        process.env[match[1]!] = match[2]!.replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no such file */
  }
}

const CLEAR = [
  "products",
  "media",
  "videos",
  "inventory",
  "reservations",
  "orders",
  "cases",
  "reviews",
  "waitlist",
  "notifications",
  "wallet",
];

const { snapshot, version } = await loadSnapshot();
console.log(`Database v${version} (${process.env.FASHION_DB_TAG || "fashion-db"}):`);
for (const table of CLEAR) {
  const rows = snapshot.tables[table];
  console.log(`  ${table}: ${Array.isArray(rows) ? rows.length : 0} rows → 0`);
}
const users = snapshot.tables.users;
console.log(`  users: ${Array.isArray(users) ? users.length : 0} rows (kept)`);

if (!process.argv.includes("--yes")) {
  console.log("\nNothing changed. Run again with --yes to remove the demo data.");
  process.exit(0);
}

const saved = await withWriteLock((s) => {
  for (const table of CLEAR) s.tables[table] = [];
  return true;
});
console.log(`\nDone — saved database v${saved}. The shop is now empty.`);
