"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * The set the model stands on: a painted sweep behind, a graphic disc as a backlight, and a
 * flat floor. Drawn to canvases rather than loaded as images, so the page stays self-contained.
 */
function gradientTexture(stops: Array<[number, string]>, vertical = true): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = vertical ? 8 : 512;
  canvas.height = vertical ? 512 : 8;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = vertical
      ? context.createLinearGradient(0, 0, 0, canvas.height)
      : context.createLinearGradient(0, 0, canvas.width, 0);
    for (const [offset, color] of stops) gradient.addColorStop(offset, color);
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A soft-edged disc, for the halo behind the model. */
function discTexture(inner: string, outer: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      size * 0.1,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.72, inner);
    gradient.addColorStop(0.95, outer);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function Backdrop() {
  const sweep = useMemo(
    () =>
      gradientTexture([
        [0, "#f6ece1"],
        [0.42, "#eadfd4"],
        [0.78, "#dcc9bb"],
        [1, "#cdb4a6"],
      ]),
    [],
  );
  const floor = useMemo(() => discTexture("rgba(226,210,196,1)", "rgba(226,210,196,0.1)"), []);
  const halo = useMemo(() => discTexture("rgba(226,196,178,0.95)", "rgba(226,196,178,0)"), []);

  useEffect(
    () => () => {
      sweep.dispose();
      floor.dispose();
      halo.dispose();
    },
    [sweep, floor, halo],
  );

  return (
    <group>
      {/* The sweep: a wide curved wall, far enough back to stay out of focus. */}
      <mesh position={[0, 1.6, -3.4]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[6, 6, 7, 32, 1, true, Math.PI * 0.72, Math.PI * 0.56]} />
        <meshBasicMaterial map={sweep} side={THREE.BackSide} toneMapped={false} />
      </mesh>

      {/* A halo straight behind the model, the way a lookbook page frames a figure. */}
      <mesh position={[0, 1.02, -1.5]}>
        <planeGeometry args={[2.3, 2.3]} />
        <meshBasicMaterial map={halo} transparent depthWrite={false} toneMapped={false} />
      </mesh>

      {/* Floor, fading out rather than ending at a hard edge. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[4.2, 4.2]} />
        <meshBasicMaterial map={floor} transparent depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}
