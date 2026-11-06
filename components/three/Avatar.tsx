"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Gender } from "@/lib/types";
import { buildFigure, type Figure, type PartName } from "@/lib/three/figure";
import { buildGarment, type GarmentBuild } from "@/lib/three/garments";
import { disposeObject } from "@/lib/three/geometry";
import { PoseAnimator } from "@/lib/three/poses";
import { useOutfitStore, type WornItem } from "@/store/outfitStore";
import { usePrefsStore } from "@/store/prefsStore";
import { useCatalogStore } from "@/store/catalogStore";

/** Worn items as a stable key, so garments are only rebuilt when the outfit really changes. */
function outfitKey(items: WornItem[]): string {
  return items.map((item) => `${item.productId}:${item.colorHex}`).join("|");
}

export function Avatar({ gender }: { gender: Gender }) {
  const skinHex = usePrefsStore((state) => state.skinTone[gender]);
  const skinColor = usePrefsStore((state) => state.skinHex);
  const pose = useOutfitStore((state) => state.pose);
  const worn = useOutfitStore((state) => state.worn);
  const setPose = useOutfitStore((state) => state.setPose);
  const getProduct = useCatalogStore((state) => state.get);

  const figure = useMemo<Figure>(() => buildFigure(gender, skinColor(gender)), [gender]); // eslint-disable-line react-hooks/exhaustive-deps

  const animator = useMemo(
    () => new PoseAnimator(figure.joints, figure.parts.torso),
    [figure],
  );

  const builds = useRef<GarmentBuild[]>([]);

  // Every geometry and material built here is ours to free.
  useEffect(() => {
    const built = builds.current;
    return () => {
      for (const build of built) build.dispose();
      built.length = 0;
      disposeObject(figure.root);
    };
  }, [figure]);

  useEffect(() => {
    figure.setSkinColor(skinColor(gender));
  }, [figure, gender, skinHex, skinColor]);

  const items = useMemo(() => {
    const wardrobe = worn[gender];
    const seen = new Set<string>();
    const list: WornItem[] = [];
    for (const slot of ["bottom", "top", "shoes", "outerwear"] as const) {
      const item = wardrobe[slot];
      if (item && !seen.has(item.productId)) {
        seen.add(item.productId);
        list.push(item);
      }
    }
    return list;
  }, [worn, gender]);

  const key = outfitKey(items);

  useEffect(() => {
    // Remove what is on the avatar now.
    for (const build of builds.current) {
      for (const { object } of build.attachments) object.removeFromParent();
      build.dispose();
    }
    builds.current = [];

    const hidden = new Set<PartName>();
    for (const item of items) {
      const product = getProduct(item.productId);
      if (!product) continue;
      const build = buildGarment(product, item.colorHex, figure);
      for (const { joint, object } of build.attachments) {
        figure.joints[joint]?.add(object);
      }
      for (const part of build.hidden) hidden.add(part);
      builds.current.push(build);
    }

    // Hide the body parts the clothes cover, show the rest.
    for (const [name, mesh] of Object.entries(figure.parts)) {
      if (!mesh) continue;
      mesh.visible = !hidden.has(name as PartName);
    }
  }, [key, figure, getProduct, items]);

  useEffect(() => {
    animator.setPose(pose);
  }, [animator, pose]);

  useFrame((_, delta) => {
    // A one-shot pose (Turn) reports when it is done, so the UI can fall back to Idle.
    if (animator.update(delta) && useOutfitStore.getState().pose === "turn") setPose("idle");
  });

  return <primitive object={figure.root} />;
}

/** A soft shadow puck under the avatar, cheaper than a real shadow-casting floor. */
export function GroundShadow() {
  const texture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, "rgba(40,34,28,0.5)");
      gradient.addColorStop(0.55, "rgba(40,34,28,0.18)");
      gradient.addColorStop(1, "rgba(40,34,28,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    return map;
  }, []);

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
      <planeGeometry args={[1.5, 1.5]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}
