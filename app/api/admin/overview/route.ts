/** Numbers for the admin dashboard: products, stock and what is running low. */
import { adminGet } from "@/lib/server/admin";
import { loadAdmin } from "@/lib/server/adminStore";
import { json } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = adminGet(async () => {
  const { db, products, settings } = await loadAdmin();
  const withStock = products.map((p) => {
    const sizes = p.sizes.map((size) => ({ size, units: db.availableTotal(p.id, size) }));
    return {
      id: p.id,
      name: p.name,
      image: p.colors.find((c) => c.image)?.image ?? p.images?.[0],
      hidden: Boolean(p.hidden),
      sizes,
      total: sizes.reduce((n, s) => n + s.units, 0),
    };
  });
  const live = withStock.filter((p) => !p.hidden);
  return json({
    stats: {
      products: live.length,
      hidden: withStock.length - live.length,
      soldOut: live.filter((p) => p.total === 0).length,
      pieces: live.reduce((n, p) => n + p.total, 0),
    },
    whatsapp: settings.whatsapp,
    lowStock: live.filter((p) => p.sizes.some((s) => s.units <= 2)).slice(0, 12),
  });
});
