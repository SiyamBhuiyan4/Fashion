"use client";

import { useEffect, useRef } from "react";

/**
 * The site's living background: a cherry tree in blossom with petals carried on the wind.
 *
 * It is drawn on a canvas rather than played as a video: nothing to download, sharp on every
 * screen, and it costs very little. Every motion — each petal's fall, drift, sway and spin, the
 * wind gusts and the branches' sway — is a function of time that repeats exactly every
 * LOOP_SECONDS, so the scene cycles like a seamless two-minute video loop.
 *
 * With "reduce motion" switched on, a single still frame is drawn.
 */

const LOOP_SECONDS = 120;
const TAU = Math.PI * 2;
const PETAL_COLORS = ["#f9c9d4", "#f5b3c4", "#fbdbe3", "#f0a3b9", "#fde8ee"];
const BLOSSOM_COLORS = ["#fbd3dc", "#f7bfcd", "#fde3e9", "#f3b0c2", "#fff0f3", "#f9c8d4"];

/** Small seeded generator, so the tree and the petals are the same on every visit. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Petal {
  x0: number; // 0..1 of the width
  y0: number; // 0..1 of the fall span
  falls: number; // whole falls per loop
  drift: number; // whole screen-widths drifted per loop
  size: number;
  depth: number; // 0.45..1.2: smaller, paler and slower-swaying far away
  swayAmp: number;
  swayTurns: number;
  phase: number;
  spinTurns: number;
  flipTurns: number;
  rot0: number;
  color: string;
}

function makePetals(count: number): Petal[] {
  const random = rng(7);
  return Array.from({ length: count }, () => {
    const depth = 0.45 + random() * 0.75;
    return {
      x0: random(),
      y0: random(),
      falls: 1 + Math.floor(random() * 3),
      drift: 1 + Math.floor(random() * 2),
      size: (5 + random() * 6) * depth,
      depth,
      swayAmp: 18 + random() * 40,
      swayTurns: 4 + Math.floor(random() * 8),
      phase: random() * TAU,
      spinTurns: (random() < 0.5 ? -1 : 1) * (3 + Math.floor(random() * 9)),
      flipTurns: 6 + Math.floor(random() * 14),
      rot0: random() * TAU,
      color: PETAL_COLORS[Math.floor(random() * PETAL_COLORS.length)]!,
    };
  });
}

/** Wind displacement in px: a sum of whole-loop harmonics, so it repeats every loop. */
function gust(t: number): number {
  const p = t / LOOP_SECONDS;
  return (
    60 * Math.sin(TAU * p) + 34 * Math.sin(TAU * 3 * p + 1.3) + 16 * Math.sin(TAU * 7 * p + 2.1)
  );
}

/** Draws the tree once into its own canvas: trunk from the bottom right, canopy above. */
function drawTree(width: number, height: number, dpr: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  const random = rng(21);
  const scale = Math.min(1.15, Math.max(0.55, Math.min(width / 1400, height / 800)));
  const blossoms: Array<[number, number, number, string, number]> = [];

  const branch = (
    x: number,
    y: number,
    angle: number,
    length: number,
    thick: number,
    level: number,
  ) => {
    const bend = (random() - 0.5) * 0.5;
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    const cx = x + Math.cos(angle + bend) * length * 0.55;
    const cy = y + Math.sin(angle + bend) * length * 0.55;
    ctx.strokeStyle = level < 2 ? "#4a3a36" : "#5a4642";
    ctx.lineWidth = thick;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.stroke();

    if (level >= 6 || length < 14 * scale) {
      // Blossom cluster at the tip.
      const count = 12 + Math.floor(random() * 10);
      for (let i = 0; i < count; i++) {
        const r = (5 + random() * 9) * scale;
        const a = random() * TAU;
        const d = random() * 30 * scale;
        blossoms.push([
          x2 + Math.cos(a) * d,
          y2 + Math.sin(a) * d,
          r,
          BLOSSOM_COLORS[Math.floor(random() * BLOSSOM_COLORS.length)]!,
          0.55 + random() * 0.4,
        ]);
      }
      return;
    }
    const children = level < 2 ? 2 + Math.floor(random() * 2) : 2 + Math.floor(random() * 3);
    for (let i = 0; i < children; i++) {
      const spread = (i / Math.max(1, children - 1) - 0.5) * (0.9 + random() * 0.5);
      branch(
        x2,
        y2,
        angle + spread + (random() - 0.5) * 0.3,
        length * (0.66 + random() * 0.16),
        Math.max(1, thick * 0.66),
        level + 1,
      );
    }
    // A few blossoms along the older branches too.
    if (level >= 3 && random() < 0.6) {
      blossoms.push([cx, cy, (5 + random() * 6) * scale, BLOSSOM_COLORS[0]!, 0.6]);
    }
  };

  const baseX = width * 0.9;
  const baseY = height + 10;
  branch(baseX, baseY, -Math.PI / 2 - 0.32, 210 * scale, 26 * scale, 0);
  branch(baseX + 30 * scale, baseY, -Math.PI / 2 + 0.12, 150 * scale, 14 * scale, 1);

  // Soft, overlapping blossoms: each a radial glow with a paler heart, so the canopy reads as
  // a cloud of flowers rather than separate dots.
  for (const [x, y, r, color, alpha] of blossoms) {
    const glow = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r);
    glow.addColorStop(0, "#fff7f9");
    glow.addColorStop(0.45, color);
    glow.addColorStop(1, `${color}00`);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return canvas;
}

