/**
 * Shop sections (for example Women, Men, Kids), made by the owner in the admin panel
 * (/admin/categories). Each product and each category belongs to one section. Stored in the
 * Telegram database (table "sections"); until the owner changes anything, Women and Men are used.
 *
 * Products keep their section's id in the `gender` field (its name from before sections were
 * editable), so renaming a section never touches its products. Free of server code.
 */
import { z } from "zod";

export const sectionIdSchema = z
  .string()
  .min(1)
  .max(30)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid section id");

export const sectionRowSchema = z.object({
  id: sectionIdSchema,
  name: z.string().trim().min(1, "Write the section name.").max(30, "Keep the name short."),
});
export type SectionRow = z.infer<typeof sectionRowSchema>;

export const sectionListSchema = z.array(sectionRowSchema).max(12);

export const DEFAULT_SECTIONS: SectionRow[] = [
  { id: "women", name: "Women" },
  { id: "men", name: "Men" },
];

export function parseSections(rows: unknown): SectionRow[] {
  if (!Array.isArray(rows)) return DEFAULT_SECTIONS;
  const out: SectionRow[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const parsed = sectionRowSchema.safeParse(row);
    if (!parsed.success || seen.has(parsed.data.id)) continue;
    seen.add(parsed.data.id);
    out.push(parsed.data);
  }
  return out;
}

/** A section's name; an id with no section (deleted) is shown in a readable form. */
export function sectionName(list: readonly SectionRow[], id: string): string {
  return (
    list.find((s) => s.id === id)?.name ??
    id.replace(/-/g, " ").replace(/^\w/, (ch) => ch.toUpperCase())
  );
}

export function newSectionId(name: string, list: readonly SectionRow[]): string {
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24)
      .replace(/-+$/g, "") || "section";
  const taken = new Set(list.map((s) => s.id));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}
