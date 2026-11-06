/** Verified reviews and the fit consensus for a product; filter by reviewer height with ?h=165-170. */
import { read } from "@/lib/server/db";
import { fitScore } from "@/lib/server/aftercare";
import { json } from "@/lib/server/http";
import { productIdSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const parsed = productIdSchema.safeParse((await params).productId);
  if (!parsed.success) return json({ error: "Not found" }, 404);
  const url = new URL(request.url);
  const [hMin, hMax] = (url.searchParams.get("h") ?? "").split("-").map(Number);
  const db = await read();
  let reviews = db.t.reviews
    .filter((r) => r.productId === parsed.data)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const all = reviews.length;
  if (hMin && hMax)
    reviews = reviews.filter((r) => r.heightCm && r.heightCm >= hMin && r.heightCm <= hMax);
  const rating = all
    ? db.t.reviews.filter((r) => r.productId === parsed.data).reduce((s, r) => s + r.rating, 0) /
      all
    : null;
  return json({
    reviews: reviews.map(({ userId: _u, orderId: _o, ...r }) => (void _u, void _o, r)),
    total: all,
    rating,
    fit: fitScore(db, parsed.data),
  });
}
