"use client";

import { useEffect, useRef } from "react";

/**
 * The site's living background: a real cherry-blossom photograph that drifts in a slow zoom,
 * with petals carried across it on the wind.
 *
 * The petals are drawn on a canvas rather than played as a video: nothing extra to download,
 * sharp on every screen, and cheap to run. Every motion — each petal's fall, drift, sway and
 * spin, the wind gusts, and the photo's slow zoom (the `sakura-drift` keyframes in globals.css)
 * — repeats exactly every LOOP_SECONDS, so the whole scene cycles like a seamless two-minute
 * video loop.
 *
 * With "reduce motion" switched on, a single still frame is drawn.
 */

const LOOP_SECONDS = 120;
const TAU = Math.PI * 2;
const PETAL_COLORS = ["#fde4ea", "#fbd0dc", "#fff1f4", "#f7bccb", "#ffffff"];

/** Small seeded generator, so the petals are the same on every visit. */
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
    let petals: Petal[] = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      // Fewer petals on small screens: same look, less work.
      petals = makePetals(width < 640 ? 34 : width < 1200 ? 56 : 72);
    };

    const render = (seconds: number) => {
      const t = seconds % LOOP_SECONDS;
      const p = t / LOOP_SECONDS;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

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
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* The photograph, slowly zooming and panning on the same two-minute loop. */}
      <div
        className="absolute inset-[-6%] animate-sakura bg-cover bg-center"
        style={{ backgroundImage: "url(/images/sakura-bg.webp)" }}
      />
      {/* A light wash on the left keeps the headline legible over the blossom. */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(251,247,245,0.9)_0%,rgba(251,247,245,0.62)_38%,rgba(251,247,245,0.12)_72%,rgba(251,247,245,0)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-bone/70 to-transparent" />
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
