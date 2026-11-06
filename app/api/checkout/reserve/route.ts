import { z } from "zod";
import { transact } from "@/lib/server/db";
import { reserve } from "@/lib/server/checkout";
import { handler, json } from "@/lib/server/http";
import { linesSchema } from "@/lib/server/schemas";

export const runtime = "nodejs";

const schema = z.object({ lines: linesSchema, district: z.string().max(40).optional() });

export const POST = handler(
  schema,
  async (input, { userId }) => {
    const result = await transact((db) => {
      const district = input.district || db.user(userId!)?.profile.district || "Dhaka";
      const { reservation, missing } = reserve(db, userId!, input.lines, district);
      return {
        reservationId: reservation?.id ?? null,
        expiresAt: reservation?.expiresAt ?? null,
        missing: missing.map((m) => ({
          productId: m.line.productId,
          size: m.line.size,
          colorName: m.line.colorName,
          wanted: m.line.quantity,
          available: m.available,
          name: db.product(m.line.productId)?.name ?? m.line.productId,
        })),
      };
    });
    return json(result, result.reservationId ? 200 : 409);
  },
  { auth: true },
);
