/**
 * The product form of the admin panel: what the owner fills in, checked the same way in the
 * browser and on the server. Free of server code so the form can import it.
 */
import { z } from "zod";
import {
  categorySchema,
  fabricSchema,
  garmentKindSchema,
  genderSchema,
  mediaUrlSchema,
  productColorSchema,
  productIdSchema,
  sizeSchema,
  type Category,
  type Fabric,
  type GarmentKind,
  type Gender,
} from "@/lib/schemas";

export const adminProductSchema = z.object({
  id: productIdSchema.optional(),
  gender: genderSchema,
  name: z.string().trim().min(2, "Write the product name.").max(80, "The name is too long."),
  category: categorySchema,
  price: z
    .number({ message: "Enter the price in Taka." })
    .int("Use a whole number of Taka.")
    .positive("Enter the price in Taka.")
    .max(1_000_000),
  description: z
    .string()
    .trim()
    .min(10, "Write at least one sentence about the piece.")
    .max(1000, "The description is too long (1000 letters max)."),
  colors: z.array(productColorSchema).min(1, "Add at least one colour.").max(8),
  sizes: z.array(sizeSchema).min(1, "Choose at least one size.").max(12),
  stock: z.record(sizeSchema, z.number().int().min(0).max(100_000)),
  images: z.array(mediaUrlSchema).max(12),
  kind: garmentKindSchema,
  fabric: fabricSchema,
  tags: z.array(z.string().trim().min(1).max(24)).max(6),
  hidden: z.boolean(),
});
export type AdminProductInput = z.infer<typeof adminProductSchema>;

/** Size sets the owner can pick with one tap. "FREE" is shown as "Free size". */
export const SIZE_PRESETS: Array<{ label: string; sizes: string[] }> = [
  { label: "S – XXL", sizes: ["S", "M", "L", "XL", "XXL"] },
  { label: "Free size", sizes: ["FREE"] },
  { label: "Numbers 32 – 44", sizes: ["32", "34", "36", "38", "40", "42", "44"] },
  { label: "Shoes 36 – 41", sizes: ["36", "37", "38", "39", "40", "41"] },
];

export function sizeLabel(size: string): string {
  return size === "FREE" ? "Free size" : size;
}

/** What a new product in each category is, until the owner says otherwise. */
export const CATEGORY_DEFAULTS: Record<
  Gender,
  Record<Category, { kind: GarmentKind; fabric: Fabric }>
> = {
  women: {
    saree: { kind: "saree", fabric: "cotton" },
    "three-piece": { kind: "kameez", fabric: "lawn" },
    kurti: { kind: "kurti", fabric: "cotton" },
    modest: { kind: "abaya", fabric: "georgette" },
    tops: { kind: "dress", fabric: "georgette" },
    bottoms: { kind: "palazzo", fabric: "cotton" },
    outerwear: { kind: "jacket", fabric: "wool" },
    shoes: { kind: "sandals", fabric: "leather" },
    panjabi: { kind: "kurti", fabric: "cotton" },
  },
  men: {
    panjabi: { kind: "panjabi", fabric: "cotton" },
    tops: { kind: "shirt", fabric: "cotton" },
    bottoms: { kind: "trousers", fabric: "cotton" },
    outerwear: { kind: "koti", fabric: "cotton" },
    shoes: { kind: "sandals", fabric: "leather" },
    saree: { kind: "panjabi", fabric: "cotton" },
    "three-piece": { kind: "panjabi", fabric: "cotton" },
    kurti: { kind: "panjabi", fabric: "cotton" },
    modest: { kind: "panjabi", fabric: "cotton" },
  },
};

export const KIND_LABELS: Partial<Record<GarmentKind, string>> = {
  saree: "Saree",
  kameez: "Three-piece / Salwar kameez",
  kurti: "Kurti",
  lehenga: "Lehenga",
  abaya: "Abaya / Borka",
  hijab: "Hijab / Scarf",
  palazzo: "Palazzo",
  dress: "Gown / Dress",
  tee: "T-shirt / Top",
  shirt: "Shirt",
  skirt: "Skirt",
  trousers: "Trousers",
  jeans: "Jeans",
  jacket: "Shawl / Jacket",
  coat: "Coat",
  sweater: "Sweater / Cardigan",
  panjabi: "Panjabi",
  fatua: "Fatua",
  kabli: "Kabli",
  koti: "Koti",
  sherwani: "Sherwani",
  polo: "Polo",
  shorts: "Shorts",
  sandals: "Sandals",
  flats: "Flats",
  heels: "Heels",
  sneakers: "Sneakers",
  loafers: "Loafers",
  boots: "Boots",
};

export const FABRIC_LABELS: Record<Fabric, string> = {
  cotton: "Cotton",
  khadi: "Khadi",
  jamdani: "Jamdani",
  katan: "Katan",
  lawn: "Lawn",
  georgette: "Georgette",
  chiffon: "Chiffon",
  jacquard: "Jacquard",
  velvet: "Velvet",
  denim: "Denim",
  knit: "Knit",
  linen: "Linen",
  silk: "Silk",
  wool: "Wool",
  leather: "Leather",
  suede: "Suede",
  canvas: "Canvas",
  nylon: "Nylon",
};
