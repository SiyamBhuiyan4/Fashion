/**
 * Draws a flat-lay product illustration as SVG, from the same garment spec the 3D try-on uses.
 * scripts/seed-db.ts rasterises these to WebP and uploads them to the Telegram channel, so the
 * catalogue has real artwork per colour without any photography.
 *
 * Everything is laid out in a 1000 x 1250 box with the garment centred on x = 500.
 */
import type { Fabric, GarmentSpec, Product, ProductColor } from "../lib/schemas.ts";

const W = 1000;
const H = 1250;
const CX = W / 2;

type Fit = NonNullable<GarmentSpec["fit"]>;

const shoulderHalf: Record<Fit, number> = { slim: 150, regular: 168, relaxed: 186, wide: 200 };
const waistHalf: Record<Fit, number> = { slim: 118, regular: 130, relaxed: 145, wide: 158 };

function clamp01(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

/** #rrggbb -> #rrggbb, lightened (amount > 0) or darkened (amount < 0). */
function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const base = (n >> shift) & 0xff;
    const next = amount >= 0 ? base + (255 - base) * amount : base * (1 + amount);
    return Math.round(Math.min(255, Math.max(0, next)))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

function luminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 0xff) + 0.7152 * ((n >> 8) & 0xff) + 0.0722 * (n & 0xff)) / 255;
}

/** Fabric surface: a repeating pattern laid over the garment fill at low opacity. */
function fabricPattern(fabric: Fabric, hex: string): { id: string; def: string; opacity: number } | null {
  const line = shade(hex, luminance(hex) > 0.5 ? -0.35 : 0.4);
  const id = `fab-${fabric}`;
  switch (fabric) {
    case "denim":
      return {
        id,
        opacity: 0.3,
        def: `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="10" stroke="${line}" stroke-width="2.2" />
        </pattern>`,
      };
    case "knit":
    case "wool":
      return {
        id,
        opacity: 0.26,
        def: `<pattern id="${id}" width="14" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 7 q3.5 -5 7 0 q3.5 5 7 0" fill="none" stroke="${line}" stroke-width="2" />
        </pattern>`,
      };
    case "linen":
    case "canvas":
      return {
        id,
        opacity: 0.22,
        def: `<pattern id="${id}" width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 6 H12 M6 0 V12" stroke="${line}" stroke-width="1.6" />
        </pattern>`,
      };
    case "suede":
      return {
        id,
        opacity: 0.2,
        def: `<pattern id="${id}" width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="4.5" cy="4.5" r="1.5" fill="${line}" />
        </pattern>`,
      };
    case "nylon":
      return {
        id,
        opacity: 0.18,
        def: `<pattern id="${id}" width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M0 13 H26 M13 0 V26" stroke="${line}" stroke-width="1.4" />
        </pattern>`,
      };
    default:
      return null;
  }
}

interface Piece {
  /** Drawn in order; later pieces sit on top. */
  d: string;
  tone?: number;
  stroke?: boolean;
  fillNone?: boolean;
}

function neckline(spec: GarmentSpec): { halfWidth: number; drop: number } {
  switch (spec.kind) {
    case "tank":
      return { halfWidth: 78, drop: 86 };
    case "dress":
      return { halfWidth: 86, drop: 74 };
    case "polo":
    case "shirt":
      return { halfWidth: 62, drop: 40 };
    default:
      return { halfWidth: 72, drop: 52 };
  }
}

function topLength(spec: GarmentSpec): number {
  if (spec.kind === "dress") return 420 + clamp01(spec.length, 0.78) * 560;
  if (spec.kind === "shirt") return 520;
  if (spec.kind === "tank") return 470;
  return 490;
}

