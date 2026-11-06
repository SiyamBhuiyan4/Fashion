/**
 * The anime look: flat cel shading plus a drawn outline.
 *
 * Shading is `MeshToonMaterial` with a stepped gradient map, so light falls in two or three
 * bands instead of a smooth ramp. The outline is the classic inverted hull — the same geometry
 * drawn back-faces-only, pushed outwards along its normals, in near-black.
 */
import * as THREE from "three";

const gradientCache = new Map<number, THREE.DataTexture>();

/** A grayscale ramp with `steps` hard bands, used as the toon gradient map. */
export function gradientMap(steps = 3): THREE.DataTexture {
  const cached = gradientCache.get(steps);
  if (cached) return cached;
  const data = new Uint8Array(steps);
  for (let i = 0; i < steps; i++) {
    // The darkest band stays well off black — anime shadows are coloured, not murky — but it
    // has to be dark enough for the cel band to read at all.
    const t = (i + 1) / steps;
    data[i] = Math.round(58 + 197 * t);
  }
  const texture = new THREE.DataTexture(data, steps, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  gradientCache.set(steps, texture);
  return texture;
}

export interface ToonOptions {
  steps?: number;
  /** Lets a little light wrap round the silhouette, as cel shading usually does. */
  emissiveMix?: number;
  side?: THREE.Side;
  transparent?: boolean;
  map?: THREE.Texture;
}

export function toonMaterial(color: THREE.ColorRepresentation, options: ToonOptions = {}) {
  const base = new THREE.Color(color);
  const material = new THREE.MeshToonMaterial({
    color: base,
    gradientMap: gradientMap(options.steps ?? 3),
    side: options.side ?? THREE.FrontSide,
    transparent: options.transparent ?? false,
  });
  if (options.map) material.map = options.map;
  const mix = options.emissiveMix ?? 0.05;
  if (mix > 0) {
    material.emissive = base.clone().multiplyScalar(mix);
  }
  return material;
}

const OUTLINE_COLOR = "#1a1718";

const OUTLINE_VERTEX = /* glsl */ `
  uniform float thickness;
  void main() {
    // Push the back faces outwards along the surface normal: what is left visible around the
    // silhouette is the drawn line.
    vec3 expanded = position + normalize(normal) * thickness;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(expanded, 1.0);
  }
`;

const OUTLINE_FRAGMENT = /* glsl */ `
  uniform vec3 outlineColor;
  void main() {
    gl_FragColor = vec4(outlineColor, 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * Builds the outline companion for a mesh: same geometry, back faces, pushed out along the
 * normals by `thickness` metres. Added as a child so it follows every joint rotation.
 */
export function outlineFor(mesh: THREE.Mesh, thickness = 0.004): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      thickness: { value: thickness },
      outlineColor: { value: new THREE.Color(OUTLINE_COLOR) },
    },
    vertexShader: OUTLINE_VERTEX,
    fragmentShader: OUTLINE_FRAGMENT,
    side: THREE.BackSide,
  });
  const outline = new THREE.Mesh(mesh.geometry, material);
  outline.name = `${mesh.name}Outline`;
  outline.renderOrder = -1;
  outline.frustumCulled = mesh.frustumCulled;
  return outline;
}

/** Gives a mesh its outline and returns the mesh, so it can be used inline. */
export function withOutline(mesh: THREE.Mesh, thickness = 0.004): THREE.Mesh {
  mesh.add(outlineFor(mesh, thickness));
  return mesh;
}
