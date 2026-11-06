import { z } from "zod";
import { transact } from "@/lib/server/db";
import { addReview } from "@/lib/server/aftercare";
import { handler, json } from "@/lib/server/http";
import { productIdSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const schema = z.object({
  orderId: z.string().min(4).max(40),
  productId: productIdSchema,
  rating: z.number().int().min(1).max(5),
  fit: z.enum(["RUNS_SMALL", "TRUE_TO_SIZE", "RUNS_LARGE"]),
  body: z.string().trim().min(10, "Tell other shoppers a little more (10+ characters).").max(800),
  heightCm: z.number().min(120).max(220).optional(),
  weightKg: z.number().min(30).max(200).optional(),
});

export const POST = handler(
  schema,
  async (input, { userId }) => {
    const review = await transact((db) => addReview(db, userId!, input));
    return json({ review }, 201);
  },
  { auth: true },
);