/** Tops: tee, polo, shirt, tank, sweater, dress. */
function drawTop(spec: GarmentSpec): Piece[] {
  const fit = spec.fit ?? "regular";
  const sh = shoulderHalf[fit];
  const topY = 250;
  const length = topLength(spec);
  const hemY = topY + length;
  const neck = neckline(spec);
  const flare = spec.kind === "dress" ? 1.55 : spec.kind === "shirt" ? 0.96 : 1;
  const hemHalf = (sh - 18) * flare;
  const waistY = topY + length * 0.55;
  const waistHalfW = spec.kind === "dress" ? sh * 0.82 : (sh - 16) * 0.98;

  const body = [
    `M ${CX - sh} ${topY + 26}`,
    `L ${CX - neck.halfWidth} ${topY + 6}`,
    `Q ${CX} ${topY + neck.drop} ${CX + neck.halfWidth} ${topY + 6}`,
    `L ${CX + sh} ${topY + 26}`,
    `C ${CX + sh + 6} ${topY + 120} ${CX + waistHalfW} ${waistY - 60} ${CX + waistHalfW} ${waistY}`,
    `C ${CX + waistHalfW} ${waistY + 80} ${CX + hemHalf} ${hemY - 90} ${CX + hemHalf} ${hemY}`,
    `Q ${CX} ${hemY + 34} ${CX - hemHalf} ${hemY}`,
    `C ${CX - hemHalf} ${hemY - 90} ${CX - waistHalfW} ${waistY + 80} ${CX - waistHalfW} ${waistY}`,
    `C ${CX - waistHalfW} ${waistY - 60} ${CX - sh - 6} ${topY + 120} ${CX - sh} ${topY + 26}`,
    "Z",
  ].join(" ");

  const pieces: Piece[] = [];

  // Sleeves sit behind the body so the shoulder seam reads cleanly.
  const sleeve = spec.sleeve ?? "short";
  if (sleeve !== "none") {
    const long = sleeve === "long";
    const reach = long ? 118 : 74;      // how far out from the shoulder
    const drop = long ? 330 : 128;      // how far down
    const cuffHalf = long ? 34 : 54;    // half the cuff opening
    for (const side of [-1, 1]) {
      const shoulderX = CX + side * (sh - 4);
      const shoulderY = topY + 22;
      const pitX = CX + side * (sh - 30);
      const pitY = topY + 168;
      const cuffX = shoulderX + side * reach;
      const cuffY = shoulderY + drop;
      pieces.push({
        tone: -0.07,
        stroke: true,
        d: [
          `M ${shoulderX} ${shoulderY}`,
          `C ${shoulderX + side * reach * 0.8} ${shoulderY + drop * 0.25} ${cuffX} ${cuffY - drop * 0.3} ${cuffX} ${cuffY}`,
          `Q ${cuffX - side * cuffHalf * 0.5} ${cuffY + 20} ${cuffX - side * cuffHalf} ${cuffY - 6}`,
          `C ${cuffX - side * cuffHalf} ${cuffY - drop * 0.45} ${pitX + side * 24} ${pitY + 40} ${pitX} ${pitY}`,
          "Z",
        ].join(" "),
      });
    }
  }

  pieces.push({ d: body, stroke: true });

  // Collar or neck rib.
  if (spec.collar) {
    pieces.push({
      tone: 0.12,
      stroke: true,
      d: [
        `M ${CX - neck.halfWidth - 14} ${topY + 2}`,
        `Q ${CX} ${topY + neck.drop + 26} ${CX + neck.halfWidth + 14} ${topY + 2}`,
        `L ${CX + neck.halfWidth + 30} ${topY + 34}`,
        `Q ${CX} ${topY + neck.drop + 62} ${CX - neck.halfWidth - 30} ${topY + 34}`,
        "Z",
      ].join(" "),
    });
    // Placket.
    pieces.push({
      fillNone: true,
      d: `M ${CX} ${topY + neck.drop + 40} V ${topY + (spec.kind === "shirt" ? length - 20 : 190)}`,
    });
  } else {
    pieces.push({
      fillNone: true,
      d: `M ${CX - neck.halfWidth + 6} ${topY + 12} Q ${CX} ${topY + neck.drop + 18} ${CX + neck.halfWidth - 6} ${topY + 12}`,
    });
  }

  if (spec.kind === "tank") {
    // Narrow straps instead of shoulders.
    for (const side of [-1, 1]) {
      pieces.push({
        tone: 0.05,
        d: `M ${CX + side * (sh - 30)} ${topY + 30} l ${side * 26} -4 l ${side * -6} 60 l ${side * -26} 4 Z`,
      });
    }
  }

  return pieces;
}

