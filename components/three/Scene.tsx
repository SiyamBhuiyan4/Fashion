"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, AdaptiveDpr, AdaptiveEvents } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import type { Gender } from "@/lib/types";
import { Avatar } from "@/components/three/Avatar";
import { Backdrop } from "@/components/three/Backdrop";
import { Lights } from "@/components/three/Lights";
import { useOutfitStore } from "@/store/outfitStore";
import { measurementsFor } from "@/lib/three/figure";

function CameraRig({ gender }: { gender: Gender }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const autoRotate = useOutfitStore((state) => state.autoRotate);
  const resetToken = useOutfitStore((state) => state.viewResetToken);
  const measurements = measurementsFor(gender);
  const target = new THREE.Vector3(0, measurements.height * 0.5, 0);

  useEffect(() => {
    const instance = controls.current;
    if (!instance) return;
    instance.target.copy(target);
    instance.object.position.set(0, measurements.height * 0.54, 3.9);
    instance.update();
    // `target` is derived from the gender and never changes between renders of one page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken, gender]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={target}
      autoRotate={autoRotate}
      autoRotateSpeed={1.6}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={1.1}
      maxDistance={5.2}
      minPolarAngle={Math.PI * 0.08}
      maxPolarAngle={Math.PI * 0.92}
    />
  );
}

export function Scene({ gender }: { gender: Gender }) {
  const measurements = measurementsFor(gender);
  const [ready, setReady] = useState(false);

  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows={false}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
        camera={{ fov: 32, position: [0, measurements.height * 0.54, 3.9], near: 0.1, far: 50 }}
        onCreated={({ gl }) => {
          // Flat, illustrative colour: tone mapping would soften exactly the banding that
          // makes cel shading read as drawn.
          gl.toneMapping = THREE.NoToneMapping;
          setReady(true);
        }}
      >
        <color attach="background" args={["#f0e7df"]} />
        <Lights />
        <Backdrop />
        <Suspense fallback={null}>
          <Avatar gender={gender} />
        </Suspense>
        <ContactShadows
          position={[0, 0.002, 0]}
          opacity={0.3}
          scale={3}
          blur={2.8}
          far={1.2}
          resolution={512}
          color="#5b4435"
        />
        <CameraRig gender={gender} />
        <AdaptiveDpr pixelated />
        <AdaptiveEvents />
      </Canvas>

      {!ready ? (
        <div className="absolute inset-0 grid place-items-center bg-bone-dark/60">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" />
            <p className="text-xs tracking-[0.2em] text-ink-faint uppercase">Preparing the model</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
