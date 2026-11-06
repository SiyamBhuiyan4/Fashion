/**
 * Geometry helpers for the procedural avatars and garments.
 *
 * Every body part and every garment is a "ring tube": a list of horizontal rings, each with its
 * own height, half-width (x) and half-depth (z), skinned into one closed surface. A tapered
 * cylinder, a limb, a torso, a trouser leg and a skirt are all the same primitive with different
 * profiles, which keeps the whole wardrobe to a handful of small functions.
 */
import * as THREE from "three";

export interface Ring {
  /** Height of the ring in local space. */
  y: number;
  /** Half-width across the body (x) and front-to-back (z). */
  rx: number;
  rz: number;
  /** Shifts the ring sideways/forwards, e.g. to give a chest or a seat its curve. */
  dx?: number;
  dz?: number;
  /** Rounds the cross-section towards a rectangle (0 = ellipse, 1 = soft box). */
  box?: number;
}

const TAU = Math.PI * 2;

/** Point on a ring's cross-section at angle a, blending an ellipse towards a soft box. */
function ringPoint(ring: Ring, angle: number): [number, number] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const box = ring.box ?? 0;
  // Superellipse: exponent 2 is an ellipse, higher is boxier.
  const n = 2 + box * 2.5;
  const ex = Math.sign(c) * Math.abs(c) ** (2 / n);
  const ez = Math.sign(s) * Math.abs(s) ** (2 / n);
  return [(ring.dx ?? 0) + ring.rx * ex, (ring.dz ?? 0) + ring.rz * ez];
}

export interface TubeOptions {
  segments?: number;
  /** Close the ends with a flat cap (default: both ends). */
  capStart?: boolean;
  capEnd?: boolean;
  /** Only draw part of the ring, e.g. an open-front coat panel. From/to in turns (0..1). */
  arcStart?: number;
  arcLength?: number;
}

/**
 * Builds a surface through the given rings (ordered bottom to top).
 * The result is centred on the local origin in x/z and uses each ring's own `y`.
 */
export function ringTubeGeometry(rings: Ring[], options: TubeOptions = {}): THREE.BufferGeometry {
  const segments = Math.max(6, options.segments ?? 28);
  const arcLength = options.arcLength ?? 1;
  const arcStart = options.arcStart ?? 0;
  const closed = arcLength >= 1;
  const columns = closed ? segments : segments + 1;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (const [rowIndex, ring] of rings.entries()) {
    for (let column = 0; column < columns; column++) {
      const t = column / segments;
      const angle = (arcStart + t * arcLength) * TAU;
      const [x, z] = ringPoint(ring, angle);
      positions.push(x, ring.y, z);
      normals.push(0, 0, 0);
      uvs.push(t, rowIndex / Math.max(1, rings.length - 1));
    }
  }

  for (let row = 0; row < rings.length - 1; row++) {
    for (let column = 0; column < (closed ? segments : segments); column++) {
      const next = closed ? (column + 1) % segments : column + 1;
      const a = row * columns + column;
      const b = row * columns + next;
      const c = (row + 1) * columns + next;
      const d = (row + 1) * columns + column;
      // Wound so the faces point outwards (x = cos, z = sin runs clockwise seen from above).
      indices.push(a, c, b, a, d, c);
    }
  }

  const cap = (ring: Ring, rowIndex: number, up: boolean): void => {
    const centreIndex = positions.length / 3;
    positions.push(ring.dx ?? 0, ring.y, ring.dz ?? 0);
    normals.push(0, 0, 0);
    uvs.push(0.5, 0.5);
    for (let column = 0; column < (closed ? segments : segments); column++) {
      const next = closed ? (column + 1) % segments : column + 1;
      const a = rowIndex * columns + column;
      const b = rowIndex * columns + next;
      if (up) indices.push(centreIndex, b, a);
      else indices.push(centreIndex, a, b);
    }
  };

  if (options.capStart !== false) cap(rings[0]!, 0, false);
  if (options.capEnd !== false) cap(rings.at(-1)!, rings.length - 1, true);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Linear interpolation between two rings, for building profiles from a few key heights. */
export function lerpRing(a: Ring, b: Ring, t: number): Ring {
  const mix = (x: number, y: number) => x + (y - x) * t;
  return {
    y: mix(a.y, b.y),
    rx: mix(a.rx, b.rx),
    rz: mix(a.rz, b.rz),
    dx: mix(a.dx ?? 0, b.dx ?? 0),
    dz: mix(a.dz ?? 0, b.dz ?? 0),
    box: mix(a.box ?? 0, b.box ?? 0),
  };
}

/** Resamples a profile so a garment built from it bends smoothly. */
export function subdivideProfile(rings: Ring[], perSegment = 2): Ring[] {
  if (rings.length < 2 || perSegment < 2) return rings;
  const out: Ring[] = [];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let step = 0; step < perSegment; step++) {
      out.push(lerpRing(rings[i]!, rings[i + 1]!, step / perSegment));
    }
  }
  out.push(rings.at(-1)!);
  return out;
}

/** Grows a profile outwards, so a garment sits just off the skin. */
export function offsetProfile(rings: Ring[], amount: number, scale = 1): Ring[] {
  return rings.map((ring) => ({
    ...ring,
    rx: ring.rx * scale + amount,
    rz: ring.rz * scale + amount,
  }));
}

/** Keeps only the part of a profile between two heights, interpolating at the cuts. */
export function sliceProfile(rings: Ring[], fromY: number, toY: number): Ring[] {
  const sorted = [...rings].sort((a, b) => a.y - b.y);
  const at = (y: number): Ring => {
    const upper = sorted.findIndex((ring) => ring.y >= y);
    if (upper <= 0) return { ...sorted[0]!, y };
    const a = sorted[upper - 1]!;
    const b = sorted[upper]!;
    const t = (y - a.y) / Math.max(1e-6, b.y - a.y);
    return { ...lerpRing(a, b, t), y };
  };
  const inner = sorted.filter((ring) => ring.y > fromY && ring.y < toY);
  return [at(fromY), ...inner, at(toY)];
}

export function disposeObject(root: THREE.Object3D): void {
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material?.dispose();
  });
}
