/**
 * Courier milestones, posted by the courier (e.g. Steadfast, Pathao, RedX) to this endpoint:
 *
 *   POST /api/courier/webhook
 *   x-courier-secret: <COURIER_WEBHOOK_SECRET>
 *   { "orderNumber": "MS-001001", "status": "OUT_FOR_DELIVERY", "at": "...", "note": "..." }
 *
 * Off until COURIER_WEBHOOK_SECRET is set. Each milestone is stored on the order (replacing the
 * demo courier) and the customer is notified.
 */
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { nowIso, transact, UserError } from "@/lib/server/db";
import { json } from "@/lib/server/http";

export const runtime = "nodejs";

const schema = z.object({
  orderNumber: z.string().regex(/^MS-\d{6}$/),
  status: z.enum(["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "DELIVERY_FAILED"]),
  at: z.string().datetime().optional(),
  note: z.string().max(200).optional(),
});

const MESSAGES: Record<z.infer<typeof schema>["status"], string> = {
  PICKED_UP: "The courier has collected your parcel.",
  IN_TRANSIT: "Your parcel is on its way.",
  OUT_FOR_DELIVERY: "Your parcel is out for delivery today — keep your phone close.",
  DELIVERED: "Your parcel has been delivered. Enjoy!",
  DELIVERY_FAILED:
    "The courier could not deliver today and will try again. Your delivery may be delayed.",
};

export async function POST(request: Request) {
  const secret = process.env.COURIER_WEBHOOK_SECRET;
  if (!secret) return json({ error: "Not found" }, 404);
  const given = Buffer.from(request.headers.get("x-courier-secret") ?? "");
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return json({ error: "Unauthorized" }, 401);
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid payload" }, 400);
  const event = parsed.data;
  try {
    await transact((db) => {
      const order = db.t.orders.find((o) => o.number === event.orderNumber);
      if (!order || order.status !== "CONFIRMED") throw new UserError("Unknown order", 404);
      order.courierEvents = [
        ...(order.courierEvents ?? []),
        { status: event.status, at: event.at ?? nowIso(), note: event.note },
      ];
      db.notify(
        order.userId,
        `${order.number}: ${event.status.replace(/_/g, " ").toLowerCase()}`,
        MESSAGES[event.status],
        `/account/orders/${order.id}`,
      );
    });
  } catch (error) {
    if (error instanceof UserError) return json({ error: error.message }, error.status);
    throw error;
  }
  return json({ ok: true });
}