function petalPath(ctx: CanvasRenderingContext2D, s: number) {
  // A cherry petal: rounded, with the small notch at its tip.
  ctx.beginPath();
  ctx.moveTo(0, s);
  ctx.bezierCurveTo(s * 0.95, s * 0.45, s * 0.75, -s * 0.8, s * 0.18, -s);
  ctx.lineTo(0, -s * 0.78);
  ctx.lineTo(-s * 0.18, -s);
  ctx.bezierCurveTo(-s * 0.75, -s * 0.8, -s * 0.95, s * 0.45, 0, s);
  ctx.closePath();
}

export function SakuraBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let tree: HTMLCanvasElement | null = null;
    let petals: Petal[] = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      tree = drawTree(width, height, dpr);
      // Fewer petals on small screens: same look, less work.
      petals = makePetals(width < 640 ? 34 : width < 1200 ? 56 : 72);
    };

    const render = (seconds: number) => {
      const t = seconds % LOOP_SECONDS;
      const p = t / LOOP_SECONDS;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // The tree sways a touch with the gusts, pivoting at its base.
      if (tree) {
        const sway = 0.006 * Math.sin(TAU * 3 * p) + 0.00008 * gust(t);
        const baseX = width * 0.9;
        const baseY = height + 10;
        ctx.save();
        ctx.translate(baseX, baseY);
        ctx.rotate(sway);
        ctx.translate(-baseX, -baseY);
        ctx.drawImage(tree, 0, 0, width, height);
        ctx.restore();
      }

      const margin = 40;
      const spanY = height + margin * 2;
      const spanX = width + margin * 2;
      const wind = gust(t);
      for (const petal of petals) {
        const y = ((petal.y0 * spanY + (petal.falls * spanY * t) / LOOP_SECONDS) % spanY) - margin;
        const sway = petal.swayAmp * Math.sin(TAU * petal.swayTurns * p + petal.phase);
        const rawX =
          petal.x0 * spanX + (petal.drift * spanX * t) / LOOP_SECONDS + sway + wind * petal.depth;
        const x = (((rawX % spanX) + spanX) % spanX) - margin;
        const rotation = petal.rot0 + TAU * petal.spinTurns * p;
        const flip = Math.cos(TAU * petal.flipTurns * p + petal.phase);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.scale(0.25 + 0.75 * Math.abs(flip), 1);
        ctx.globalAlpha = 0.5 + 0.45 * petal.depth;
        ctx.fillStyle = petal.color;
        petalPath(ctx, petal.size);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    resize();
    let frame = 0;
    let last = 0;
    const start = performance.now();
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      // ~40 fps is plenty for drifting petals and saves battery.
      if (now - last < 24) return;
      last = now;
      render((now - start) / 1000);
    };

    if (still) render(0);
    else frame = requestAnimationFrame(loop);

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        if (still) render(0);
      }, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
