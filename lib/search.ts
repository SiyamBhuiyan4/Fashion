/**
 * Product search that forgives spelling and understands local words.
 *
 *   · A synonym dictionary maps Banglish and local terms to the catalogue's words
 *     ("panjabi" ↔ "punjabi" ↔ "kurta", "koti" ↔ "waistcoat", "borka" ↔ "abaya", "kalo" ↔
 *     "black", "juta" ↔ "shoes", …).
 *   · Every word is matched exactly, by synonym, as a prefix, or within one or two typos
 *     (Damerau–Levenshtein), so "jeens", "trouzer" and "snekar" still find their pieces.
 *   · Ranking is stock-aware: pieces in stock in the shopper's usual size rise, and pieces that
 *     are sold out in every size sink to the bottom.
 */
import type { Product } from "@/lib/schemas";

const GROUPS: string[][] = [
  ["panjabi", "punjabi", "panjabee", "kurta"],
  ["kurti", "kurtee", "tunic"],
  ["three-piece", "threepiece", "salwar", "shalwar", "kameez", "kamiz", "lawn"],
  ["fatua", "fotua", "fatuya"],
  ["kabli", "kabuli", "pathani"],
  ["sherwani", "sherowani", "groom"],
  ["lehenga", "lehnga", "lehanga", "bridal"],
  ["jamdani", "jamdhani", "dhakai"],
  ["katan", "katan-silk", "benarasi", "banarasi"],
  ["tant", "taant", "tangail", "handloom"],
  ["hijab", "hejab", "headscarf"],
  ["palazzo", "plazo", "co-ord"],
  ["eid", "festive", "dawat"],
  ["boishakh", "boishakhi", "pohela"],
  ["biye", "wedding", "holud"],
  ["sandal", "sandals", "chappal", "kolhapuri"],
  ["koti", "waistcoat", "vest", "nehru"],
  ["borka", "burqa", "abaya"],
  ["saree", "sari"],
  ["orna", "dupatta", "scarf"],
  ["tshirt", "t-shirt", "tee", "genji", "gengi"],
  ["shirt", "jama", "button-down", "oxford"],
  ["polo", "pique"],
  ["pant", "pants", "trouser", "trousers", "prant"],
  ["jeans", "jins", "denim"],
  ["shorts", "half-pant", "halfpant"],
  ["shoe", "shoes", "juta", "jutta", "footwear"],
  ["sneaker", "sneakers", "keds", "runner", "trainers"],
  ["boot", "boots", "chelsea"],
  ["heel", "heels", "block-heel"],
  ["flat", "flats", "ballet", "pump"],
  ["jacket", "jaket"],
  ["coat", "kot", "trench", "parka", "overcoat"],
  ["blazer", "suit"],
  ["hoodie", "hudi", "hoody", "sweatshirt"],
  ["sweater", "soyetar", "jumper", "knit", "cardigan", "crew"],
  ["skirt", "sket"],
  ["dress", "frock", "frok", "gown"],
  ["blouse", "top", "tops"],
  ["tank", "camisole", "vest-top", "sleeveless"],
  ["men", "man", "male", "gents", "chele", "boys"],
  ["women", "woman", "female", "ladies", "meye", "girls"],
  ["black", "kalo"],
  ["white", "sada", "ivory", "chalk", "off-white"],
  ["red", "lal", "scarlet", "burgundy", "oxblood"],
  ["blue", "nil", "neel", "navy", "indigo", "sky"],
  ["green", "sobuj", "olive", "sage", "forest", "moss"],
  ["yellow", "holud", "butter"],
  ["pink", "golapi", "rose", "rosewood"],
  ["brown", "badami", "tan", "camel", "chocolate", "tobacco", "espresso", "honey"],
  ["grey", "gray", "dhusor", "charcoal", "graphite", "slate", "melange"],
  ["beige", "cream", "sand", "stone", "oat", "khaki", "taupe", "ecru", "bone", "champagne"],
  ["purple", "plum", "beguni"],
];

const SYNONYMS = new Map<string, Set<string>>();
for (const group of GROUPS) {
  for (const word of group) {
    const set = SYNONYMS.get(word) ?? new Set<string>();
    for (const other of group) set.add(other);
    SYNONYMS.set(word, set);
  }
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ");

const tokenize = (s: string) =>
  normalize(s)
    .split(/[\s]+/)
    .flatMap((w) => [w, ...(w.includes("-") ? w.split("-") : [])])
    .filter((w) => w.length > 1);

/** Damerau–Levenshtein distance with an early exit above `max`. */
function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [
    i,
    ...Array(b.length).fill(0),
  ]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    let rowMin = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, d[i - 2]![j - 2]! + 1);
      }
      d[i]![j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
  }
  return d[a.length]![b.length]!;
}

function productWords(p: Product): string[] {
  return tokenize(
    [
      p.name,
      p.category,
      p.garment.kind,
      p.garment.fabric,
      p.gender,
      ...(p.tags ?? []),
      ...p.colors.map((c) => c.name),
    ].join(" "),
  );
}

/** How well one query word matches a product's words (0 = not at all). */
function wordScore(query: string, words: string[]): number {
  const synonyms = SYNONYMS.get(query);
  let best = 0;
  for (const word of words) {
    if (word === query) return 3;
    if (synonyms?.has(word)) best = Math.max(best, 2.6);
    if (query.length >= 3 && word.startsWith(query)) best = Math.max(best, 2.2);
    const max = query.length >= 6 ? 2 : query.length >= 4 ? 1 : 0;
    if (max > 0 && distance(query, word, max) <= max) best = Math.max(best, 1.6);
    // A typo of a synonym ("panjaby" → "panjabi" → "kurta").
    if (max > 0 && best < 1.4) {
      for (const [key, set] of SYNONYMS) {
        if (set.has(word) && distance(query, key, max) <= max) {
          best = Math.max(best, 1.4);
          break;
        }
      }
    }
  }
  return best;
}

export interface SearchHit {
  product: Product;
  score: number;
  inYourSize: boolean | null;
  soldOut: boolean;
}

export function searchProducts(
  catalog: readonly Product[],
  query: string,
  options: { size?: string | null; stock?: (p: Product, size?: string) => boolean } = {},
): SearchHit[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];
  const hasStock =
    options.stock ??
    ((p, size) => (size ? (p.stock[size] ?? 0) > 0 : Object.values(p.stock).some((n) => n > 0)));

  const scored = catalog.map((product) => {
    const words = productWords(product);
    const perTerm = terms.map((t) => wordScore(t, words));
    const matched = perTerm.filter((s) => s > 0).length;
    return { product, perTerm, matched };
  });
  // Every word must match; if nothing does, fall back to the best partial matches.
  const all = scored.filter((s) => s.matched === terms.length);
  const pool = all.length > 0 ? all : scored.filter((s) => s.matched > 0);

  return pool
    .map(({ product, perTerm }) => {
      const soldOut = !hasStock(product);
      const size = options.size && product.sizes.includes(options.size) ? options.size : null;
      const inYourSize = size ? hasStock(product, size) : null;
      let score = perTerm.reduce((a, b) => a + b, 0);
      if (inYourSize) score += 1.5;
      if (inYourSize === false) score -= 1;
      if (soldOut) score -= 10;
      return { product, score, inYourSize, soldOut };
    })
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price);
}

export const SEARCH_SUGGESTIONS = [
  "panjabi",
  "jamdani",
  "three piece",
  "kalo abaya",
  "eid",
  "lal saree",
];
