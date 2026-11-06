/** Switch an unpaid or failed order to another payment method (Cash on Delivery confirms it). */
import { z } from "zod";
import { transact } from "@/lib/server/db";
import { switchMethod } from "@/lib/server/checkout";
import { handler, json } from "@/lib/server/http";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().max(64).optional(),
  method: z.enum(["cod", "bkash", "nagad"]),
});

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handler(schema, async (input, { userId }) => {
    const order = await transact((db) =>
      switchMethod(db, id, { userId, token: input.token }, input.method),
    );
    return json({ status: order.status, method: order.payment.method });
  })(request);
}