/** Bottoms: jeans, trousers, shorts. */
function drawLegs(spec: GarmentSpec): Piece[] {
  const fit = spec.fit ?? "regular";
  const hipHalf = waistHalf[fit] + 26;
  const waistW = waistHalf[fit];
  const topY = 250;
  const length = 300 + clamp01(spec.length, 1) * 620;
  const hemY = topY + length;
  const legHalf = fit === "wide" ? 92 : fit === "relaxed" ? 80 : fit === "slim" ? 58 : 68;
  const crotchY = topY + 150;
  const gap = 4;

  const leg = (side: number): string => {
    const inner = CX + side * gap;
    const outer = CX + side * hipHalf;
    const hemOuter = CX + side * (gap + legHalf * 2);
    const hemInner = CX + side * gap;
    return [
      `M ${CX + side * waistW} ${topY}`,
      `C ${outer} ${topY + 70} ${outer + side * 4} ${topY + 150} ${hemOuter} ${hemY}`,
      `Q ${CX + side * (gap + legHalf)} ${hemY + 26} ${hemInner} ${hemY}`,
      `C ${inner} ${hemY - 220} ${inner} ${crotchY + 30} ${CX} ${crotchY}`,
      "Z",
    ].join(" ");
  };

  const pieces: Piece[] = [
    { d: leg(-1), stroke: true },
    { d: leg(1), stroke: true },
    // Waistband.
    {
      tone: 0.1,
      stroke: true,
      d: `M ${CX - waistW} ${topY} Q ${CX} ${topY - 22} ${CX + waistW} ${topY} l 0 46 Q ${CX} ${topY + 24} ${CX - waistW} ${topY + 46} Z`,
    },
    // Fly and pockets.
    { fillNone: true, d: `M ${CX + 6} ${topY + 50} V ${topY + 150}` },
    {
      fillNone: true,
      d: `M ${CX - waistW + 14} ${topY + 52} q 46 26 74 -2 M ${CX + waistW - 14} ${topY + 52} q -46 26 -74 -2`,
    },
  ];
  return pieces;
}

/** Skirt: A-line, curved hem. */
function drawSkirt(spec: GarmentSpec): Piece[] {
  const fit = spec.fit ?? "regular";
  const waistW = waistHalf[fit];
  const topY = 280;
  const length = 300 + clamp01(spec.length, 0.7) * 520;
  const hemY = topY + length;
  const hemHalf = waistW + length * 0.42;
  return [
    {
      stroke: true,
      d: [
        `M ${CX - waistW} ${topY}`,
        `Q ${CX} ${topY - 20} ${CX + waistW} ${topY}`,
        `C ${CX + waistW + 30} ${topY + length * 0.45} ${CX + hemHalf - 20} ${hemY - 120} ${CX + hemHalf} ${hemY}`,
        `Q ${CX} ${hemY + 52} ${CX - hemHalf} ${hemY}`,
        `C ${CX - hemHalf + 20} ${hemY - 120} ${CX - waistW - 30} ${topY + length * 0.45} ${CX - waistW} ${topY}`,
        "Z",
      ].join(" "),
    },
    {
      tone: 0.1,
      stroke: true,
      d: `M ${CX - waistW} ${topY} Q ${CX} ${topY - 20} ${CX + waistW} ${topY} l 0 40 Q ${CX} ${topY + 20} ${CX - waistW} ${topY + 40} Z`,
    },
    { fillNone: true, d: `M ${CX - 40} ${topY + 60} C ${CX - 60} ${hemY * 0.7} ${CX - 70} ${hemY - 120} ${CX - 86} ${hemY - 10}` },
  ];
}

