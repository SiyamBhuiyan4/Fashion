/** Request a return or a size exchange for one piece of a delivered order. */
import { z } from "zod";
import { transact } from "@/lib/server/db";
import { requestExchange, requestReturn } from "@/lib/server/aftercare";
import { handler, json } from "@/lib/server/http";
import { sizeSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const schema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("return"),
    itemIndex: z.number().int().min(0).max(30),
    reason: z.enum(["Too small", "Too large", "Not as pictured", "Changed my mind", "Faulty"]),
  }),
  z.object({
    type: z.literal("exchange"),
    itemIndex: z.number().int().min(0).max(30),
    newSize: sizeSchema,
  }),
]);

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handler(
    schema,
    async (input, { userId }) => {
      const kase = await transact((db) =>
        input.type === "return"
          ? requestReturn(db, userId!, id, input.itemIndex, input.reason)
          : requestExchange(db, userId!, id, input.itemIndex, input.newSize),
      );
      return json({ case: kase }, 201);
    },
    { auth: true },
  )(request);
}
