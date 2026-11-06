/** Prices a bag for a district, read-only: routing, delivery dates, best offer and wallet. */
import { z } from "zod";
import { read } from "@/lib/server/db";
import { cleanLines, priceFor, route, shipmentsFor, warehouseName } from "@/lib/server/checkout";
import { handler, json } from "@/lib/server/http";
import { linesSchema } from "@/lib/server/schemas";
import type { HeldLine } from "@/lib/server/db";

export const runtime = "nodejs";

const schema = z.object({
  lines: linesSchema,
  district: z.string().max(40),
  useWallet: z.boolean().default(true),
  reservationId: z.string().max(40).optional(),
});

export const POST = handler(schema, async (input, { userId }) => {
  const db = await read();
  const lines = cleanLines(db, input.lines);
  const routed = route(db, lines, input.district, input.reservationId);
  if (routed.some((l) => !l)) return json({ error: "Some pieces are no longer available." }, 409);
  const held = routed as HeldLine[];
  const shipments = shipmentsFor(held, input.district).map((s) => ({
    ...s,
    name: warehouseName(s.warehouse),
    items: held.filter((l) => l.warehouse === s.warehouse).reduce((n, l) => n + l.quantity, 0),
  }));
  const shipping = shipments.reduce((s, x) => s + x.fee, 0);
  return json({ shipments, pricing: priceFor(db, userId, held, shipping, input.useWallet) });
});