/** Outerwear: jacket, blazer, coat, hoodie — drawn open, with lapels or a hood. */
function drawOuterwear(spec: GarmentSpec): Piece[] {
  const fit = spec.fit ?? "regular";
  const sh = shoulderHalf[fit] + 14;
  const topY = 240;
  const length = 380 + clamp01(spec.length, 0.6) * 520;
  const hemY = topY + length;
  const hemHalf = sh - 6;
  const pieces: Piece[] = [];

  for (const side of [-1, 1]) {
    const shoulderX = CX + side * (sh - 6);
    const shoulderY = topY + 20;
    const pitX = CX + side * (sh - 34);
    const pitY = topY + 180;
    const reach = 132;
    const drop = 348;
    const cuffHalf = 40;
    const cuffX = shoulderX + side * reach;
    const cuffY = shoulderY + drop;
    pieces.push({
      tone: -0.08,
      stroke: true,
      d: [
        `M ${shoulderX} ${shoulderY}`,
        `C ${shoulderX + side * reach * 0.85} ${shoulderY + drop * 0.22} ${cuffX} ${cuffY - drop * 0.32} ${cuffX} ${cuffY}`,
        `Q ${cuffX - side * cuffHalf * 0.5} ${cuffY + 22} ${cuffX - side * cuffHalf} ${cuffY - 8}`,
        `C ${cuffX - side * cuffHalf} ${cuffY - drop * 0.45} ${pitX + side * 26} ${pitY + 46} ${pitX} ${pitY}`,
        "Z",
      ].join(" "),
    });
  }

  // Two front panels with a centre opening.
  for (const side of [-1, 1]) {
    pieces.push({
      stroke: true,
      d: [
        `M ${CX + side * sh} ${topY + 20}`,
        `L ${CX + side * 54} ${topY + 2}`,
        `L ${CX + side * 18} ${topY + 150}`,
        `L ${CX + side * 22} ${hemY}`,
        `L ${CX + side * hemHalf} ${hemY - 6}`,
        `C ${CX + side * (hemHalf + 8)} ${topY + length * 0.5} ${CX + side * (sh + 6)} ${topY + 130} ${CX + side * sh} ${topY + 20}`,
        "Z",
      ].join(" "),
    });
  }

  if (spec.kind === "hoodie") {
    pieces.push({
      tone: -0.12,
      stroke: true,
      d: `M ${CX - 118} ${topY + 16} C ${CX - 96} ${topY - 96} ${CX + 96} ${topY - 96} ${CX + 118} ${topY + 16} C ${CX + 60} ${topY + 70} ${CX - 60} ${topY + 70} ${CX - 118} ${topY + 16} Z`,
    });
    // Drawcords and kangaroo pocket.
    pieces.push({ fillNone: true, d: `M ${CX - 34} ${topY + 54} v 120 M ${CX + 34} ${topY + 54} v 120` });
    pieces.push({ fillNone: true, d: `M ${CX - 120} ${hemY - 150} h 240` });
  } else if (spec.collar) {
    for (const side of [-1, 1]) {
      pieces.push({
        tone: 0.14,
        stroke: true,
        d: `M ${CX + side * 54} ${topY + 2} L ${CX + side * 150} ${topY + 26} L ${CX + side * 60} ${topY + 200} L ${CX + side * 18} ${topY + 150} Z`,
      });
    }
    if (spec.kind === "coat") {
      // Belt across the waist.
      pieces.push({
        tone: 0.08,
        stroke: true,
        d: `M ${CX - hemHalf} ${topY + length * 0.52} h ${hemHalf * 2} v 46 h ${-hemHalf * 2} Z`,
      });
    }
  }

  // Buttons.
  if (spec.kind === "blazer" || spec.kind === "coat") {
    const count = spec.kind === "coat" ? 4 : 2;
    for (let i = 0; i < count; i++) {
      const y = topY + length * 0.42 + i * 54;
      pieces.push({ tone: 0.3, stroke: true, d: `M ${CX + 42} ${y} a 11 11 0 1 0 0.1 0 Z` });
    }
  }

  return pieces;
}

