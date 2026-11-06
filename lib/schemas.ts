import { z } from "zod";

export const genderSchema = z.enum(["men", "women"]);
export type Gender = z.infer<typeof genderSchema>;

export const categorySchema = z.enum(["tops", "bottoms", "outerwear", "shoes"]);
export type Category = z.infer<typeof categorySchema>;

/** Outfit slots on the avatar. A dress occupies both "top" and "bottom". */
export const slotSchema = z.enum(["top", "bottom", "outerwear", "shoes"]);
export type Slot = z.infer<typeof slotSchema>;

export const productIdSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid product id");

export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected #rrggbb");

export const colorNameSchema = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[\p{L}\p{N} '-]+$/u, "Invalid color name");

export const sizeSchema = z
  .string()
  .min(1)
  .max(8)
  .regex(/^[A-Z0-9.]+$/, "Invalid size");

export const garmentKindSchema = z.enum([
  // tops
  "tee",
  "polo",
  "shirt",
  "tank",
  "sweater",
  "dress",
  // bottoms
  "jeans",
  "trousers",
  "shorts",
  "skirt",
  // outerwear
  "jacket",
  "blazer",
  "coat",
  "hoodie",
  // shoes
  "sneakers",
  "boots",
  "loafers",
  "flats",
  "heels",
]);
export type GarmentKind = z.infer<typeof garmentKindSchema>;

export const fabricSchema = z.enum([
  "cotton",
  "denim",
  "knit",
  "linen",
  "silk",
  "wool",
  "leather",
  "suede",
  "canvas",
  "nylon",
]);
export type Fabric = z.infer<typeof fabricSchema>;

/**
 * Parameters for the procedural 3D garment. `modelUrl` is reserved for swapping in a
 * real compressed GLB later (see scripts/optimize-models.mjs) without touching the UI.
 */
export const garmentSpecSchema = z.object({
  kind: garmentKindSchema,
  fabric: fabricSchema,
  sleeve: z.enum(["none", "short", "long"]).optional(),
  /** 0..1 — meaning depends on kind (hem length for skirts/dresses/coats/shorts). */
  length: z.number().min(0).max(1).optional(),
  fit: z.enum(["slim", "regular", "relaxed", "wide"]).default("regular"),
  collar: z.boolean().optional(),
  accentHex: hexColorSchema.optional(),
  modelUrl: z
    .string()
    .regex(/^\/models\/garments\/(men|women)\/[a-z0-9-]+\.glb$/)
    .optional(),
});
export type GarmentSpec = z.infer<typeof garmentSpecSchema>;

/**
 * Media lives on Telegram and is served through /api/tg/<file_id>.<ext> (app/api/tg), so links
 * never expire. Files under /images/products are still accepted for anything shipped in the repo.
 */
export const mediaUrlSchema = z.union([
  z.string().regex(/^\/api\/tg\/[A-Za-z0-9_-]{10,200}\.(webp|jpg|jpeg|png|avif)$/),
  z.string().regex(/^\/images\/products\/[a-z0-9-]+\.webp$/),
]);

export const productColorSchema = z.object({
  name: colorNameSchema,
  hex: hexColorSchema,
  /** Flat-lay artwork for this colourway, generated and uploaded by scripts/seed-db.ts. */
  image: mediaUrlSchema.optional(),
});
export type ProductColor = z.infer<typeof productColorSchema>;

export const productSchema = z
  .object({
    id: productIdSchema,
    name: z.string().min(2).max(80),
    gender: genderSchema,
    category: categorySchema,
    /** Price in whole Bangladeshi Taka. */
    price: z.number().int().positive().max(1_000_000),
    description: z.string().min(10).max(1000),
    colors: z.array(productColorSchema).min(1).max(8),
    sizes: z.array(sizeSchema).min(1).max(12),
    /** Units in stock per size. */
    stock: z.record(sizeSchema, z.number().int().min(0)),
    garment: garmentSpecSchema,
    /** Optional real product photos under /images/products (webp). */
    images: z.array(mediaUrlSchema).max(8).optional(),
    tags: z.array(z.string().max(24)).max(6).optional(),
  })
  .superRefine((p, ctx) => {
    for (const size of p.sizes) {
      if (!(size in p.stock)) {
        ctx.addIssue({ code: "custom", message: `Missing stock for size ${size}`, path: ["stock"] });
      }
    }
    if (p.id.startsWith("m-") !== (p.gender === "men")) {
      ctx.addIssue({ code: "custom", message: "Id prefix must match gender (m-/w-)", path: ["id"] });
    }
  });
export type Product = z.infer<typeof productSchema>;

export const catalogSchema = z.array(productSchema).superRefine((list, ctx) => {
  const seen = new Set<string>();
  for (const p of list) {
    if (seen.has(p.id)) ctx.addIssue({ code: "custom", message: `Duplicate id ${p.id}` });
    seen.add(p.id);
  }
});

/** Search params accepted by /men and /women (e.g. from "Try on in 3D"). */
export const tryOnParamsSchema = z.object({
  wear: productIdSchema.optional(),
  color: colorNameSchema.optional(),
});

/** Cart persisted in localStorage — never trusted, always re-validated. */
export const cartItemSchema = z.object({
  productId: productIdSchema,
  colorName: colorNameSchema,
  size: sizeSchema,
  quantity: z.number().int().min(1).max(10),
});
export type CartItem = z.infer<typeof cartItemSchema>;
export const cartStateSchema = z.object({ items: z.array(cartItemSchema).max(100) });

export const skinToneIdSchema = z.string().regex(/^[a-z-]{2,20}$/);
export const prefsStateSchema = z.object({
  skinTone: z.object({ men: skinToneIdSchema, women: skinToneIdSchema }),
});
