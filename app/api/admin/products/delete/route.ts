import { z } from "zod";
import { productIdSchema } from "@/lib/schemas";
import { adminPost } from "@/lib/server/admin";
import { deleteProduct } from "@/lib/server/adminStore";
import { json } from "@/lib/server/http";

export const runtime = "nodejs";

export const POST = adminPost(z.object({ id: productIdSchema }), async ({ id }) => {
  await deleteProduct(id);
  return json({ ok: true });
});