/** Shoes: side profile, one pair, the second shoe set behind and below the first. */
function drawShoes(spec: GarmentSpec): Piece[] {
  const pieces: Piece[] = [];

  /**
   * One shoe. (ox, oy) is the ground under the heel; the shoe is drawn toe-right in a
   * 360 x 260 box, with y measured upwards from the ground.
   */
  const shoe = (ox: number, oy: number, scale: number, behind: boolean): Piece[] => {
    const out: Piece[] = [];
    const tone = behind ? -0.06 : 0;

    const sneaker = spec.kind === "sneakers";
    const boot = spec.kind === "boots";
    const heel = spec.kind === "heels";
    // A heel lifts the whole shoe off the ground; the block below fills the gap.
    const lift = heel ? 74 : 0;
    const x = (v: number) => ox + v * scale;
    const y = (v: number) => oy - (v + lift) * scale;
    const soleTop = sneaker ? 40 : heel ? 16 : 24;
    const collarTop = boot ? 232 : sneaker ? 150 : heel ? 112 : 118;
    const toeHeight = sneaker ? 74 : heel ? 40 : 56;
    const pointedToe = spec.kind === "flats" || heel;

    // Upper.
    out.push({
      tone,
      stroke: true,
      d: [
        `M ${x(30)} ${y(soleTop)}`,
        `L ${x(34)} ${y(collarTop - 18)}`,
        `Q ${x(44)} ${y(collarTop)} ${x(boot ? 150 : 86)} ${y(collarTop - (boot ? 4 : 10))}`,
        boot
          ? `L ${x(156)} ${y(96)}`
          : `C ${x(132)} ${y(collarTop - 34)} ${x(176)} ${y(136)} ${x(214)} ${y(104)}`,
        `C ${x(262)} ${y(boot ? 90 : 88)} ${x(300)} ${y(toeHeight + 8)} ${x(pointedToe ? 344 : 330)} ${y(toeHeight)}`,
        `Q ${x(pointedToe ? 372 : 352)} ${y(toeHeight - (pointedToe ? 26 : 14))} ${x(pointedToe ? 356 : 348)} ${y(soleTop)}`,
        "Z",
      ].join(" "),
    });

    // Sole / midsole.
    out.push({
      tone: tone + (sneaker ? 0.26 : -0.22),
      stroke: true,
      d: [
        `M ${x(26)} ${y(soleTop)}`,
        `L ${x(348)} ${y(soleTop)}`,
        `Q ${x(360)} ${y(soleTop / 2)} ${x(332)} ${y(2)}`,
        `Q ${x(180)} ${y(-8)} ${x(40)} ${y(4)}`,
        `Q ${x(20)} ${y(soleTop / 2)} ${x(26)} ${y(soleTop)}`,
        "Z",
      ].join(" "),
    });

    if (sneaker) {
      // Toe cap, collar padding and laces.
      out.push({
        tone: tone + 0.14,
        stroke: true,
        d: `M ${x(284)} ${y(86)} C ${x(312)} ${y(80)} ${x(338)} ${y(68)} ${x(348)} ${y(54)} L ${x(348)} ${y(soleTop)} L ${x(276)} ${y(soleTop)} Z`,
      });
      out.push({
        fillNone: true,
        d: [
          `M ${x(96)} ${y(126)} l ${54 * scale} ${-22 * scale}`,
          `M ${x(118)} ${y(104)} l ${54 * scale} ${-20 * scale}`,
          `M ${x(142)} ${y(84)} l ${52 * scale} ${-18 * scale}`,
          `M ${x(40)} ${y(118)} q ${34 * scale} ${14 * scale} ${62 * scale} ${4 * scale}`,
        ].join(" "),
      });
    } else if (boot) {
      // Elastic side gore and pull tab.
      out.push({
        tone: tone - 0.16,
        stroke: true,
        d: `M ${x(62)} ${y(214)} L ${x(128)} ${y(212)} L ${x(128)} ${y(118)} L ${x(62)} ${y(120)} Z`,
      });
      out.push({ fillNone: true, d: `M ${x(150)} ${y(226)} q ${26 * scale} ${10 * scale} ${28 * scale} ${28 * scale}` });
    } else if (heel) {
      // Block heel down to the ground, plus the ankle strap.
      out.push({
        tone: tone - 0.2,
        stroke: true,
        d: `M ${x(34)} ${y(soleTop)} L ${x(92)} ${y(soleTop)} L ${x(86)} ${oy} L ${x(40)} ${oy} Z`,
      });
      out.push({
        fillNone: true,
        d: `M ${x(52)} ${y(96)} C ${x(90)} ${y(132)} ${x(140)} ${y(130)} ${x(168)} ${y(108)}`,
      });
    } else {
      // Loafer / flat topline.
      out.push({
        tone: tone + 0.16,
        stroke: true,
        d: `M ${x(96)} ${y(112)} C ${x(140)} ${y(126)} ${x(186)} ${y(116)} ${x(222)} ${y(96)} L ${x(206)} ${y(64)} C ${x(172)} ${y(84)} ${x(132)} ${y(90)} ${x(102)} ${y(80)} Z`,
      });
    }

    return out;
  };

  // The far shoe first, so the near one overlaps it.
  pieces.push(...shoe(CX - 300, 590, 0.9, true));
  pieces.push(...shoe(CX - 180, 900, 1.02, false));
  return pieces;
}

