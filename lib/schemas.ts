import { z } from "zod";

export const genderSchema = z.enum(["men", "women"]);
export type Gender = z.infer<typeof genderSchema>;

/** Shop categories, in tab order. Bangladeshi wear first, then everyday basics. */
export const categorySchema = z.enum([
  "panjabi",
  "saree",
  "three-piece",
  "kurti",
  "modest",
  "outerwear",
  "tops",
  "bottoms",
  "shoes",
]);
export type Category = z.infer<typeof categorySchema>;

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
  .regex(/^[\p{L}\p{N} '&-]+$/u, "Invalid color name");

export const sizeSchema = z
  .string()
  .min(1)
  .max(8)
  .regex(/^[A-Z0-9.]+$/, "Invalid size");

export const garmentKindSchema = z.enum([
  // Bangladeshi and South Asian wear
  "panjabi",
  "fatua",
  "kabli",
  "koti",
  "sherwani",
  "saree",
  "kameez",
  "kurti",
  "lehenga",
  "abaya",
  "hijab",
  "palazzo",
  "sandals",
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
  "khadi",
  "jamdani",
  "katan",
  "lawn",
  "georgette",
  "chiffon",
  "jacquard",
  "velvet",
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

/** What the garment is, used to draw its flat-lay artwork (scripts/product-art.ts). */
export const garmentSpecSchema = z.object({
  kind: garmentKindSchema,
  fabric: fabricSchema,
  sleeve: z.enum(["none", "short", "long"]).optional(),
  /** 0..1 — meaning depends on kind (hem length for skirts/dresses/coats/shorts). */
  length: z.number().min(0).max(1).optional(),
  fit: z.enum(["slim", "regular", "relaxed", "wide"]).default("regular"),
  collar: z.boolean().optional(),
  accentHex: hexColorSchema.optional(),
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

const telegramFileIdSchema = z.string().regex(/^[A-Za-z0-9_-]{10,200}$/);

/**
 * A product video as the page sees it. `url` is an HLS playlist built by /api/video from the
 * "videos" table; the pieces themselves are files in the Telegram channel.
 */
export const productVideoSchema = z.object({
  url: z.string().regex(/^\/api\/video\/[a-z0-9-]{3,64}\/master\.m3u8$/),
  poster: z
    .string()
    .regex(/^\/api\/tg\/[A-Za-z0-9_-]{10,200}\.jpg$/)
    .optional(),
  width: z.number().int().positive().max(8192),
  height: z.number().int().positive().max(8192),
  duration: z
    .number()
    .positive()
    .max(3 * 3600),
});
export type ProductVideo = z.infer<typeof productVideoSchema>;

/** One quality level of a video: its pieces, in order. Every piece is under 20 MB. */
export const videoRenditionSchema = z.object({
  name: z.string().regex(/^[a-z0-9]{2,12}$/),
  width: z.number().int().positive().max(8192),
  height: z.number().int().positive().max(8192),
  bandwidth: z.number().int().positive().max(500_000_000),
  codecs: z.string().regex(/^[a-z0-9.,]{4,60}$/),
  segments: z
    .array(z.object({ d: z.number().positive().max(60), f: telegramFileIdSchema }))
    .min(1)
    .max(20_000),
});
export type VideoRendition = z.infer<typeof videoRenditionSchema>;

/** Row of the "videos" table: one video per product, written by scripts/upload-videos.ts. */
export const videoRowSchema = z.object({
  productId: productIdSchema,
  poster: productVideoSchema.shape.poster,
  width: productVideoSchema.shape.width,
  height: productVideoSchema.shape.height,
  duration: productVideoSchema.shape.duration,
  renditions: z.array(videoRenditionSchema).min(1).max(6),
  hash: z.string().max(64),
  bytes: z.number().int().positive(),
  updatedAt: z.string().max(40),
});
export type VideoRow = z.infer<typeof videoRowSchema>;

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
    /** Product video, merged in from the "videos" table (lib/products.server.ts). */
    video: productVideoSchema.optional(),
    /** Optional real product photos under /images/products (webp). */
    images: z.array(mediaUrlSchema).max(8).optional(),
    tags: z.array(z.string().max(24)).max(6).optional(),
  })
  .superRefine((p, ctx) => {
    for (const size of p.sizes) {
      if (!(size in p.stock)) {
        ctx.addIssue({
          code: "custom",
          message: `Missing stock for size ${size}`,
          path: ["stock"],
        });
      }
    }
    if (p.id.startsWith("m-") !== (p.gender === "men")) {
      ctx.addIssue({
        code: "custom",
        message: "Id prefix must match gender (m-/w-)",
        path: ["id"],
      });
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

/** Cart persisted in localStorage — never trusted, always re-validated. */
export const cartItemSchema = z.object({
  productId: productIdSchema,
  colorName: colorNameSchema,
  size: sizeSchema,
  quantity: z.number().int().min(1).max(10),
});
export type CartItem = z.infer<typeof cartItemSchema>;
export const cartStateSchema = z.object({ items: z.array(cartItemSchema).max(100) });
