"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Gender } from "@/lib/types";

export function Avatar({ gender }: { gender: Gender }) {
  const modelUrl = gender === "men" ? "/models/avatars/boy.glb" : "/models/avatars/girl.glb";
  const { scene } = useGLTF(modelUrl);

  const model = useMemo(() => {
    const cloned = scene.clone(true);
    // Orient the avatar to face the forward camera
    cloned.rotation.y = Math.PI;
    cloned.position.set(0, 0, 0);

    // Ensure all materials and textures render vibrantly
    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    return cloned;
  }, [scene]);

  return <primitive object={model} />;
}

useGLTF.preload("/models/avatars/boy.glb");
useGLTF.preload("/models/avatars/girl.glb");

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

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
      <planeGeometry args={[1.5, 1.5]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  );
}
