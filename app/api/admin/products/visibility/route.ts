import { z } from "zod";
import { productIdSchema } from "@/lib/schemas";
import { adminPost } from "@/lib/server/admin";
import { setProductHidden } from "@/lib/server/adminStore";
import { json } from "@/lib/server/http";

export const runtime = "nodejs";

export const POST = adminPost(
  z.object({ id: productIdSchema, hidden: z.boolean() }),
  async ({ id, hidden }) => {
    await setProductHidden(id, hidden);
    return json({ ok: true });
  },
);
