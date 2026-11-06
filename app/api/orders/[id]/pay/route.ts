/**
 * The demo payment gateway's callback. A real bKash / Nagad integration would call
 * settlePayment from its verified server-to-server callback instead; the demo page lets the
 * shopper choose the outcome so the success and the failure-recovery paths can both be tried.
 */
import { z } from "zod";
import { transact } from "@/lib/server/db";
import { settlePayment } from "@/lib/server/checkout";
import { handler, json } from "@/lib/server/http";

export const runtime = "nodejs";

const schema = z.object({
  token: z.string().max(64).optional(),
  outcome: z.enum(["success", "fail"]),
});

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handler(schema, async (input, { userId }) => {
    const order = await transact((db) =>
      settlePayment(db, id, { userId, token: input.token }, input.outcome),
    );
    return json({
      status: order.status,
      retryToken:
        order.status === "PAYMENT_FAILED_RETRYABLE" ? order.payment.retryToken : undefined,
    });
  })(request);
}
