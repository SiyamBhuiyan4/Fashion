import type { Product } from "@/lib/schemas";

/**
 * Catalog source of truth for the demo. Validated by lib/products.ts against the zod
 * schema at module load, so a malformed entry fails loudly at build time.
 *
 * Replacing this file with a database or API call only requires changing lib/products.ts —
 * no UI component imports this file directly.
 */

const sizesApparel = ["XS", "S", "M", "L", "XL"];
const sizesShoesMen = ["40", "41", "42", "43", "44"];
const sizesShoesWomen = ["36", "37", "38", "39", "40"];

const stockApparel = { XS: 4, S: 9, M: 12, L: 7, XL: 3 };
const stockApparelLow = { XS: 0, S: 2, M: 1, L: 0, XL: 0 };
const stockShoesMen = { "40": 3, "41": 6, "42": 8, "43": 5, "44": 2 };
const stockShoesWomen = { "36": 4, "37": 7, "38": 8, "39": 4, "40": 2 };

export const products: Product[] = [
  // ---------------------------------------------------------------- MEN · TOPS
  {
    id: "m-tee-essential",
    name: "Essential Cotton Tee",
    gender: "men",
    category: "tops",
    price: 1290,
    description:
      "A midweight combed-cotton crew neck cut straight through the body. The shoulder seam sits exactly on the bone, so it layers under a jacket without bunching.",
    colors: [
      { name: "Chalk", hex: "#efeae1" },
      { name: "Black", hex: "#1b1b1d" },
      { name: "Olive", hex: "#5a6150" },
      { name: "Clay", hex: "#b4705a" },
    ],
    sizes: sizesApparel,
    stock: stockApparel,
    garment: { kind: "tee", fabric: "cotton", sleeve: "short", fit: "regular" },
    tags: ["everyday"],
  },
  {
    id: "m-oxford-shirt",
    name: "Oxford Button-Down",
    gender: "men",
    category: "tops",
    price: 3450,
    description:
      "Woven oxford cotton with a soft roll collar and a single patch pocket. Finished with mother-of-pearl buttons and a split back yoke for movement.",
    colors: [
      { name: "White", hex: "#f6f4f0" },
      { name: "Sky", hex: "#9db7cf" },
      { name: "Sand", hex: "#cbb89c" },
    ],
    sizes: sizesApparel,
    stock: stockApparel,
    garment: { kind: "shirt", fabric: "cotton", sleeve: "long", fit: "regular", collar: true },
  },
  {
    id: "m-polo-pique",
    name: "Piqué Polo",
    gender: "men",
    category: "tops",
    price: 2190,
    description:
      "Textured piqué knit with a ribbed collar and a two-button placket. Holds its shape through the day and dries flat.",
    colors: [
      { name: "Navy", hex: "#273349" },
      { name: "Stone", hex: "#cfc6b8" },
      { name: "Burgundy", hex: "#6c2b33" },
    ],
    sizes: sizesApparel,
    stock: stockApparel,
    garment: { kind: "polo", fabric: "knit", sleeve: "short", fit: "slim", collar: true },
  },
  {
    id: "m-merino-sweater",
    name: "Merino Crew Sweater",
    gender: "men",
    category: "tops",
    price: 4890,
    description:
      "Fine-gauge merino wool knitted in a clean crew neck. Warm without weight, with ribbed cuffs and hem that stay snug.",
    colors: [
      { name: "Charcoal", hex: "#3b3d42" },
      { name: "Oat", hex: "#d6c9b0" },
      { name: "Forest", hex: "#36473c" },
    ],
    sizes: sizesApparel,
    stock: stockApparelLow,
    garment: { kind: "sweater", fabric: "wool", sleeve: "long", fit: "regular" },
    tags: ["low stock"],
  },

  // ------------------------------------------------------------- MEN · BOTTOMS
  {
    id: "m-slim-jeans",
    name: "Slim Rigid Jeans",
    gender: "men",
    category: "bottoms",
    price: 3990,
    description:
      "Rigid 13oz denim with a mid rise and a slim leg that tapers below the knee. Breaks in to the shape of the wearer over a few weeks.",
    colors: [
      { name: "Indigo", hex: "#2f4057" },
      { name: "Washed Black", hex: "#2a2a2c" },
      { name: "Stone Wash", hex: "#7b93a8" },
    ],
    sizes: sizesApparel,
    stock: stockApparel,
    garment: { kind: "jeans", fabric: "denim", fit: "slim", length: 1 },
  },
  {
    id: "m-pleated-trouser",
    name: "Pleated Wool Trouser",
    gender: "men",
    category: "bottoms",
    price: 4590,
    description:
      "A single forward pleat and a wide straight leg in tropical-weight wool. Sits at the natural waist and drapes without clinging.",
    colors: [
      { name: "Graphite", hex: "#45474c" },
      { name: "Taupe", hex: "#9a8c78" },
      { name: "Ink", hex: "#232838" },
    ],
    sizes: sizesApparel,
    stock: stockApparel,
    garment: { kind: "trousers", fabric: "wool", fit: "wide", length: 1 },
  },
  {
    id: "m-cargo-short",
    name: "Canvas Cargo Short",
    gender: "men",
    category: "bottoms",
    price: 2290,
    description:
      "Cotton canvas cut just above the knee with roomy side pockets and a webbing-ready waistband.",
    colors: [
      { name: "Khaki", hex: "#a79469" },
      { name: "Black", hex: "#24242a" },
      { name: "Moss", hex: "#5d6347" },
    ],
    sizes: sizesApparel,
    stock: stockApparel,
    garment: { kind: "shorts", fabric: "canvas", fit: "relaxed", length: 0.45 },
  },

  // ----------------------------------------------------------- MEN · OUTERWEAR
  {
    id: "m-denim-jacket",
    name: "Type II Denim Jacket",
    gender: "men",
    category: "outerwear",
    price: 5490,
    description:
      "A boxy denim jacket with pleated front panels, two chest flap pockets and a cinch tab at each hip.",
    colors: [
      { name: "Mid Indigo", hex: "#3b5273" },
      { name: "Ecru", hex: "#ded5c4" },
    ],
    sizes: sizesApparel,
    stock: stockApparel,
    garment: {
      kind: "jacket",
      fabric: "denim",
      sleeve: "long",
      fit: "relaxed",
      collar: true,
      length: 0.55,
    },
  },
  {
    id: "m-wool-blazer",
    name: "Unstructured Wool Blazer",
    gender: "men",
    category: "outerwear",
    price: 8990,
    description:
      "Half-lined and unpadded, so it moves like a shirt. Notch lapels, two buttons and patch pockets in a mid-grey wool hopsack.",
    colors: [
      { name: "Grey Melange", hex: "#6c6f76" },
      { name: "Navy", hex: "#2b3550" },
    ],
    sizes: sizesApparel,
    stock: stockApparelLow,
    garment: {
      kind: "blazer",
      fabric: "wool",
      sleeve: "long",
      fit: "regular",
      collar: true,
      length: 0.62,
    },
    tags: ["low stock"],
  },
  {
    id: "m-hooded-parka",
    name: "Hooded Shell Parka",
    gender: "men",
    category: "outerwear",
    price: 7490,
    description:
      "A long nylon shell with taped seams, a drawcord waist and a storm hood. Cut wide enough to wear over a sweater.",
    colors: [
      { name: "Slate", hex: "#4a5560" },
      { name: "Sand", hex: "#bda887" },
      { name: "Black", hex: "#1f2124" },
    ],
    sizes: sizesApparel,
    stock: stockApparel,
    garment: {
      kind: "coat",
      fabric: "nylon",
      sleeve: "long",
      fit: "relaxed",
      collar: true,
      length: 0.8,
    },
  },

  // --------------------------------------------------------------- MEN · SHOES
  {
    id: "m-court-sneaker",
    name: "Leather Court Sneaker",
    gender: "men",
    category: "shoes",
    price: 5990,
    description:
      "A low-profile court shoe in smooth leather on a vulcanised rubber sole, with a padded collar and a perforated toe.",
    colors: [
      { name: "White", hex: "#eeebe4" },
      { name: "Black", hex: "#20201f" },
    ],
    sizes: sizesShoesMen,
    stock: stockShoesMen,
    garment: { kind: "sneakers", fabric: "leather", fit: "regular" },
  },
  {
    id: "m-chelsea-boot",
    name: "Suede Chelsea Boot",
    gender: "men",
    category: "shoes",
    price: 8490,
    description:
      "Ankle-height suede with elastic side gores and a pull tab at the heel, set on a stacked leather sole.",
    colors: [
      { name: "Tobacco", hex: "#7c4e2d" },
      { name: "Charcoal", hex: "#3a3a3d" },
    ],
    sizes: sizesShoesMen,
    stock: stockShoesMen,
    garment: { kind: "boots", fabric: "suede", fit: "regular" },
  },

  // -------------------------------------------------------------- WOMEN · TOPS
  {
    id: "w-silk-blouse",
    name: "Silk Shell Blouse",
    gender: "women",
    category: "tops",
    price: 4290,
    description:
      "Washed silk with a soft shoulder and a straight hem that sits at the hip. Light enough to tuck, structured enough to wear loose.",
    colors: [
      { name: "Ivory", hex: "#f0e8dc" },
      { name: "Black", hex: "#1d1c1f" },
      { name: "Rosewood", hex: "#9c5f63" },
      { name: "Sage", hex: "#8f9d86" },
    ],
    sizes: sizesApparel,
    stock: stockApparel,
    garment: { kind: "shirt", fabric: "silk", sleeve: "short", fit: "regular", collar: true },
  },
  {
    id: "w-ribbed-tank",
    name: "Ribbed Knit Tank",
    gender: "women",
    category: "tops",
    price: 1590,
    description:
      "A close rib knit with narrow straps and a scoop neck. Stretches with the body and returns to shape.",
    colors: [
      { name: "White", hex: "#f2efe9" },
      { name: "Espresso", hex: "#43332b" },
      { name: "Butter", hex: "#e8d79b" },
    ],
    sizes: sizesApparel,
    stock: stockApparel,
    garment: { kind: "tank", fabric: "knit", sleeve: "none", fit: "slim" },
    tags: ["everyday"],
  },
  {
    id: "w-slip-dress",
    name: "Bias Slip Dress",
    gender: "women",
    category: "tops",
    price: 6490,
    description:
      "Cut on the bias so it falls in a long column and skims rather than grips. Midi length with a low back and adjustable straps.",
    colors: [
      { name: "Champagne", hex: "#dcc9a8" },
      { name: "Midnight", hex: "#232a3d" },
      { name: "Plum", hex: "#5d3448" },
    ],
    sizes: sizesApparel,
    stock: stockApparel,
    garment: { kind: "dress", fabric: "silk", sleeve: "none", fit: "slim", length: 0.78 },
    tags: ["dress"],
  },
  {
    id: "w-cashmere-crew",
    name: "Cashmere Crew",
    gender: "women",
    category: "tops",
    price: 7890,
    description:
      "Two-ply cashmere in a relaxed crew neck with dropped shoulders and a slightly cropped hem.",
    colors: [
      { name: "Camel", hex: "#c39a6b" },
      { name: "Dove", hex: "#c7c4bd" },
      { name: "Navy", hex: "#2a3350" },
    ],
    sizes: sizesApparel,
    stock: stockApparelLow,
    garment: { kind: "sweater", fabric: "wool", sleeve: "long", fit: "relaxed" },
    tags: ["low stock"],
  },

  // ----------------------------------------------------------- WOMEN · BOTTOMS
  {
    id: "w-wide-jeans",
    name: "High-Rise Wide Jeans",
    gender: "women",
    category: "bottoms",
    price: 4190,
    description:
      "Rigid denim with a high waist and a full straight leg that falls from the hip without a break.",
    colors: [
      { name: "Light Indigo", hex: "#6b88a6" },
      { name: "Deep Indigo", hex: "#2d3c54" },
      { name: "Ecru", hex: "#ddd3c1" },
    ],
    sizes: sizesApparel,
    stock: stockApparel,
    garment: { kind: "jeans", fabric: "denim", fit: "wide", length: 1 },
  },
  {
    id: "w-midi-skirt",
    name: "Bias Midi Skirt",
    gender: "women",
    category: "bottoms",
    price: 3690,
    description:
      "A bias-cut midi in matte satin that swings as you walk. Hidden side zip, no slit.",
    colors: [
      { name: "Olive", hex: "#6d7353" },
      { name: "Black", hex: "#1f1e21" },
      { name: "Terracotta", hex: "#a8603f" },
    ],
    sizes: sizesApparel,
    stock: stockApparel,
    garment: { kind: "skirt", fabric: "silk", fit: "regular", length: 0.72 },
  },
  {
    id: "w-tailored-trouser",
    name: "Tailored Wool Trouser",
    gender: "women",
    category: "bottoms",
    price: 5290,
    description:
      "A long, clean trouser with a flat front, side-seam pockets and a straight leg that just brushes the floor.",
    colors: [
      { name: "Charcoal", hex: "#3f4248" },
      { name: "Cream", hex: "#e3d9c6" },
      { name: "Chocolate", hex: "#4b352a" },
    ],
    sizes: sizesApparel,
    stock: stockApparel,
    garment: { kind: "trousers", fabric: "wool", fit: "regular", length: 1 },
  },

  // --------------------------------------------------------- WOMEN · OUTERWEAR
  {
    id: "w-trench-coat",
    name: "Cotton Trench Coat",
    gender: "women",
    category: "outerwear",
    price: 9890,
    description:
      "Water-resistant cotton gabardine with a double-breasted front, storm flap and a belted waist. Falls below the knee.",
    colors: [
      { name: "Honey", hex: "#c0a173" },
      { name: "Black", hex: "#212024" },
    ],
    sizes: sizesApparel,
    stock: stockApparel,
    garment: {
      kind: "coat",
      fabric: "cotton",
      sleeve: "long",
      fit: "regular",
      collar: true,
      length: 0.85,
    },
  },
  {
    id: "w-cropped-blazer",
    name: "Cropped Wool Blazer",
    gender: "women",
    category: "outerwear",
    price: 7290,
    description:
      "A short, sharp blazer with strong shoulders, peak lapels and a single button at the waist.",
    colors: [
      { name: "Ink", hex: "#262c3e" },
      { name: "Bone", hex: "#ded4c2" },
      { name: "Scarlet", hex: "#8e2f33" },
    ],
    sizes: sizesApparel,
    stock: stockApparelLow,
    garment: {
      kind: "blazer",
      fabric: "wool",
      sleeve: "long",
      fit: "slim",
      collar: true,
      length: 0.5,
    },
  },
  {
    id: "w-zip-hoodie",
    name: "Brushed Zip Hoodie",
    gender: "women",
    category: "outerwear",
    price: 3290,
    description:
      "Heavyweight brushed-back cotton with a lined hood, a full-length zip and deep kangaroo pockets.",
    colors: [
      { name: "Heather Grey", hex: "#a3a3a1" },
      { name: "Faded Rose", hex: "#c08f90" },
      { name: "Black", hex: "#232325" },
    ],
    sizes: sizesApparel,
    stock: stockApparel,
    garment: {
      kind: "hoodie",
      fabric: "cotton",
      sleeve: "long",
      fit: "relaxed",
      collar: false,
      length: 0.52,
    },
  },

  // ------------------------------------------------------------- WOMEN · SHOES
  {
    id: "w-leather-flat",
    name: "Pointed Leather Flat",
    gender: "women",
    category: "shoes",
    price: 5490,
    description: "A soft pointed flat in nappa leather with a cushioned insole and a thin sole.",
    colors: [
      { name: "Black", hex: "#1f1e20" },
      { name: "Bone", hex: "#ddd2bf" },
      { name: "Oxblood", hex: "#6a2b2f" },
    ],
    sizes: sizesShoesWomen,
    stock: stockShoesWomen,
    garment: { kind: "flats", fabric: "leather", fit: "regular" },
  },
  {
    id: "w-block-heel",
    name: "Block Heel Sandal",
    gender: "women",
    category: "shoes",
    price: 6290,
    description:
      "A 60mm block heel with a wide ankle strap and a squared toe, built on a padded footbed.",
    colors: [
      { name: "Tan", hex: "#a97b50" },
      { name: "Black", hex: "#222124" },
    ],
    sizes: sizesShoesWomen,
    stock: stockShoesWomen,
    garment: { kind: "heels", fabric: "leather", fit: "regular" },
  },
  {
    id: "w-runner-sneaker",
    name: "Retro Runner",
    gender: "women",
    category: "shoes",
    price: 4890,
    description:
      "A low suede-and-mesh runner on a gum sole, with a soft foam midsole and a slim silhouette.",
    colors: [
      { name: "Off White", hex: "#e9e4d9" },
      { name: "Sage", hex: "#93a089" },
    ],
    sizes: sizesShoesWomen,
    stock: stockShoesWomen,
    garment: { kind: "sneakers", fabric: "suede", fit: "regular" },
  },
];
