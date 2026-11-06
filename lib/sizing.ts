/**
 * Size recommendation from the garment's real measurements, the shopper's body and what they
 * actually kept before.
 *
 * Each size has a body range (chest for tops and outerwear, waist for bottoms, EU length for
 * shoes) adjusted for the garment's fit. The shopper's measurement — entered in their profile,
 * or estimated from height and weight — is scored against every size. Two things then move it:
 *   · reviews: if buyers say a piece runs small or large, the recommendation shifts with them;
 *   · history: a size the shopper kept in the same kind of garment is favoured, and a size they
 *     returned as "Too small" / "Too large" pushes the next one the other way.
 * The result is a size and a match percentage, with the reason in plain words.
 */
import type { Product } from "@/lib/schemas";

export interface BodyProfile {
  heightCm?: number;
  weightKg?: number;
  chestCm?: number;
  waistCm?: number;
  footEu?: number;
}

export interface SizeHistoryEntry {
  name: string;
  category: string;
  kind: string;
  gender: string;
  size: string;
  kept: boolean;
  reason?: string;
  at: string;
}

const LETTERS = ["XS", "S", "M", "L", "XL", "XXL"];

/** Body range centres per letter size (cm). */
const CHEST = { men: [86, 92, 97, 103, 109, 115], women: [80, 85, 90, 95, 101, 107] };
const WAIST = { men: [72, 77, 83, 89, 95, 101], women: [62, 67, 72, 77, 83, 89] };
const FIT_EASE: Record<string, number> = { slim: -2, regular: 0, relaxed: 3, wide: 4 };

function estimate(body: BodyProfile, gender: "men" | "women", measure: "chest" | "waist") {
  if (measure === "chest" && body.chestCm) return { value: body.chestCm, measured: true };
  if (measure === "waist" && body.waistCm) return { value: body.waistCm, measured: true };
  const { heightCm: h, weightKg: w } = body;
  if (!h || !w) return null;
  const value =
    measure === "chest"
      ? gender === "men"
        ? 0.2 * h + 0.55 * w + 23
        : 0.2 * h + 0.5 * w + 28
      : gender === "men"
        ? 0.15 * h + 0.75 * w
        : 0.15 * h + 0.7 * w + 5;
  return { value, measured: false };
}

export interface Recommendation {
  size: string;
  match: number; // 0..100
  reason: string;
}

export function recommendSize(
  product: Product,
  body: BodyProfile | null | undefined,
  history: SizeHistoryEntry[],
  fitLean = 0, // -1 runs small … +1 runs large (from reviews)
): Recommendation | null {
  const gender = product.gender;
  // One-size pieces (a saree, a hijab) need no suggestion.
  if (product.sizes.length < 2) return null;
  const isShoe = product.category === "shoes";
  const sizes = product.sizes;
  const notes: string[] = [];

  // What the shopper kept or sent back in this kind of garment.
  const related = history.filter(
    (h) =>
      h.gender === gender && (h.kind === product.garment.kind || h.category === product.category),
  );
  const kept = related.find((h) => h.kept);
  const returned = related.find(
    (h) => !h.kept && (h.reason === "Too small" || h.reason === "Too large"),
  );

  let scores: number[];
  if (isShoe) {
    const foot = body?.footEu;
    if (!foot && !kept) return null;
    let target = foot ?? Number(kept!.size);
    if (fitLean <= -0.34) {
      target += 1;
      notes.push("buyers say it runs small");
    } else if (fitLean >= 0.34) {
      target -= 0.5;
      notes.push("buyers say it runs large");
    }
    scores = sizes.map((s) => Math.exp(-(((Number(s) - target) / 0.7) ** 2)));
    if (foot) notes.unshift(`your EU ${foot} foot`);
  } else {
    const measure = product.category === "bottoms" ? "waist" : "chest";
    const est = body ? estimate(body, gender, measure) : null;
    if (!est && !kept) return null;
    const centres = (measure === "chest" ? CHEST : WAIST)[gender];
    const ease = FIT_EASE[product.garment.fit ?? "regular"] ?? 0;
    // A piece that runs small fits like a size down: compare against smaller centres.
    const lean = fitLean <= -0.34 ? -4 : fitLean >= 0.34 ? 4 : 0;
    if (lean < 0) notes.push("buyers say it runs small");
    if (lean > 0) notes.push("buyers say it runs large");
    scores = sizes.map((s) => {
      const i = LETTERS.indexOf(s);
      if (i < 0 || !est) return 0.2;
      const centre = centres[i]! + ease + lean;
      return Math.exp(-(((est.value - centre) / 3.2) ** 2));
    });
    if (est)
      notes.unshift(est.measured ? `your ${est.value} cm ${measure}` : "your height and weight");
  }

  // History nudges.
  if (kept) {
    const i = sizes.indexOf(kept.size);
    if (i >= 0) {
      // What actually fitted outweighs an estimate from height and weight.
      scores[i] = scores[i]! + 1.2;
      notes.push(`the ${kept.size} ${kept.name} you kept`);
    }
  }
  if (returned) {
    const i = sizes.indexOf(returned.size);
    const step = returned.reason === "Too small" ? 1 : -1;
    if (i >= 0) {
      scores[i] = scores[i]! * 0.3;
      if (sizes[i + step]) scores[i + step] = scores[i + step]! + 0.35;
      notes.push(`you returned ${returned.size} as ${returned.reason!.toLowerCase()}`);
    }
  }

  const total = scores.reduce((a, b) => a + b, 0) || 1;
  let best = 0;
  scores.forEach((s, i) => {
    if (s > scores[best]!) best = i;
  });
  const share = scores[best]! / total;
  const match = Math.round(Math.min(97, 55 + share * 45));
  return {
    size: sizes[best]!,
    match,
    reason: notes.length ? `Based on ${notes.join(", ")}.` : "Based on our size chart.",
  };
}
