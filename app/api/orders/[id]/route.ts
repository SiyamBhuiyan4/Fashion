/** One order, for its owner (or, on the payment page, for whoever holds its retry link). */
import { currentUserId } from "@/lib/server/auth";
import { read } from "@/lib/server/db";
import { json } from "@/lib/server/http";
import { timeline } from "@/lib/tracking";
import { warehouseName } from "@/lib/server/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token") ?? undefined;
  const [userId, db] = await Promise.all([currentUserId(), read()]);
  const order = db.t.orders.find((o) => o.id === id);
  const allowed =
    order &&
    ((userId && order.userId === userId) ||
      (token && order.payment.retryToken && token === order.payment.retryToken));
  if (!order || !allowed) return json({ error: "Order not found." }, 404);
  const hold = db.t.reservations.find((r) => r.id === order.reservationId);
  const { retryToken: _token, ...payment } = order.payment;
  void _token;
  return json({
    order: {
      ...order,
      payment,
      shipments: order.shipments.map((s) => ({ ...s, name: warehouseName(s.warehouse) })),
    },
    holdExpiresAt: hold?.expiresAt ?? null,
    tracking: timeline(order),
    cases: db.t.cases.filter((c) => c.orderId === order.id),
    reviewed: db.t.reviews.filter((r) => r.orderId === order.id).map((r) => r.productId),
    owner: Boolean(userId && order.userId === userId),
  });
}
