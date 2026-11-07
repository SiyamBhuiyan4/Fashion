/** The product list (with live stock) and saving a product, for the admin panel. */
import { adminProductSchema } from "@/lib/adminProduct";
import { adminGet, adminPost } from "@/lib/server/admin";
import { loadAdmin, saveProduct } from "@/lib/server/adminStore";
import { json } from "@/lib/server/http";
import { VIDEOS_TABLE } from "@/lib/products.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = adminGet(async () => {
  const { db, products, snapshot } = await loadAdmin();
  const videos = new Set(
    ((snapshot.tables[VIDEOS_TABLE] ?? []) as Array<{ productId?: string }>).map(
      (v) => v.productId,
    ),
  );
  return json({
    products: products
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
      .map((p) => {
        const rows = db.t.inventory.filter((r) => r.productId === p.id);
        const stock = Object.fromEntries(
          p.sizes.map((size) => [
            size,
            rows.length > 0
              ? rows.filter((r) => r.size === size).reduce((n, r) => n + r.units, 0)
              : (p.stock[size] ?? 0),
          ]),
        );
        return { ...p, stock, hasVideo: videos.has(p.id) };
      }),
  });
});

export const POST = adminPost(adminProductSchema, async (input) => {
  const product = await saveProduct(input);
  return json({ product });
});
