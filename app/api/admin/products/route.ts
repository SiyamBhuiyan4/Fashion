/** The product list (with live stock) and saving a product, for the admin panel. */
import { adminProductSchema } from "@/lib/adminProduct";
import { adminGet, adminPost } from "@/lib/server/admin";
import { loadAdmin, saveProduct } from "@/lib/server/adminStore";
import { json } from "@/lib/server/http";
import { parseVideos, VIDEOS_TABLE, videoUrl } from "@/lib/products.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = adminGet(async () => {
  const { db, products, snapshot } = await loadAdmin();
  const videos = parseVideos(snapshot.tables[VIDEOS_TABLE]);
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
        const row = videos.get(p.id);
        return {
          ...p,
          stock,
          hasVideo: Boolean(row),
          videoInfo: row
            ? {
                url: videoUrl(p.id, row),
                poster: row.poster,
                size: "size" in row ? row.size : row.bytes,
                duration: row.duration,
              }
            : null,
        };
      }),
  });
});

export const POST = adminPost(adminProductSchema, async (input) => {
  const product = await saveProduct(input);
  return json({ product });
});
