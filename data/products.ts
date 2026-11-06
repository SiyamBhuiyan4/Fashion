import type { Product } from "@/lib/schemas";

/**
 * The catalogue seed: Bangladeshi wear and everyday basics, priced in Taka. Photos are
 * free-licence images from Pexels (pexels.com/license: free for commercial use, no attribution
 * required), one per colourway, under public/images/products.
 */
export const products: Product[] = [
  {
    id: "m-cotton-panjabi",
    name: "Everyday Cotton Panjabi",
    gender: "men",
    category: "panjabi",
    price: 1850,
    description:
      "Soft combed cotton in a straight, knee-length cut, with a band collar and wooden buttons. Breathes through a Dhaka summer, sharp enough for Jumma.",
    colors: [
      {
        name: "Ash Grey",
        hex: "#9a9a98",
        image: "/images/products/m-cotton-panjabi--ash-grey.webp",
      },
      {
        name: "White",
        hex: "#f3f1ec",
        image: "/images/products/m-cotton-panjabi--white.webp",
      },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: {
      S: 10,
      M: 12,
      L: 14,
      XL: 11,
      XXL: 10,
    },
    garment: {
      kind: "panjabi",
      fabric: "cotton",
      fit: "regular",
      collar: true,
    },
    tags: ["everyday", "jumma"],
    images: [
      "/images/products/m-cotton-panjabi--ash-grey.webp",
      "/images/products/m-cotton-panjabi--white.webp",
    ],
  },
  {
    id: "m-embroidered-panjabi",
    name: "Chikan Embroidered Panjabi",
    gender: "men",
    category: "panjabi",
    price: 3450,
    description:
      "Tonal chikan embroidery down the placket and cuffs, on a fine cotton-viscose. The panjabi for dawat and family evenings.",
    colors: [
      {
        name: "Bottle Green",
        hex: "#1f4a3a",
        image: "/images/products/m-embroidered-panjabi--bottle-green.webp",
      },
      {
        name: "Royal Blue",
        hex: "#2a4fa0",
        image: "/images/products/m-embroidered-panjabi--royal-blue.webp",
      },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: {
      S: 9,
      M: 11,
      L: 8,
      XL: 10,
      XXL: 4,
    },
    garment: {
      kind: "panjabi",
      fabric: "cotton",
      fit: "regular",
      collar: true,
    },
    tags: ["festive"],
    images: [
      "/images/products/m-embroidered-panjabi--bottle-green.webp",
      "/images/products/m-embroidered-panjabi--royal-blue.webp",
    ],
  },
  {
    id: "m-silk-panjabi",
    name: "Eid Silk Panjabi",
    gender: "men",
    category: "panjabi",
    price: 5990,
    description:
      "A soft silk blend with a subtle sheen and a hand-finished neckline. Made for Eid morning and the photos after.",
    colors: [
      {
        name: "Maroon",
        hex: "#7a1f2b",
        image: "/images/products/m-silk-panjabi--maroon.webp",
      },
      {
        name: "Navy",
        hex: "#232c4f",
        image: "/images/products/m-silk-panjabi--navy.webp",
      },
      {
        name: "Teal",
        hex: "#1f6f6c",
        image: "/images/products/m-silk-panjabi--teal.webp",
      },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: {
      S: 7,
      M: 9,
      L: 6,
      XL: 8,
      XXL: 7,
    },
    garment: {
      kind: "panjabi",
      fabric: "silk",
      fit: "regular",
      collar: true,
    },
    tags: ["eid"],
    images: [
      "/images/products/m-silk-panjabi--maroon.webp",
      "/images/products/m-silk-panjabi--navy.webp",
      "/images/products/m-silk-panjabi--teal.webp",
    ],
  },
  {
    id: "m-kabli",
    name: "Kabli Set",
    gender: "men",
    category: "panjabi",
    price: 3290,
    description:
      "Long kabli shirt with side slits and matching straight trousers, in a crisp cotton blend. Easy and dignified.",
    colors: [
      {
        name: "Sand",
        hex: "#c8b08a",
        image: "/images/products/m-kabli--sand.webp",
      },
      {
        name: "Tobacco",
        hex: "#7a5134",
        image: "/images/products/m-kabli--tobacco.webp",
      },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: {
      S: 7,
      M: 9,
      L: 6,
      XL: 8,
      XXL: 7,
    },
    garment: {
      kind: "kabli",
      fabric: "cotton",
      fit: "relaxed",
      collar: true,
    },
    tags: ["set"],
    images: ["/images/products/m-kabli--sand.webp", "/images/products/m-kabli--tobacco.webp"],
  },
  {
    id: "m-fatua",
    name: "Khadi Fatua",
    gender: "men",
    category: "tops",
    price: 1190,
    description:
      "Short, hip-length fatua in handwoven khadi from Kumilla. Wear it over jeans for adda or over pajama at home.",
    colors: [
      {
        name: "Mint",
        hex: "#bfd8c4",
        image: "/images/products/m-fatua--mint.webp",
      },
      {
        name: "Sky Print",
        hex: "#a9c6e0",
        image: "/images/products/m-fatua--sky-print.webp",
      },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: {
      S: 13,
      M: 10,
      L: 12,
      XL: 9,
      XXL: 8,
    },
    garment: {
      kind: "fatua",
      fabric: "khadi",
      fit: "regular",
      sleeve: "long",
    },
    tags: ["khadi"],
    images: ["/images/products/m-fatua--mint.webp", "/images/products/m-fatua--sky-print.webp"],
  },
  {
    id: "m-koti",
    name: "Printed Koti",
    gender: "men",
    category: "outerwear",
    price: 2690,
    description:
      "Sleeveless Nehru-collar koti to layer over a panjabi — the quickest way to make an outfit look planned.",
    colors: [
      {
        name: "Indigo Print",
        hex: "#3d4f7a",
        image: "/images/products/m-koti--indigo-print.webp",
      },
      {
        name: "Charcoal",
        hex: "#36383d",
        image: "/images/products/m-koti--charcoal.webp",
      },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: {
      S: 7,
      M: 9,
      L: 6,
      XL: 8,
      XXL: 7,
    },
    garment: {
      kind: "koti",
      fabric: "jacquard",
      fit: "slim",
    },
    tags: ["layer"],
    images: [
      "/images/products/m-koti--indigo-print.webp",
      "/images/products/m-koti--charcoal.webp",
    ],
  },
  {
    id: "m-sherwani",
    name: "Wedding Sherwani",
    gender: "men",
    category: "outerwear",
    price: 18500,
    description:
      "Hand-embellished sherwani with a structured shoulder and churidar. Made to order in three weeks for gaye holud, biye and bou-bhaat.",
    colors: [
      {
        name: "Ivory",
        hex: "#ece3cf",
        image: "/images/products/m-sherwani--ivory.webp",
      },
      {
        name: "Maroon",
        hex: "#6a1d2a",
        image: "/images/products/m-sherwani--maroon.webp",
      },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: {
      S: 6,
      M: 3,
      L: 5,
      XL: 7,
      XXL: 1,
    },
    garment: {
      kind: "sherwani",
      fabric: "jacquard",
      fit: "slim",
    },
    tags: ["wedding"],
    images: ["/images/products/m-sherwani--ivory.webp", "/images/products/m-sherwani--maroon.webp"],
  },
  {
    id: "m-shirt",
    name: "Cotton Casual Shirt",
    gender: "men",
    category: "tops",
    price: 1690,
    description:
      "Garment-washed cotton with a soft collar and a relaxed fit. Office on weekdays, Dhanmondi café on Friday.",
    colors: [
      {
        name: "Maroon",
        hex: "#7c2333",
        image: "/images/products/m-shirt--maroon.webp",
      },
      {
        name: "Sky",
        hex: "#a9c7e3",
        image: "/images/products/m-shirt--sky.webp",
      },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: {
      S: 10,
      M: 12,
      L: 14,
      XL: 11,
      XXL: 10,
    },
    garment: {
      kind: "shirt",
      fabric: "cotton",
      fit: "regular",
      sleeve: "long",
      collar: true,
    },
    tags: ["everyday"],
    images: ["/images/products/m-shirt--maroon.webp", "/images/products/m-shirt--sky.webp"],
  },
  {
    id: "m-polo",
    name: "Piqué Polo",
    gender: "men",
    category: "tops",
    price: 1290,
    description:
      "Heavy cotton piqué that keeps its shape wash after wash, with a ribbed collar that stays flat.",
    colors: [
      {
        name: "Black",
        hex: "#1c1c1e",
        image: "/images/products/m-polo--black.webp",
      },
      {
        name: "Coral",
        hex: "#e0614f",
        image: "/images/products/m-polo--coral.webp",
      },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: {
      S: 14,
      M: 16,
      L: 13,
      XL: 15,
      XXL: 9,
    },
    garment: {
      kind: "polo",
      fabric: "cotton",
      fit: "regular",
      sleeve: "short",
      collar: true,
    },
    tags: ["everyday"],
    images: ["/images/products/m-polo--black.webp", "/images/products/m-polo--coral.webp"],
  },
  {
    id: "m-gabardine",
    name: "Gabardine Pant",
    gender: "men",
    category: "bottoms",
    price: 1990,
    description:
      "Mid-rise gabardine with a little stretch and a tapered leg. Goes with a panjabi or a shirt.",
    colors: [
      {
        name: "Beige",
        hex: "#cdb894",
        image: "/images/products/m-gabardine--beige.webp",
      },
      {
        name: "Grey",
        hex: "#7c7f86",
        image: "/images/products/m-gabardine--grey.webp",
      },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: {
      S: 10,
      M: 12,
      L: 14,
      XL: 11,
      XXL: 10,
    },
    garment: {
      kind: "trousers",
      fabric: "cotton",
      fit: "slim",
    },
    tags: ["office"],
    images: ["/images/products/m-gabardine--beige.webp", "/images/products/m-gabardine--grey.webp"],
  },
  {
    id: "m-jeans",
    name: "Slim Denim Jeans",
    gender: "men",
    category: "bottoms",
    price: 2290,
    description:
      "Indigo denim with a touch of stretch, cut slim through the thigh and tapered to the ankle.",
    colors: [
      {
        name: "Mid Blue",
        hex: "#5d7ea8",
        image: "/images/products/m-jeans--mid-blue.webp",
      },
      {
        name: "Black",
        hex: "#222226",
        image: "/images/products/m-jeans--black.webp",
      },
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    stock: {
      S: 12,
      M: 14,
      L: 11,
      XL: 13,
      XXL: 12,
    },
    garment: {
      kind: "jeans",
      fabric: "denim",
      fit: "slim",
    },
    tags: ["denim"],
    images: ["/images/products/m-jeans--mid-blue.webp", "/images/products/m-jeans--black.webp"],
  },
  {
    id: "m-sandal",
    name: "Leather Kolhapuri",
    gender: "men",
    category: "shoes",
    price: 1490,
    description:
      "Hand-stitched leather sandal with a cushioned sole — the classic for panjabi days.",
    colors: [
      {
        name: "Tan",
        hex: "#a8743f",
        image: "/images/products/m-sandal--tan.webp",
      },
      {
        name: "Olive",
        hex: "#5c5a3a",
        image: "/images/products/m-sandal--olive.webp",
      },
    ],
    sizes: ["40", "41", "42", "43", "44"],
    stock: {
      "40": 9,
      "41": 11,
      "42": 8,
      "43": 10,
      "44": 4,
    },
    garment: {
      kind: "sandals",
      fabric: "leather",
      fit: "regular",
    },
    tags: ["leather"],
    images: ["/images/products/m-sandal--tan.webp", "/images/products/m-sandal--olive.webp"],
  },
  {
    id: "w-jamdani",
    name: "Dhakai Jamdani Saree",
    gender: "women",
    category: "saree",
    price: 14500,
    description:
      "Handwoven on the looms of Rupganj, Narayanganj — every motif is woven in by hand, never printed. Comes with an unstitched blouse piece.",
    colors: [
      {
        name: "Red",
        hex: "#b3262f",
        image: "/images/products/w-jamdani--red.webp",
      },
      {
        name: "Teal",
        hex: "#1f6d73",
        image: "/images/products/w-jamdani--teal.webp",
      },
    ],
    sizes: ["FREE"],
    stock: {
      FREE: 5,
    },
    garment: {
      kind: "saree",
      fabric: "jamdani",
      fit: "regular",
    },
    tags: ["handloom", "heritage"],
    images: ["/images/products/w-jamdani--red.webp", "/images/products/w-jamdani--teal.webp"],
  },
  {
    id: "w-katan",
    name: "Katan Silk Saree",
    gender: "women",
    category: "saree",
    price: 9800,
    description:
      "Pure katan silk with a woven zari border and a heavy anchal. For biye, bou-bhaat and Eid dawat.",
    colors: [
      {
        name: "Crimson",
        hex: "#a3182e",
        image: "/images/products/w-katan--crimson.webp",
      },
      {
        name: "Emerald",
        hex: "#1d6b4a",
        image: "/images/products/w-katan--emerald.webp",
      },
    ],
    sizes: ["FREE"],
    stock: {
      FREE: 2,
    },
    garment: {
      kind: "saree",
      fabric: "katan",
      fit: "regular",
    },
    tags: ["wedding"],
    images: ["/images/products/w-katan--crimson.webp", "/images/products/w-katan--emerald.webp"],
  },
  {
    id: "w-cotton-saree",
    name: "Boishakhi Tant Saree",
    gender: "women",
    category: "saree",
    price: 1950,
    description:
      "Light Tangail tant cotton in the white-and-red of Pohela Boishakh. Easy to drape, cool all day.",
    colors: [
      {
        name: "White & Red",
        hex: "#f1ece4",
        image: "/images/products/w-cotton-saree--white-red.webp",
      },
      {
        name: "Cream & Red",
        hex: "#eadcc0",
        image: "/images/products/w-cotton-saree--cream-red.webp",
      },
    ],
    sizes: ["FREE"],
    stock: {
      FREE: 10,
    },
    garment: {
      kind: "saree",
      fabric: "cotton",
      fit: "regular",
    },
    tags: ["boishakh", "handloom"],
    images: [
      "/images/products/w-cotton-saree--white-red.webp",
      "/images/products/w-cotton-saree--cream-red.webp",
    ],
  },
  {
    id: "w-three-piece",
    name: "Printed Three-Piece",
    gender: "women",
    category: "three-piece",
    price: 3490,
    description:
      "Kameez, salwar and a soft orna in printed cotton. Ready to wear, no tailoring needed.",
    colors: [
      {
        name: "Lemon",
        hex: "#e9d65a",
        image: "/images/products/w-three-piece--lemon.webp",
      },
      {
        name: "Sky",
        hex: "#9fcfe0",
        image: "/images/products/w-three-piece--sky.webp",
      },
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: {
      S: 13,
      M: 10,
      L: 12,
      XL: 6,
    },
    garment: {
      kind: "kameez",
      fabric: "cotton",
      fit: "regular",
    },
    tags: ["ready-to-wear"],
    images: [
      "/images/products/w-three-piece--lemon.webp",
      "/images/products/w-three-piece--sky.webp",
    ],
  },
  {
    id: "w-lawn",
    name: "Embroidered Lawn Three-Piece",
    gender: "women",
    category: "three-piece",
    price: 5290,
    description:
      "Fine cotton lawn with thread embroidery on the yoke, a chiffon orna and straight trousers.",
    colors: [
      {
        name: "Mint",
        hex: "#bcd9bf",
        image: "/images/products/w-lawn--mint.webp",
      },
      {
        name: "Lilac",
        hex: "#c4b2d9",
        image: "/images/products/w-lawn--lilac.webp",
      },
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: {
      S: 7,
      M: 9,
      L: 6,
      XL: 5,
    },
    garment: {
      kind: "kameez",
      fabric: "lawn",
      fit: "regular",
    },
    tags: ["eid"],
    images: ["/images/products/w-lawn--mint.webp", "/images/products/w-lawn--lilac.webp"],
  },
  {
    id: "w-kurti",
    name: "Block-Print Kurti",
    gender: "women",
    category: "kurti",
    price: 1390,
    description:
      "Hand block-printed cotton kurti with a mandarin collar. Everyday, office or varsity.",
    colors: [
      {
        name: "Indigo",
        hex: "#2f3f75",
        image: "/images/products/w-kurti--indigo.webp",
      },
      {
        name: "Magenta",
        hex: "#b4306f",
        image: "/images/products/w-kurti--magenta.webp",
      },
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: {
      S: 12,
      M: 14,
      L: 11,
      XL: 10,
    },
    garment: {
      kind: "kurti",
      fabric: "cotton",
      fit: "regular",
    },
    tags: ["everyday"],
    images: ["/images/products/w-kurti--indigo.webp", "/images/products/w-kurti--magenta.webp"],
  },
  {
    id: "w-long-kurti",
    name: "Anarkali Long Kurti",
    gender: "women",
    category: "kurti",
    price: 2190,
    description:
      "Floor-skimming anarkali kurti in georgette with a flared hem that swirls when you turn.",
    colors: [
      {
        name: "Marigold",
        hex: "#e5b42c",
        image: "/images/products/w-long-kurti--marigold.webp",
      },
      {
        name: "Purple",
        hex: "#5b2c83",
        image: "/images/products/w-long-kurti--purple.webp",
      },
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: {
      S: 9,
      M: 11,
      L: 8,
      XL: 7,
    },
    garment: {
      kind: "kurti",
      fabric: "georgette",
      fit: "relaxed",
    },
    tags: ["festive"],
    images: [
      "/images/products/w-long-kurti--marigold.webp",
      "/images/products/w-long-kurti--purple.webp",
    ],
  },
  {
    id: "w-palazzo",
    name: "Kurta & Palazzo Set",
    gender: "women",
    category: "kurti",
    price: 2490,
    description:
      "A straight cotton kurta with wide palazzo trousers — the comfortable co-ord for long days.",
    colors: [
      {
        name: "Peach",
        hex: "#f2b59a",
        image: "/images/products/w-palazzo--peach.webp",
      },
      {
        name: "Off-white",
        hex: "#efe9dd",
        image: "/images/products/w-palazzo--off-white.webp",
      },
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: {
      S: 11,
      M: 8,
      L: 10,
      XL: 9,
    },
    garment: {
      kind: "palazzo",
      fabric: "cotton",
      fit: "wide",
    },
    tags: ["co-ord"],
    images: [
      "/images/products/w-palazzo--peach.webp",
      "/images/products/w-palazzo--off-white.webp",
    ],
  },
  {
    id: "w-abaya",
    name: "Everyday Abaya",
    gender: "women",
    category: "modest",
    price: 3250,
    description:
      "Flowing nida fabric with wide sleeves and a hidden snap front. Light, opaque and wrinkle-resistant.",
    colors: [
      {
        name: "Black",
        hex: "#1b1b1d",
        image: "/images/products/w-abaya--black.webp",
      },
      {
        name: "Ivory",
        hex: "#ece7dd",
        image: "/images/products/w-abaya--ivory.webp",
      },
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: {
      S: 13,
      M: 10,
      L: 12,
      XL: 6,
    },
    garment: {
      kind: "abaya",
      fabric: "georgette",
      fit: "relaxed",
    },
    tags: ["modest"],
    images: ["/images/products/w-abaya--black.webp", "/images/products/w-abaya--ivory.webp"],
  },
  {
    id: "w-hijab",
    name: "Chiffon Hijab",
    gender: "women",
    category: "modest",
    price: 550,
    description:
      "Soft, breathable chiffon that holds a pin and drapes without slipping. Generous 180 × 70 cm.",
    colors: [
      {
        name: "Mocha",
        hex: "#a48573",
        image: "/images/products/w-hijab--mocha.webp",
      },
      {
        name: "Ivory",
        hex: "#efe8dc",
        image: "/images/products/w-hijab--ivory.webp",
      },
    ],
    sizes: ["FREE"],
    stock: {
      FREE: 17,
    },
    garment: {
      kind: "hijab",
      fabric: "chiffon",
      fit: "regular",
    },
    tags: ["modest"],
    images: ["/images/products/w-hijab--mocha.webp", "/images/products/w-hijab--ivory.webp"],
  },
  {
    id: "w-lehenga",
    name: "Bridal Lehenga",
    gender: "women",
    category: "saree",
    price: 24500,
    description:
      "Heavily embroidered velvet lehenga with a can-can skirt, blouse and net dupatta. Made to order for your wedding.",
    colors: [
      {
        name: "Bridal Red",
        hex: "#a3172b",
        image: "/images/products/w-lehenga--bridal-red.webp",
      },
      {
        name: "Blush",
        hex: "#e5b9b4",
        image: "/images/products/w-lehenga--blush.webp",
      },
    ],
    sizes: ["S", "M", "L", "XL"],
    stock: {
      S: 6,
      M: 3,
      L: 5,
      XL: 4,
    },
    garment: {
      kind: "lehenga",
      fabric: "velvet",
      fit: "regular",
    },
    tags: ["wedding"],
    images: [
      "/images/products/w-lehenga--bridal-red.webp",
      "/images/products/w-lehenga--blush.webp",
    ],
  },
  {
    id: "w-sandal",
    name: "Embellished Flat Sandal",
    gender: "women",
    category: "shoes",
    price: 1290,
    description: "Soft footbed and a sparkle of stones — comfortable enough for a long dawat.",
    colors: [
      {
        name: "Blush",
        hex: "#e7c1bf",
        image: "/images/products/w-sandal--blush.webp",
      },
      {
        name: "Maroon",
        hex: "#6e2130",
        image: "/images/products/w-sandal--maroon.webp",
      },
    ],
    sizes: ["36", "37", "38", "39", "40"],
    stock: {
      "36": 11,
      "37": 8,
      "38": 10,
      "39": 12,
      "40": 6,
    },
    garment: {
      kind: "sandals",
      fabric: "leather",
      fit: "regular",
    },
    tags: ["festive"],
    images: ["/images/products/w-sandal--blush.webp", "/images/products/w-sandal--maroon.webp"],
  },
];
