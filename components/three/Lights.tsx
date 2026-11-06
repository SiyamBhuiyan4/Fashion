"use client";

/**
 * A three-point studio set-up. No HDR environment map is loaded: the lights are enough for
 * matte fabric, and the page stays self-contained (nothing fetched from a CDN).
 */
export function Lights() {
  return (
    <>
      <ambientLight intensity={0.55} color="#fff6ec" />
      <hemisphereLight args={["#fdf6ec", "#b9ad9b", 0.7]} />
      {/* Key */}
      <directionalLight position={[2.4, 3.4, 2.6]} intensity={2.1} color="#fff4e6" />
      {/* Fill */}
      <directionalLight position={[-2.8, 1.8, 1.6]} intensity={0.55} color="#e8eefc" />
      {/* Rim, to lift the silhouette off the background */}
      <directionalLight position={[-0.6, 2.2, -3.2]} intensity={1.15} color="#ffffff" />
    </>
  );
}
