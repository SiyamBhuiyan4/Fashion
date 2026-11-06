"use client";

/**
 * A three-point studio set-up for cel shading. No HDR environment map is loaded: the lights are
 * enough for flat toon bands, and the page stays self-contained (nothing fetched from a CDN).
 */
export function Lights() {
  return (
    <>
      {/* Cel shading needs one clear key: it decides where the single shadow band falls. */}
      <ambientLight intensity={0.2} color="#fff4ea" />
      <hemisphereLight args={["#fff6ee", "#bba894", 0.22]} />
      <directionalLight position={[3.2, 1.5, 0.9]} intensity={2.4} color="#fff3e4" />
      {/* Fill, so the shadow side keeps its colour instead of going grey */}
      <directionalLight position={[-2.4, 1.2, 1.6]} intensity={0.45} color="#e4ddff" />
      {/* Rim, to lift the silhouette off the backdrop */}
      <directionalLight position={[-1, 2.4, -3]} intensity={0.8} color="#ffffff" />
    </>
  );
}
