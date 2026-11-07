/**
 * Shop settings the owner changes from the admin panel (/admin/settings): the WhatsApp number
 * orders are sent to, contact details and the delivery charge shown to customers. Stored in the
 * Telegram database (table "settings", one row) and shared with the browser, so this file must
 * stay free of server code.
 */
import { z } from "zod";

const bdPhone = z
  .string()
  .trim()
  .regex(/^(?:01[3-9]\d{8})?$/, "Use an 11-digit mobile number, e.g. 01712345678");

const taka = z.number().int().min(0).max(100_000);

export const settingsSchema = z.object({
  /** Orders are sent to this number on WhatsApp. */
  whatsapp: z
    .string()
    .trim()
    .regex(/^01[3-9]\d{8}$/, "Enter the WhatsApp number as 11 digits, e.g. 01602066018"),
  /** Shown in the footer. */
  phone: bdPhone,
  address: z.string().trim().max(160),
  facebook: z.string().trim().max(200),
  /** A line that scrolls across the top of the shop. Separate items with "|". */
  announcement: z.string().trim().max(300),

  deliveryInsideDhaka: taka,
  deliveryOutsideDhaka: taka,
  daysInsideDhaka: z.number().int().min(1).max(30),
  daysOutsideDhaka: z.number().int().min(1).max(30),
});
export type Settings = z.infer<typeof settingsSchema>;

export const defaultSettings: Settings = {
  whatsapp: "01602066018",
  phone: "01602066018",
  address: "Kamrangir Char, Dhaka",
  facebook: "https://www.facebook.com/profile.php?id=61595552061446",
  announcement: "",
  deliveryInsideDhaka: 70,
  deliveryOutsideDhaka: 130,
  daysInsideDhaka: 2,
  daysOutsideDhaka: 4,
};

/** Reads the stored row, filling anything missing or invalid with the default. */
export function parseSettings(rows: unknown): Settings {
  const row = Array.isArray(rows) ? rows[0] : rows;
  if (!row || typeof row !== "object") return defaultSettings;
  const merged: Record<string, unknown> = { ...defaultSettings };
  for (const [key, value] of Object.entries(row)) {
    const field = settingsSchema.shape[key as keyof Settings];
    if (field && field.safeParse(value).success) merged[key] = value;
  }
  return settingsSchema.parse(merged);
}

export type DeliveryFeesLike = Pick<
  Settings,
  "deliveryInsideDhaka" | "deliveryOutsideDhaka" | "daysInsideDhaka" | "daysOutsideDhaka"
>;
