/** Live stock for one product: units that can still be bought per size (holds excluded). */
import { read } from "@/lib/server/db";
import { productIdSchema } from "@/lib/schemas";
import { json } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = productIdSchema.safeParse((await params).id);
  if (!parsed.success) return json({ error: "Not found" }, 404);
  const db = await read();
  const product = db.product(parsed.data);
  if (!product) return json({ error: "Not found" }, 404);
  const sizes = Object.fromEntries(
    product.sizes.map((size) => {
      const byWarehouse = db.available(product.id, size);
      const total = Object.values(byWarehouse).reduce((a, b) => a + b, 0);
      return [size, { total, byWarehouse }];
    }),
  );
  return json({ productId: product.id, sizes });
}
