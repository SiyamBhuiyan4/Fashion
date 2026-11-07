/** The owner's categories, with how many products each has, and saving the list. */
import { z } from "zod";
import { categoryListSchema } from "@/lib/categories";
import { adminGet, adminPost } from "@/lib/server/admin";
import { loadAdmin, saveCategories } from "@/lib/server/adminStore";
import { json } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = adminGet(async () => {
  const { categories, products } = await loadAdmin();
  const counts: Record<string, number> = {};
  for (const p of products) {
    const key = `${p.gender}|${p.category}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return json({ categories, counts });
});

export const POST = adminPost(z.object({ categories: categoryListSchema }), async (input) =>
  json({ categories: await saveCategories(input.categories) }),
);
