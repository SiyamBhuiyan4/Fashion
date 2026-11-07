/** The two "Show on top" products of the home page. */
import { z } from "zod";
import { productIdSchema } from "@/lib/schemas";
import { adminGet, adminPost } from "@/lib/server/admin";
import { loadAdmin, setFeatured } from "@/lib/server/adminStore";
import { json } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = adminGet(async () => json({ featured: (await loadAdmin()).featured }));

export const POST = adminPost(
  z.object({ id: productIdSchema, on: z.boolean() }),
  async ({ id, on }) => json({ featured: await setFeatured(id, on) }),
);
