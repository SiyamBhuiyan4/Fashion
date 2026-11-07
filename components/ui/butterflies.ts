/**
 * Two blue butterflies for the hero (computers only), drawn on the front canvas of
 * SakuraBackground.
 *
 *   perched   — resting on the top-right corner of a hero card (elements marked
 *               `data-butterfly-perch="0"` / `"1"`), slowly opening and closing their wings.
 *   flying    — once the mouse moves over the hero (the element marked
 *               `data-butterfly-zone`), each one circles the cursor on its own orbit.
 *   returning — after the mouse has been still for a second, or as soon as it leaves the hero
 *               (or the hero scrolls away), they fly home and settle.
 *
 * While in the air each leaves a soft blue trail that fades out over half a second.
 */

const TAU = Math.PI * 2;
const IDLE_MS = 1000;
const TRAIL_MS = 500;

type State = "perched" | "flying" | "returning" | "away";

export interface Butterfly {
  perch: number;
  state: State;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  flap: number;
  orbit: number;
  size: number;
  trail: Array<{ x: number; y: number; t: number }>;
}

export function createButterflies(): Butterfly[] {
  return [0, 1].map((perch) => ({
    perch,
    state: "away" as State,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    heading: -0.3,
    flap: perch * 1.7,
    orbit: perch * Math.PI,
    size: perch === 0 ? 1.05 : 0.9,
    trail: [],
  }));
}

/** Where a butterfly rests: just inside the top-right corner of its card, if it is on the page. */
function perchPoint(index: number): { x: number; y: number } | null {
  const element = document.querySelector<HTMLElement>(`[data-butterfly-perch="${index}"]`);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width === 0) return null; // hidden (phones)
  // Sitting on the edge: the body just above the card's top border.
  return { x: rect.right - 14, y: rect.top - 5 };
}

export function updateButterflies(
  butterflies: Butterfly[],
  dt: number,
  now: number,
  seconds: number,
  pointer: { x: number; y: number; movedAt: number },
) {
  const zone = document
    .querySelector<HTMLElement>("[data-butterfly-zone]")
    ?.getBoundingClientRect();
  const inZone = Boolean(
    zone &&
    pointer.x >= zone.left &&
    pointer.x <= zone.right &&
    pointer.y >= Math.max(0, zone.top) &&
    pointer.y <= zone.bottom,
  );
  for (const b of butterflies) {
    const home = perchPoint(b.perch);
    if (!home) {
      b.state = "away";
      b.trail.length = 0;
      continue;
    }
    if (b.state === "away") {
      b.state = "perched";
      b.x = home.x;
      b.y = home.y;
    }

    // They only follow the cursor while it is over the hero; anywhere else (or once the hero
    // has scrolled away) they go home as if the mouse had stopped.
    const idle = now - pointer.movedAt > IDLE_MS || !inZone;
    if (b.state === "perched" && !idle && pointer.movedAt > 0) b.state = "flying";
    if (b.state === "flying" && idle) b.state = "returning";
    if (b.state === "returning" && !idle) b.state = "flying";

    if (b.state === "perched") {
      // Stay put on the corner (it scrolls with the page) and breathe the wings slowly.
      b.x = home.x;
      b.y = home.y;
      b.vx = 0;
      b.vy = 0;
      b.heading += (-0.3 + 0.6 * b.perch - b.heading) * Math.min(1, dt * 4);
      b.flap += dt * 1.6;
    } else {
      let tx: number;
      let ty: number;
      if (b.state === "flying") {
        // Each circles the cursor on its own orbit, in opposite directions.
        const angle = b.orbit + seconds * (b.perch === 0 ? 2.1 : -1.7);
        tx = pointer.x + Math.cos(angle) * 58;
        ty = pointer.y + Math.sin(angle) * 34 - 18;
      } else {
        tx = home.x;
        ty = home.y;
      }
      const dx = tx - b.x;
      const dy = ty - b.y;
      const dist = Math.hypot(dx, dy);
      const maxSpeed = b.state === "flying" ? 560 : 420;
      const speed = Math.min(maxSpeed, dist * 3.2);
      const wantX = dist > 0.01 ? (dx / dist) * speed : 0;
      const wantY = dist > 0.01 ? (dy / dist) * speed : 0;
      const ease = Math.min(1, dt * (b.state === "returning" && dist < 60 ? 7 : 4));
      b.vx += (wantX - b.vx) * ease;
      b.vy += (wantY - b.vy) * ease;
      // A butterfly never flies straight: a little flutter up and down.
      b.vy += Math.sin(seconds * 11 + b.orbit) * 90 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      const moving = Math.hypot(b.vx, b.vy);
      if (moving > 20) {
        const want = Math.atan2(b.vy, b.vx) + Math.PI / 2;
        let delta = want - b.heading;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta));
        b.heading += delta * Math.min(1, dt * 8);
      }
      b.flap += dt * 26;
      b.trail.push({ x: b.x, y: b.y, t: now });

      if (b.state === "returning" && dist < 3) {
        b.state = "perched";
        b.x = home.x;
        b.y = home.y;
      }
    }
    while (b.trail.length > 0 && now - b.trail[0]!.t > TRAIL_MS) b.trail.shift();
  }
}