function piecesFor(spec: GarmentSpec): Piece[] {
  switch (spec.kind) {
    case "jeans":
    case "trousers":
    case "shorts":
      return drawLegs(spec);
    case "skirt":
      return drawSkirt(spec);
    case "jacket":
    case "blazer":
    case "coat":
    case "hoodie":
      return drawOuterwear(spec);
    case "sneakers":
    case "boots":
    case "loafers":
    case "flats":
    case "heels":
      return drawShoes(spec);
    default:
      return drawTop(spec);
  }
}

export interface ProductArtOptions {
  /** Drawn in the corner, so a shopper can tell two colourways apart at a glance. */
  label?: string;
}

/** The flat-lay illustration of one product in one colour, as an SVG string. */
export function productArtSvg(
  product: Product,
  color: ProductColor,
  options: ProductArtOptions = {},
): string {
  const spec = product.garment;
  const base = color.hex;
  const dark = luminance(base) < 0.22;
  const pattern = fabricPattern(spec.fabric, base);
  const stroke = shade(base, dark ? 0.45 : -0.42);
  const pieces = piecesFor(spec);
  const accent = spec.accentHex;

  const body = pieces
    .map((piece) => {
      if (piece.fillNone) {
        return `<path d="${piece.d}" fill="none" stroke="${stroke}" stroke-width="3" stroke-linecap="round" opacity="0.55" />`;
      }
      const fill = piece.tone ? shade(base, piece.tone) : base;
      const outline = piece.stroke
        ? ` stroke="${stroke}" stroke-width="3.4" stroke-linejoin="round"`
        : "";
      return `<path d="${piece.d}" fill="${fill}"${outline} />`;
    })
    .join("\n      ");

  const patternOverlay = pattern
    ? pieces
        .filter((piece) => !piece.fillNone)
        .map(
          (piece) =>
            `<path d="${piece.d}" fill="url(#${pattern.id})" opacity="${pattern.opacity}" />`,
        )
        .join("\n      ")
    : "";

  const label = options.label ?? color.name;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f6f3ee" />
      <stop offset="1" stop-color="#e7e1d7" />
    </linearGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.42" r="0.72">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.85" />
      <stop offset="1" stop-color="#ffffff" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="${dark ? 0.16 : 0.3}" />
      <stop offset="0.55" stop-color="#ffffff" stop-opacity="0" />
      <stop offset="1" stop-color="#000000" stop-opacity="0.14" />
    </linearGradient>
    ${pattern?.def ?? ""}
    <filter id="drop" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#3b3327" flood-opacity="0.22" />
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)" />
  <rect width="${W}" height="${H}" fill="url(#vignette)" />
  <g filter="url(#drop)">
      ${body}
  </g>
  <g>
      ${patternOverlay}
  </g>
  <g opacity="0.9">
      ${pieces
        .filter((piece) => !piece.fillNone)
        .map((piece) => `<path d="${piece.d}" fill="url(#sheen)" />`)
        .join("\n      ")}
  </g>
  ${accent ? `<rect x="64" y="${H - 150}" width="60" height="10" rx="5" fill="${accent}" />` : ""}
  <text x="64" y="${H - 96}" font-family="Georgia, 'Times New Roman', serif" font-size="40" fill="#2b2620">${escapeXml(product.name)}</text>
  <text x="64" y="${H - 52}" font-family="Helvetica, Arial, sans-serif" font-size="26" letter-spacing="3" fill="#6d6459">${escapeXml(label.toUpperCase())}</text>
</svg>`;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&"']/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === '"' ? "&quot;" : "&apos;",
  );
}
