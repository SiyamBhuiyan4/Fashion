import type { Product } from "@/lib/schemas";

/**
 * The catalogue seed. Photos are free-licence images from Pexels (pexels.com/license: free for
 * commercial use, no attribution required), one per colourway, under public/images/products.
 */
export const products: Product[] = [
  {
    id: "m-tee-essential",
    name: "Essential Cotton Tee",
    gender: "men",
    category: "tops",
    price: 1290,
    description:
      "A midweight combed-cotton crew neck cut straight through the body. The shoulder seam sits exactly on the bone, so it layers under a jacket without bunching.",
    colors: [
      {
        name: "Chalk",
        hex: "#efeae1",
        image: "/images/products/m-tee-essential--chalk.webp",
      },
      {
        name: "Black",
        hex: "#1b1b1d",
        image: "/images/products/m-tee-essential--black.webp",
      },
      {
        name: "Olive",
        hex: "#5a6150",
        image: "/images/products/m-tee-essential--olive.webp",
      },
      {
        name: "Clay",
        hex: "#b4705a",
        image: "/images/products/m-tee-essential--clay.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 4,
      S: 9,
      M: 12,
      L: 7,
      XL: 3,
    },
    garment: {
      kind: "tee",
      fabric: "cotton",
      sleeve: "short",
      fit: "regular",
    },
    tags: ["everyday"],
    images: [
      "/images/products/m-tee-essential--chalk.webp",
      "/images/products/m-tee-essential--black.webp",
      "/images/products/m-tee-essential--olive.webp",
      "/images/products/m-tee-essential--clay.webp",
    ],
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
      {
        name: "White",
        hex: "#f6f4f0",
        image: "/images/products/m-oxford-shirt--white.webp",
      },
      {
        name: "Sky",
        hex: "#9db7cf",
        image: "/images/products/m-oxford-shirt--sky.webp",
      },
      {
        name: "Sand",
        hex: "#cbb89c",
        image: "/images/products/m-oxford-shirt--sand.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 4,
      S: 9,
      M: 12,
      L: 7,
      XL: 3,
    },
    garment: {
      kind: "shirt",
      fabric: "cotton",
      sleeve: "long",
      fit: "regular",
      collar: true,
    },
    images: [
      "/images/products/m-oxford-shirt--white.webp",
      "/images/products/m-oxford-shirt--sky.webp",
      "/images/products/m-oxford-shirt--sand.webp",
    ],
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
      {
        name: "Navy",
        hex: "#273349",
        image: "/images/products/m-polo-pique--navy.webp",
      },
      {
        name: "Stone",
        hex: "#cfc6b8",
        image: "/images/products/m-polo-pique--stone.webp",
      },
      {
        name: "Burgundy",
        hex: "#6c2b33",
        image: "/images/products/m-polo-pique--burgundy.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 4,
      S: 9,
      M: 12,
      L: 7,
      XL: 3,
    },
    garment: {
      kind: "polo",
      fabric: "knit",
      sleeve: "short",
      fit: "slim",
      collar: true,
    },
    images: [
      "/images/products/m-polo-pique--navy.webp",
      "/images/products/m-polo-pique--stone.webp",
      "/images/products/m-polo-pique--burgundy.webp",
    ],
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
      {
        name: "Charcoal",
        hex: "#3b3d42",
        image: "/images/products/m-merino-sweater--charcoal.webp",
      },
      {
        name: "Oat",
        hex: "#d6c9b0",
        image: "/images/products/m-merino-sweater--oat.webp",
      },
      {
        name: "Forest",
        hex: "#36473c",
        image: "/images/products/m-merino-sweater--forest.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 0,
      S: 2,
      M: 1,
      L: 0,
      XL: 0,
    },
    garment: {
      kind: "sweater",
      fabric: "wool",
      sleeve: "long",
      fit: "regular",
    },
    tags: ["low stock"],
    images: [
      "/images/products/m-merino-sweater--charcoal.webp",
      "/images/products/m-merino-sweater--oat.webp",
      "/images/products/m-merino-sweater--forest.webp",
    ],
  },
  {
    id: "m-slim-jeans",
    name: "Slim Rigid Jeans",
    gender: "men",
    category: "bottoms",
    price: 3990,
    description:
      "Rigid 13oz denim with a mid rise and a slim leg that tapers below the knee. Breaks in to the shape of the wearer over a few weeks.",
    colors: [
      {
        name: "Indigo",
        hex: "#2f4057",
        image: "/images/products/m-slim-jeans--indigo.webp",
      },
      {
        name: "Washed Black",
        hex: "#2a2a2c",
        image: "/images/products/m-slim-jeans--washed-black.webp",
      },
      {
        name: "Stone Wash",
        hex: "#7b93a8",
        image: "/images/products/m-slim-jeans--stone-wash.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 4,
      S: 9,
      M: 12,
      L: 7,
      XL: 3,
    },
    garment: {
      kind: "jeans",
      fabric: "denim",
      fit: "slim",
      length: 1,
    },
    images: [
      "/images/products/m-slim-jeans--indigo.webp",
      "/images/products/m-slim-jeans--washed-black.webp",
      "/images/products/m-slim-jeans--stone-wash.webp",
    ],
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
      {
        name: "Graphite",
        hex: "#45474c",
        image: "/images/products/m-pleated-trouser--graphite.webp",
      },
      {
        name: "Taupe",
        hex: "#9a8c78",
        image: "/images/products/m-pleated-trouser--taupe.webp",
      },
      {
        name: "Ink",
        hex: "#232838",
        image: "/images/products/m-pleated-trouser--ink.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 4,
      S: 9,
      M: 12,
      L: 7,
      XL: 3,
    },
    garment: {
      kind: "trousers",
      fabric: "wool",
      fit: "wide",
      length: 1,
    },
    images: [
      "/images/products/m-pleated-trouser--graphite.webp",
      "/images/products/m-pleated-trouser--taupe.webp",
      "/images/products/m-pleated-trouser--ink.webp",
    ],
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
      {
        name: "Khaki",
        hex: "#a79469",
        image: "/images/products/m-cargo-short--khaki.webp",
      },
      {
        name: "Black",
        hex: "#24242a",
        image: "/images/products/m-cargo-short--black.webp",
      },
      {
        name: "Moss",
        hex: "#5d6347",
        image: "/images/products/m-cargo-short--moss.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 4,
      S: 9,
      M: 12,
      L: 7,
      XL: 3,
    },
    garment: {
      kind: "shorts",
      fabric: "canvas",
      fit: "relaxed",
      length: 0.45,
    },
    images: [
      "/images/products/m-cargo-short--khaki.webp",
      "/images/products/m-cargo-short--black.webp",
      "/images/products/m-cargo-short--moss.webp",
    ],
  },
  {
    id: "m-denim-jacket",
    name: "Type II Denim Jacket",
    gender: "men",
    category: "outerwear",
    price: 5490,
    description:
      "A boxy denim jacket with pleated front panels, two chest flap pockets and a cinch tab at each hip.",
    colors: [
      {
        name: "Mid Indigo",
        hex: "#3b5273",
        image: "/images/products/m-denim-jacket--mid-indigo.webp",
      },
      {
        name: "Ecru",
        hex: "#ded5c4",
        image: "/images/products/m-denim-jacket--ecru.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 4,
      S: 9,
      M: 12,
      L: 7,
      XL: 3,
    },
    garment: {
      kind: "jacket",
      fabric: "denim",
      sleeve: "long",
      fit: "relaxed",
      collar: true,
      length: 0.55,
    },
    images: [
      "/images/products/m-denim-jacket--mid-indigo.webp",
      "/images/products/m-denim-jacket--ecru.webp",
    ],
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
      {
        name: "Grey Melange",
        hex: "#6c6f76",
        image: "/images/products/m-wool-blazer--grey-melange.webp",
      },
      {
        name: "Navy",
        hex: "#2b3550",
        image: "/images/products/m-wool-blazer--navy.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 0,
      S: 2,
      M: 1,
      L: 0,
      XL: 0,
    },
    garment: {
      kind: "blazer",
      fabric: "wool",
      sleeve: "long",
      fit: "regular",
      collar: true,
      length: 0.62,
    },
    tags: ["low stock"],
    images: [
      "/images/products/m-wool-blazer--grey-melange.webp",
      "/images/products/m-wool-blazer--navy.webp",
    ],
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
      {
        name: "Slate",
        hex: "#4a5560",
        image: "/images/products/m-hooded-parka--slate.webp",
      },
      {
        name: "Sand",
        hex: "#bda887",
        image: "/images/products/m-hooded-parka--sand.webp",
      },
      {
        name: "Black",
        hex: "#1f2124",
        image: "/images/products/m-hooded-parka--black.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 4,
      S: 9,
      M: 12,
      L: 7,
      XL: 3,
    },
    garment: {
      kind: "coat",
      fabric: "nylon",
      sleeve: "long",
      fit: "relaxed",
      collar: true,
      length: 0.8,
    },
    images: [
      "/images/products/m-hooded-parka--slate.webp",
      "/images/products/m-hooded-parka--sand.webp",
      "/images/products/m-hooded-parka--black.webp",
    ],
  },
  {
    id: "m-court-sneaker",
    name: "Leather Court Sneaker",
    gender: "men",
    category: "shoes",
    price: 5990,
    description:
      "A low-profile court shoe in smooth leather on a vulcanised rubber sole, with a padded collar and a perforated toe.",
    colors: [
      {
        name: "White",
        hex: "#eeebe4",
        image: "/images/products/m-court-sneaker--white.webp",
      },
      {
        name: "Black",
        hex: "#20201f",
        image: "/images/products/m-court-sneaker--black.webp",
      },
    ],
    sizes: ["40", "41", "42", "43", "44"],
    stock: {
      "40": 3,
      "41": 6,
      "42": 8,
      "43": 5,
      "44": 2,
    },
    garment: {
      kind: "sneakers",
      fabric: "leather",
      fit: "regular",
    },
    images: [
      "/images/products/m-court-sneaker--white.webp",
      "/images/products/m-court-sneaker--black.webp",
    ],
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
      {
        name: "Tobacco",
        hex: "#7c4e2d",
        image: "/images/products/m-chelsea-boot--tobacco.webp",
      },
      {
        name: "Charcoal",
        hex: "#3a3a3d",
        image: "/images/products/m-chelsea-boot--charcoal.webp",
      },
    ],
    sizes: ["40", "41", "42", "43", "44"],
    stock: {
      "40": 3,
      "41": 6,
      "42": 8,
      "43": 5,
      "44": 2,
    },
    garment: {
      kind: "boots",
      fabric: "suede",
      fit: "regular",
    },
    images: [
      "/images/products/m-chelsea-boot--tobacco.webp",
      "/images/products/m-chelsea-boot--charcoal.webp",
    ],
  },
  {
    id: "w-silk-blouse",
    name: "Silk Shell Blouse",
    gender: "women",
    category: "tops",
    price: 4290,
    description:
      "Washed silk with a soft shoulder and a straight hem that sits at the hip. Light enough to tuck, structured enough to wear loose.",
    colors: [
      {
        name: "Ivory",
        hex: "#f0e8dc",
        image: "/images/products/w-silk-blouse--ivory.webp",
      },
      {
        name: "Black",
        hex: "#1d1c1f",
        image: "/images/products/w-silk-blouse--black.webp",
      },
      {
        name: "Rosewood",
        hex: "#9c5f63",
        image: "/images/products/w-silk-blouse--rosewood.webp",
      },
      {
        name: "Sage",
        hex: "#8f9d86",
        image: "/images/products/w-silk-blouse--sage.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 4,
      S: 9,
      M: 12,
      L: 7,
      XL: 3,
    },
    garment: {
      kind: "shirt",
      fabric: "silk",
      sleeve: "short",
      fit: "regular",
      collar: true,
    },
    images: [
      "/images/products/w-silk-blouse--ivory.webp",
      "/images/products/w-silk-blouse--black.webp",
      "/images/products/w-silk-blouse--rosewood.webp",
      "/images/products/w-silk-blouse--sage.webp",
    ],
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
      {
        name: "White",
        hex: "#f2efe9",
        image: "/images/products/w-ribbed-tank--white.webp",
      },
      {
        name: "Espresso",
        hex: "#43332b",
        image: "/images/products/w-ribbed-tank--espresso.webp",
      },
      {
        name: "Butter",
        hex: "#e8d79b",
        image: "/images/products/w-ribbed-tank--butter.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 4,
      S: 9,
      M: 12,
      L: 7,
      XL: 3,
    },
    garment: {
      kind: "tank",
      fabric: "knit",
      sleeve: "none",
      fit: "slim",
    },
    tags: ["everyday"],
    images: [
      "/images/products/w-ribbed-tank--white.webp",
      "/images/products/w-ribbed-tank--espresso.webp",
      "/images/products/w-ribbed-tank--butter.webp",
    ],
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
      {
        name: "Champagne",
        hex: "#dcc9a8",
        image: "/images/products/w-slip-dress--champagne.webp",
      },
      {
        name: "Midnight",
        hex: "#232a3d",
        image: "/images/products/w-slip-dress--midnight.webp",
      },
      {
        name: "Plum",
        hex: "#5d3448",
        image: "/images/products/w-slip-dress--plum.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 4,
      S: 9,
      M: 12,
      L: 7,
      XL: 3,
    },
    garment: {
      kind: "dress",
      fabric: "silk",
      sleeve: "none",
      fit: "slim",
      length: 0.78,
    },
    tags: ["dress"],
    images: [
      "/images/products/w-slip-dress--champagne.webp",
      "/images/products/w-slip-dress--midnight.webp",
      "/images/products/w-slip-dress--plum.webp",
    ],
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
      {
        name: "Camel",
        hex: "#c39a6b",
        image: "/images/products/w-cashmere-crew--camel.webp",
      },
      {
        name: "Dove",
        hex: "#c7c4bd",
        image: "/images/products/w-cashmere-crew--dove.webp",
      },
      {
        name: "Navy",
        hex: "#2a3350",
        image: "/images/products/w-cashmere-crew--navy.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 0,
      S: 2,
      M: 1,
      L: 0,
      XL: 0,
    },
    garment: {
      kind: "sweater",
      fabric: "wool",
      sleeve: "long",
      fit: "relaxed",
    },
    tags: ["low stock"],
    images: [
      "/images/products/w-cashmere-crew--camel.webp",
      "/images/products/w-cashmere-crew--dove.webp",
      "/images/products/w-cashmere-crew--navy.webp",
    ],
  },
  {
    id: "w-wide-jeans",
    name: "High-Rise Wide Jeans",
    gender: "women",
    category: "bottoms",
    price: 4190,
    description:
      "Rigid denim with a high waist and a full straight leg that falls from the hip without a break.",
    colors: [
      {
        name: "Light Indigo",
        hex: "#6b88a6",
        image: "/images/products/w-wide-jeans--light-indigo.webp",
      },
      {
        name: "Deep Indigo",
        hex: "#2d3c54",
        image: "/images/products/w-wide-jeans--deep-indigo.webp",
      },
      {
        name: "Ecru",
        hex: "#ddd3c1",
        image: "/images/products/w-wide-jeans--ecru.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 4,
      S: 9,
      M: 12,
      L: 7,
      XL: 3,
    },
    garment: {
      kind: "jeans",
      fabric: "denim",
      fit: "wide",
      length: 1,
    },
    images: [
      "/images/products/w-wide-jeans--light-indigo.webp",
      "/images/products/w-wide-jeans--deep-indigo.webp",
      "/images/products/w-wide-jeans--ecru.webp",
    ],
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
      {
        name: "Olive",
        hex: "#6d7353",
        image: "/images/products/w-midi-skirt--olive.webp",
      },
      {
        name: "Black",
        hex: "#1f1e21",
        image: "/images/products/w-midi-skirt--black.webp",
      },
      {
        name: "Terracotta",
        hex: "#a8603f",
        image: "/images/products/w-midi-skirt--terracotta.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 4,
      S: 9,
      M: 12,
      L: 7,
      XL: 3,
    },
    garment: {
      kind: "skirt",
      fabric: "silk",
      fit: "regular",
      length: 0.72,
    },
    images: [
      "/images/products/w-midi-skirt--olive.webp",
      "/images/products/w-midi-skirt--black.webp",
      "/images/products/w-midi-skirt--terracotta.webp",
    ],
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
      {
        name: "Charcoal",
        hex: "#3f4248",
        image: "/images/products/w-tailored-trouser--charcoal.webp",
      },
      {
        name: "Cream",
        hex: "#e3d9c6",
        image: "/images/products/w-tailored-trouser--cream.webp",
      },
      {
        name: "Chocolate",
        hex: "#4b352a",
        image: "/images/products/w-tailored-trouser--chocolate.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 4,
      S: 9,
      M: 12,
      L: 7,
      XL: 3,
    },
    garment: {
      kind: "trousers",
      fabric: "wool",
      fit: "regular",
      length: 1,
    },
    images: [
      "/images/products/w-tailored-trouser--charcoal.webp",
      "/images/products/w-tailored-trouser--cream.webp",
      "/images/products/w-tailored-trouser--chocolate.webp",
    ],
  },
  {
    id: "w-trench-coat",
    name: "Cotton Trench Coat",
    gender: "women",
    category: "outerwear",
    price: 9890,
    description:
      "Water-resistant cotton gabardine with a double-breasted front, storm flap and a belted waist. Falls below the knee.",
    colors: [
      {
        name: "Honey",
        hex: "#c0a173",
        image: "/images/products/w-trench-coat--honey.webp",
      },
      {
        name: "Black",
        hex: "#212024",
        image: "/images/products/w-trench-coat--black.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 4,
      S: 9,
      M: 12,
      L: 7,
      XL: 3,
    },
    garment: {
      kind: "coat",
      fabric: "cotton",
      sleeve: "long",
      fit: "regular",
      collar: true,
      length: 0.85,
    },
    images: [
      "/images/products/w-trench-coat--honey.webp",
      "/images/products/w-trench-coat--black.webp",
    ],
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
      {
        name: "Ink",
        hex: "#262c3e",
        image: "/images/products/w-cropped-blazer--ink.webp",
      },
      {
        name: "Bone",
        hex: "#ded4c2",
        image: "/images/products/w-cropped-blazer--bone.webp",
      },
      {
        name: "Scarlet",
        hex: "#8e2f33",
        image: "/images/products/w-cropped-blazer--scarlet.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 0,
      S: 2,
      M: 1,
      L: 0,
      XL: 0,
    },
    garment: {
      kind: "blazer",
      fabric: "wool",
      sleeve: "long",
      fit: "slim",
      collar: true,
      length: 0.5,
    },
    images: [
      "/images/products/w-cropped-blazer--ink.webp",
      "/images/products/w-cropped-blazer--bone.webp",
      "/images/products/w-cropped-blazer--scarlet.webp",
    ],
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
      {
        name: "Heather Grey",
        hex: "#a3a3a1",
        image: "/images/products/w-zip-hoodie--heather-grey.webp",
      },
      {
        name: "Faded Rose",
        hex: "#c08f90",
        image: "/images/products/w-zip-hoodie--faded-rose.webp",
      },
      {
        name: "Black",
        hex: "#232325",
        image: "/images/products/w-zip-hoodie--black.webp",
      },
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    stock: {
      XS: 4,
      S: 9,
      M: 12,
      L: 7,
      XL: 3,
    },
    garment: {
      kind: "hoodie",
      fabric: "cotton",
      sleeve: "long",
      fit: "relaxed",
      collar: false,
      length: 0.52,
    },
    images: [
      "/images/products/w-zip-hoodie--heather-grey.webp",
      "/images/products/w-zip-hoodie--faded-rose.webp",
      "/images/products/w-zip-hoodie--black.webp",
    ],
  },
  {
    id: "w-leather-flat",
    name: "Pointed Leather Flat",
    gender: "women",
    category: "shoes",
    price: 5490,
    description: "A soft pointed flat in nappa leather with a cushioned insole and a thin sole.",
    colors: [
      {
        name: "Black",
        hex: "#1f1e20",
        image: "/images/products/w-leather-flat--black.webp",
      },
      {
        name: "Bone",
        hex: "#ddd2bf",
        image: "/images/products/w-leather-flat--bone.webp",
      },
      {
        name: "Oxblood",
        hex: "#6a2b2f",
        image: "/images/products/w-leather-flat--oxblood.webp",
      },
    ],
    sizes: ["36", "37", "38", "39", "40"],
    stock: {
      "36": 4,
      "37": 7,
      "38": 8,
      "39": 4,
      "40": 2,
    },
    garment: {
      kind: "flats",
      fabric: "leather",
      fit: "regular",
    },
    images: [
      "/images/products/w-leather-flat--black.webp",
      "/images/products/w-leather-flat--bone.webp",
      "/images/products/w-leather-flat--oxblood.webp",
    ],
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
      {
        name: "Tan",
        hex: "#a97b50",
        image: "/images/products/w-block-heel--tan.webp",
      },
      {
        name: "Black",
        hex: "#222124",
        image: "/images/products/w-block-heel--black.webp",
      },
    ],
    sizes: ["36", "37", "38", "39", "40"],
    stock: {
      "36": 4,
      "37": 7,
      "38": 8,
      "39": 4,
      "40": 2,
    },
    garment: {
      kind: "heels",
      fabric: "leather",
      fit: "regular",
    },
    images: [
      "/images/products/w-block-heel--tan.webp",
      "/images/products/w-block-heel--black.webp",
    ],
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
      {
        name: "Off White",
        hex: "#e9e4d9",
        image: "/images/products/w-runner-sneaker--off-white.webp",
      },
      {
        name: "Sage",
        hex: "#93a089",
        image: "/images/products/w-runner-sneaker--sage.webp",
      },
    ],
    sizes: ["36", "37", "38", "39", "40"],
    stock: {
      "36": 4,
      "37": 7,
      "38": 8,
      "39": 4,
      "40": 2,
    },
    garment: {
      kind: "sneakers",
      fabric: "suede",
      fit: "regular",
    },
    images: [
      "/images/products/w-runner-sneaker--off-white.webp",
      "/images/products/w-runner-sneaker--sage.webp",
    ],
  },
];