function wing(ctx: CanvasRenderingContext2D, upper: boolean) {
  ctx.beginPath();
  if (upper) {
    ctx.moveTo(0, -3);
    ctx.bezierCurveTo(5, -16, 21, -19, 19, -6);
    ctx.bezierCurveTo(18, 1, 7, 2, 0, 0);
  } else {
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(10, 1, 16, 11, 10, 16);
    ctx.bezierCurveTo(5, 19, 1, 10, 0, 3);
  }
  ctx.closePath();
}

export function drawButterflies(
  ctx: CanvasRenderingContext2D,
  butterflies: Butterfly[],
  dpr: number,
  now: number,
) {
  for (const b of butterflies) {
    if (b.state === "away") continue;

    // The trail: a soft blue ribbon that thins and fades over half a second.
    if (b.trail.length > 1) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = 1; i < b.trail.length; i++) {
        const a = b.trail[i - 1]!;
        const c = b.trail[i]!;
        const life = 1 - (now - c.t) / TRAIL_MS;
        if (life <= 0) continue;
        ctx.globalAlpha = life * 0.55;
        ctx.strokeStyle = "#7cc4ff";
        ctx.lineWidth = 1 + life * 4;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(c.x, c.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Wings open and close: quick in the air, slow and mostly open at rest.
    const beat = Math.abs(Math.cos(b.flap));
    const open = b.state === "perched" ? 0.62 + 0.38 * beat : 0.18 + 0.82 * beat;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(b.x, b.y);
    ctx.rotate(b.heading);
    ctx.scale(b.size, b.size);

    const gradient = ctx.createRadialGradient(9, -5, 1, 9, -2, 21);
    gradient.addColorStop(0, "#d8f1ff");
    gradient.addColorStop(0.35, "#5aa8ff");
    gradient.addColorStop(0.75, "#1f5fd6");
    gradient.addColorStop(1, "#0d2a78");

    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side * open, 1);
      for (const upper of [true, false]) {
        wing(ctx, upper);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.lineWidth = 0.9;
        ctx.strokeStyle = "rgba(8, 24, 70, 0.75)";
        ctx.stroke();
      }
      // White spots along the wing edge.
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      for (const [sx, sy, r] of [
        [16, -12, 1.2],
        [18.5, -7, 1],
        [11, 13, 0.9],
      ] as const) {
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    // Body, head and antennae.
    ctx.fillStyle = "#16192e";
    ctx.beginPath();
    ctx.ellipse(0, 3, 1.6, 9, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -7, 2, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#16192e";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-0.6, -8.5);
    ctx.quadraticCurveTo(-3, -14, -5, -15.5);
    ctx.moveTo(0.6, -8.5);
    ctx.quadraticCurveTo(3, -14, 5, -15.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
