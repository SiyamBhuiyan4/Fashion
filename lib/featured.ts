/**
 * "Show on top": the two products framed at the top of the home page (with the butterflies).
 * The owner picks them in the admin panel. Picking a third drops the first, moves the second up
 * and puts the new one second — always the newest two, oldest first.
 */
import { productIdSchema } from "@/lib/schemas";

export const FEATURED_SLOTS = 2;

export function parseFeatured(rows: unknown): string[] {
  if (!Array.isArray(rows)) return [];
  const ids = rows.filter((r): r is string => productIdSchema.safeParse(r).success);
  return [...new Set(ids)].slice(-FEATURED_SLOTS);
}

/** Adds a product to the end (dropping the oldest when full) or takes it off. */
export function withFeatured(list: string[], id: string, on: boolean): string[] {
  const rest = list.filter((x) => x !== id);
  return on ? [...rest, id].slice(-FEATURED_SLOTS) : rest;
}
