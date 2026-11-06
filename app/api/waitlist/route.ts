/** Back-in-stock and price-drop alerts for one product (and size). */
import { z } from "zod";
import { id, nowIso, transact, UserError } from "@/lib/server/db";
import { handler, json } from "@/lib/server/http";
import { productIdSchema, sizeSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const schema = z.object({
  productId: productIdSchema,
  size: sizeSchema.optional(),
  kind: z.enum(["restock", "price"]),
});

export const POST = handler(
  schema,
  async (input, { userId }) => {
    const entry = await transact((db) => {
      const product = db.product(input.productId);
      if (!product) throw new UserError("Product not found.", 404);
      if (input.kind === "restock" && (!input.size || !product.sizes.includes(input.size))) {
        throw new UserError("Choose the size you are waiting for.");
      }
      const existing = db.t.waitlist.find(
        (w) =>
          w.userId === userId &&
          w.productId === input.productId &&
          w.kind === input.kind &&
          (input.kind === "price" || w.size === input.size) &&
          !w.notifiedAt,
      );
      if (existing) return existing;
      const created = {
        id: id("wl"),
        userId: userId!,
        productId: input.productId,
        size: input.kind === "restock" ? input.size : undefined,
        kind: input.kind,
        priceAt: product.price,
        createdAt: nowIso(),
      };
      db.t.waitlist.push(created);
      return created;
    });
    return json({ entry }, 201);
  },
  { auth: true },
);
