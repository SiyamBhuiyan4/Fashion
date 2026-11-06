import { z } from "zod";
import { transact } from "@/lib/server/db";
import { placeOrder } from "@/lib/server/checkout";
import { currentUser } from "@/lib/server/auth";
import { handler, json } from "@/lib/server/http";
import { addressSchema } from "@/lib/server/schemas";
import { timeline } from "@/lib/tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  reservationId: z.string().min(4).max(40),
  address: addressSchema,
  payment: z.enum(["cod", "bkash", "nagad"]),
  useWallet: z.boolean().default(true),
});

export const POST = handler(
  schema,
  async (input, { userId }) => {
    const { order, next } = await transact((db) => placeOrder(db, userId!, input));
    return json({ orderId: order.id, number: order.number, next }, 201);
  },
  { auth: true },
);

export async function GET() {
  const session = await currentUser();
  if (!session) return json({ error: "Please sign in first." }, 401);
  const { user, db } = session;
  const orders = db.t.orders
    .filter((o) => o.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((o) => {
      const { retryToken: _token, ...payment } = o.payment;
      void _token;
      return { ...o, payment, tracking: timeline(o) };
    });
  return json({ orders });
}
