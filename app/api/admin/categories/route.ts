/** The owner's sections and categories, with product counts, and saving them. */
import { z } from "zod";
import { categoryListSchema } from "@/lib/categories";
import { sectionListSchema } from "@/lib/sections";
import { adminGet, adminPost } from "@/lib/server/admin";
import { loadAdmin, saveStructure } from "@/lib/server/adminStore";
import { json } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = adminGet(async () => {
  const { categories, sections, products } = await loadAdmin();
  const counts: Record<string, number> = {};
  const sectionCounts: Record<string, number> = {};
  for (const p of products) {
    const key = `${p.gender}|${p.category}`;
    counts[key] = (counts[key] ?? 0) + 1;
    sectionCounts[p.gender] = (sectionCounts[p.gender] ?? 0) + 1;
  }
  return json({ sections, categories, counts, sectionCounts });
});

export const POST = adminPost(
  z.object({ sections: sectionListSchema, categories: categoryListSchema }),
  async (input) => json(await saveStructure(input.sections, input.categories)),
);
