/**
 * Garments, built in code from the same measurements as the avatar (lib/three/figure.ts).
 *
 * Every piece is made by growing a body profile outwards and slicing it between two heights, then
 * parenting the result to the joint that part of the body hangs from — so a sleeve follows the
 * elbow and a trouser leg follows the knee without any skinning or cloth simulation.
 *
 * A garment also says which body parts it covers; those meshes are hidden while it is worn, so
 * nothing pokes through.
 */
import * as THREE from "three";
import type { Fabric, GarmentSpec, Product } from "@/lib/types";
import {
  lerpRing,
  offsetProfile,
  ringTubeGeometry,
  sliceProfile,
  subdivideProfile,
  type Ring,
} from "@/lib/three/geometry";
import type { Figure, JointName, PartName } from "@/lib/three/figure";
import { toonMaterial, withOutline } from "@/lib/three/toon";

export interface GarmentBuild {
  /** Objects to add to the named joints. */
  attachments: Array<{ joint: JointName; object: THREE.Object3D }>;
  /** Body parts to hide while this garment is worn. */
  hidden: PartName[];
  dispose: () => void;
}

type Fit = NonNullable<GarmentSpec["fit"]>;

/** How far a garment stands off the skin, in metres, by fit. */
const EASE: Record<Fit, number> = { slim: 0.005, regular: 0.009, relaxed: 0.015, wide: 0.022 };

function materialFor(fabric: Fabric, hex: string): THREE.Material {
  // Cel shading, like the avatars. Fabric only changes how hard the shadow band is and how much
  // light the cloth keeps in shadow — a satin reads brighter and flatter than a wool.
  switch (fabric) {
    case "silk":
      return toonMaterial(hex, { steps: 4, emissiveMix: 0.3, side: THREE.DoubleSide });
    case "leather":
      return toonMaterial(hex, { steps: 4, emissiveMix: 0.18, side: THREE.DoubleSide });
    case "nylon":
      return toonMaterial(hex, { steps: 3, emissiveMix: 0.24, side: THREE.DoubleSide });
    case "wool":
    case "knit":
    case "suede":
      return toonMaterial(hex, { steps: 2, emissiveMix: 0.14, side: THREE.DoubleSide });
    case "denim":
      return toonMaterial(hex, { steps: 3, emissiveMix: 0.12, side: THREE.DoubleSide });
    default:
      return toonMaterial(hex, { steps: 3, emissiveMix: 0.16, side: THREE.DoubleSide });
  }
}

/**
 * The body from the bottom of the hips to the shoulders, in `spine` space, so a top can be cut
 * anywhere along it without caring where the waist joint is.
 */
function bodyColumn(figure: Figure): Ring[] {
  const m = figure.measurements;
  const waistToHips = m.waistY - m.hipY;
  // The two body profiles deliberately overlap around the waist so the skin has no seam. A
  // garment must not follow both of them (the rings would zig-zag and the body would show
  // through), so they are cut against each other just below the waist.
  const cut = -0.07;
  const pelvis = figure.profiles.pelvis
    .map((ring) => ({ ...ring, y: ring.y - waistToHips }))
    .filter((ring) => ring.y < cut);
  const torso = figure.profiles.torso.filter((ring) => ring.y >= cut);
  const column = [...pelvis, ...torso].sort((a, b) => a.y - b.y);

  // Around the hips the thighs are wider than the hip block itself, so the column is widened to
  // the real outer silhouette — otherwise a skirt or a seat cuts straight through the legs.
  const legTop = m.hipY - 0.02;
  const thigh = figure.profiles.upperLeg;
  const thighRadiusAt = (localY: number): number => {
    if (localY > (thigh.at(-1)?.y ?? 0)) return 0;
    for (let i = thigh.length - 1; i > 0; i--) {
      const upper = thigh[i]!;
      const lower = thigh[i - 1]!;
      if (localY <= upper.y && localY >= lower.y) {
        const t = (localY - lower.y) / Math.max(1e-6, upper.y - lower.y);
        return lower.rx + (upper.rx - lower.rx) * t;
      }
    }
    return thigh[0]?.rx ?? 0;
  };

  return subdivideProfile(
    column.map((ring) => {
      const worldY = ring.y + m.waistY;
      if (worldY > m.hipY + 0.04) return ring;
      const needed = m.legX + thighRadiusAt(worldY - legTop) + 0.004;
      return needed > ring.rx ? { ...ring, rx: needed } : ring;
    }),
    1,
  );
}

/** Adds a soft hem: the last ring flares a little so the edge reads as fabric, not a cut tube. */
function withHem(rings: Ring[], flare = 1.04): Ring[] {
  if (rings.length < 2) return rings;
  const first = rings[0]!;
  return [{ ...first, rx: first.rx * flare, rz: first.rz * flare }, ...rings.slice(1)];
}

function buildMesh(
  rings: Ring[],
  material: THREE.Material,
  name: string,
  options?: { segments?: number; arcStart?: number; arcLength?: number; caps?: boolean },
): THREE.Mesh {
  const geometry = ringTubeGeometry(rings, {
    segments: options?.segments ?? 32,
    arcStart: options?.arcStart,
    arcLength: options?.arcLength,
    capStart: options?.caps ?? false,
    capEnd: options?.caps ?? false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  withOutline(mesh, 0.0035);
  return mesh;
}

/** Neckline height (in `spine` space) for a top. */
function necklineY(figure: Figure, spec: GarmentSpec): number {
  const m = figure.measurements;
  const shoulder = m.shoulderY - m.waistY;
  switch (spec.kind) {
    case "tank":
      return shoulder - 0.085;
    case "dress":
      return shoulder - 0.07;
    case "polo":
    case "shirt":
      return shoulder - 0.045;
    default:
      return shoulder - 0.055;
  }
}

/** Hem height (in `spine` space) for a top. */
function topHemY(figure: Figure, spec: GarmentSpec): number {
  const m = figure.measurements;
  const waistToHips = m.waistY - m.hipY;
  const hipLine = -waistToHips; // the widest part of the hips
  switch (spec.kind) {
    case "dress": {
      // length 0.5 ≈ mini, 0.78 ≈ midi, 1 ≈ ankle.
      const hemAbsolute = m.hipY - ((spec.length ?? 0.78) - 0.45) * 1.55;
      return hemAbsolute - m.waistY;
    }
    case "shirt":
      return hipLine - 0.04;
    case "tank":
      return hipLine + 0.03;
    case "sweater":
      return hipLine + 0.01;
    default:
      return hipLine - 0.005;
  }
}

function buildSleeves(
  figure: Figure,
  spec: GarmentSpec,
  material: THREE.Material,
  ease: number,
): { attachments: GarmentBuild["attachments"]; hidden: PartName[] } {
  const attachments: GarmentBuild["attachments"] = [];
  const hidden: PartName[] = [];
  const sleeve = spec.sleeve ?? "short";
  if (sleeve === "none") return { attachments, hidden };

  // A cap over each shoulder, so the sleeve joins the body instead of floating beside it.
  const shoulderRadius = (figure.measurements.gender === "women" ? 0.047 : 0.054) + ease;
  for (const side of ["L", "R"] as const) {
    const sign = side === "L" ? 1 : -1;
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(shoulderRadius, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62),
      material,
    );
    // Reaches in over the shoulder seam, so no skin shows between body and sleeve.
    cap.scale.set(1.75, 1.05, 1.1);
    cap.position.set(-sign * 0.052, 0.004, 0);
    cap.name = `shoulderCap${side}`;
    withOutline(cap, 0.0035);
    attachments.push({ joint: `arm${side}` as JointName, object: cap });
  }

  const upper = offsetProfile(figure.profiles.upperArm, ease * 0.5, 1.04);
  const upperLength = figure.measurements.upperArmLength;

  if (sleeve === "short") {
    const cut = -upperLength * (spec.kind === "polo" ? 0.52 : 0.44);
    for (const side of ["L", "R"] as const) {
      attachments.push({
        joint: `arm${side}` as JointName,
        object: buildMesh(withHem(sliceProfile(upper, cut, 0.05), 1.08), material, `sleeve${side}`, {
          segments: 20,
        }),
      });
    }
    return { attachments, hidden };
  }

  // Long sleeve: upper arm plus forearm, finished with a cuff.
  const forearm = offsetProfile(figure.profiles.forearm, ease * 0.6, 1.03);
  for (const side of ["L", "R"] as const) {
    attachments.push({
      joint: `arm${side}` as JointName,
      object: buildMesh(sliceProfile(upper, -upperLength - 0.005, 0.05), material, `sleeveUpper${side}`, {
        segments: 20,
      }),
    });
    const cuffEnd = -figure.measurements.forearmLength + (spec.kind === "blazer" ? 0.03 : 0.005);
    attachments.push({
      joint: `elbow${side}` as JointName,
      object: buildMesh(
        withHem(sliceProfile(forearm, cuffEnd, 0.01), 1.1),
        material,
        `sleeveLower${side}`,
        { segments: 20 },
      ),
    });
    hidden.push(`upperArm${side}` as PartName, `forearm${side}` as PartName);
  }
  return { attachments, hidden };
}

function buildCollar(
  figure: Figure,
  spec: GarmentSpec,
  material: THREE.Material,
): THREE.Object3D | null {
  if (!spec.collar) return null;
  const neck = figure.profiles.neck;
  const base = neck[0]!;
  // Low and close: a tall collar would swallow the chin on these anime proportions.
  const rings: Ring[] = [
    { ...base, rx: base.rx * 0.96, rz: base.rz * 0.96, y: -0.012 },
    { ...base, rx: base.rx * 1.04, rz: base.rz * 1.06, y: 0.012 },
    { ...base, rx: base.rx * 1.16, rz: base.rz * 1.22, y: 0.03 },
  ];
  const collar = buildMesh(rings, material, "collar", { segments: 24 });
  collar.position.y = -0.018;
  return collar;
}

function buildBottoms(
  figure: Figure,
  spec: GarmentSpec,
  material: THREE.Material,
): GarmentBuild {
  const attachments: GarmentBuild["attachments"] = [];
  // The hips are fully enclosed by anything worn on the lower body, so the body mesh is
  // hidden rather than left to poke through a close-fitting seat.
  const hidden: PartName[] = ["underwearBottom", "pelvis", "baseLegL", "baseLegR"];
  const ease = EASE[spec.fit ?? "regular"];
  const m = figure.measurements;
  const column = bodyColumn(figure);
  const waistToHips = m.waistY - m.hipY;

  // Seat and waistband, worn on the hips joint.
  const seatTop = spec.kind === "skirt" || spec.kind === "trousers" ? 0.02 : -0.01;
  const seat = offsetProfile(
    sliceProfile(column, -waistToHips - 0.17, seatTop).map((ring) => ({
      ...ring,
      y: ring.y + waistToHips,
    })),
    ease + 0.006,
    1.01,
  );
  attachments.push({ joint: "hips", object: buildMesh(seat, material, "seat", { segments: 32 }) });

  if (spec.kind === "skirt") {
    // length 0.4 ≈ above the knee, 0.72 ≈ midi, 1 ≈ ankle.
    const hemAbsolute = m.hipY - ((spec.length ?? 0.7) - 0.36) * 1.45;
    const hipRing = seat.at(-1) ?? seat[0]!;
    const bottom = seat[0]!;
    const hemY = hemAbsolute - m.hipY;
    const flare = spec.fit === "wide" ? 2.2 : spec.fit === "slim" ? 1.25 : 1.7;
    const rings: Ring[] = [
      { y: hemY, rx: bottom.rx * flare, rz: bottom.rz * flare, box: 0.1 },
      {
        y: hemY * 0.45,
        rx: bottom.rx * (1 + (flare - 1) * 0.45),
        rz: bottom.rz * (1 + (flare - 1) * 0.45),
        box: 0.12,
      },
      { y: -0.1, rx: bottom.rx * 1.03, rz: bottom.rz * 1.03, box: 0.14 },
      { y: 0.0, rx: hipRing.rx * 0.98, rz: hipRing.rz * 0.98, box: 0.14 },
    ];
    attachments.push({ joint: "hips", object: buildMesh(rings, material, "skirt", { segments: 36 }) });
    return { attachments, hidden, dispose: () => undefined };
  }

  // Trouser legs.
  const widen = spec.fit === "wide" ? 1.3 : spec.fit === "relaxed" ? 1.16 : spec.fit === "slim" ? 1.02 : 1.08;
  const upper = offsetProfile(figure.profiles.upperLeg, ease, 1.02);
  const lower = offsetProfile(figure.profiles.lowerLeg, ease, 1.02);
  const upperLength = m.hipY - 0.02 - m.kneeY;
  const lowerLength = m.kneeY - m.ankleY;
  const length = spec.length ?? 1;
  const isShorts = spec.kind === "shorts";

  for (const side of ["L", "R"] as const) {
    if (isShorts) {
      const cut = -upperLength * Math.min(0.95, 0.35 + length * 0.9);
      const legRings = withHem(
        sliceProfile(upper, cut, 0.06).map((ring) => ({
          ...ring,
          rx: ring.rx * widen,
          rz: ring.rz * widen,
        })),
        1.06,
      );
      attachments.push({
        joint: `leg${side}` as JointName,
        object: buildMesh(legRings, material, `shorts${side}`, { segments: 24 }),
      });
      continue;
    }

    const legRings = sliceProfile(upper, -upperLength - 0.01, 0.06).map((ring) => ({
      ...ring,
      rx: ring.rx * widen,
      rz: ring.rz * widen,
    }));
    attachments.push({
      joint: `leg${side}` as JointName,
      object: buildMesh(legRings, material, `trouserUpper${side}`, { segments: 24 }),
    });

    // The hem can stop above the ankle for a cropped trouser.
    const hemY = -lowerLength * Math.min(1, 0.45 + length * 0.62);
    const taper = spec.fit === "wide" ? 1.5 : spec.fit === "relaxed" ? 1.28 : spec.fit === "slim" ? 1.05 : 1.16;
    const lowerRings = withHem(
      sliceProfile(lower, hemY, 0.02).map((ring, index, all) => {
        // Widen towards the hem so the leg opening reads correctly.
        const t = 1 - index / Math.max(1, all.length - 1);
        const scale = widen + (taper - widen) * t;
        return { ...ring, rx: ring.rx * scale, rz: ring.rz * scale };
      }),
      1.05,
    );
    attachments.push({
      joint: `knee${side}` as JointName,
      object: buildMesh(lowerRings, material, `trouserLower${side}`, { segments: 24 }),
    });
    hidden.push(`upperLeg${side}` as PartName);
    if (length > 0.85) hidden.push(`lowerLeg${side}` as PartName);
  }

  return { attachments, hidden, dispose: () => undefined };
}

function buildTop(figure: Figure, spec: GarmentSpec, material: THREE.Material): GarmentBuild {
  const ease = EASE[spec.fit ?? "regular"];
  const column = bodyColumn(figure);
  const hemY = topHemY(figure, spec);
  const neckY = necklineY(figure, spec);
  const hidden: PartName[] = [];

  let rings: Ring[];
  if (spec.kind === "dress") {
    // Body to the hips, then a column that falls away from the leg.
    const bodice = offsetProfile(
      sliceProfile(column, -(figure.measurements.waistY - figure.measurements.hipY) - 0.06, neckY),
      ease + 0.006,
      1.0,
    );
    const hips = bodice[0]!;
    const flare = spec.fit === "slim" ? 1.12 : spec.fit === "wide" ? 1.9 : 1.4;
    const skirt: Ring[] = [
      { y: hemY, rx: hips.rx * flare, rz: hips.rz * flare, box: 0.1 },
      {
        y: hemY * 0.45,
        rx: hips.rx * (1 + (flare - 1) * 0.5),
        rz: hips.rz * (1 + (flare - 1) * 0.5),
        box: 0.12,
      },
    ];
    rings = [...skirt, ...bodice];
    hidden.push("underwearBottom", "underwearTop", "pelvis", "baseLegL", "baseLegR");
  } else {
    rings = withHem(offsetProfile(sliceProfile(column, hemY, neckY), ease, 1.0), 1.03);
    if (neckY > figure.measurements.chestY - figure.measurements.waistY) hidden.push("underwearTop");
  }

  const attachments: GarmentBuild["attachments"] = [
    { joint: "spine", object: buildMesh(rings, material, "topBody", { segments: 36 }) },
  ];

  const sleeves = buildSleeves(figure, spec, material, ease);
  attachments.push(...sleeves.attachments);
  hidden.push(...sleeves.hidden);

  const collar = buildCollar(figure, spec, material);
  if (collar) attachments.push({ joint: "neck", object: collar });

  if (spec.kind === "tank" || (spec.kind === "dress" && (spec.sleeve ?? "none") === "none")) {
    // Straps over each shoulder.
    for (const side of ["L", "R"] as const) {
      const sign = side === "L" ? 1 : -1;
      const strap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8),
        material,
      );
      strap.position.set(sign * 0.085, -0.01, 0.01);
      strap.rotation.z = sign * 0.25;
      strap.rotation.x = -0.1;
      strap.name = `strap${side}`;
      withOutline(strap, 0.003);
      attachments.push({ joint: "chest", object: strap });
    }
  }

  return { attachments, hidden, dispose: () => undefined };
}

function buildOuterwear(figure: Figure, spec: GarmentSpec, material: THREE.Material): GarmentBuild {
  const ease = EASE[spec.fit ?? "relaxed"] + 0.008;
  const column = bodyColumn(figure);
  const m = figure.measurements;
  const waistToHips = m.waistY - m.hipY;
  // length 0.5 ≈ hip, 0.62 ≈ a blazer at the seat, 0.8 ≈ mid-calf.
  const hemAbsolute = m.hipY * 1.06 - ((spec.length ?? 0.6) - 0.5) * 1.5;
  const hemY = Math.min(-waistToHips + 0.04, hemAbsolute - m.waistY);
  const neckY = m.shoulderY - m.waistY - 0.015;

  const rings = withHem(offsetProfile(sliceProfile(column, hemY, neckY), ease, 1.02), 1.05);
  const attachments: GarmentBuild["attachments"] = [];

  // Worn open: two panels that meet at the back (a quarter turn is +z, the front) and leave a
  // gap down the centre front.
  const gap = spec.kind === "hoodie" ? 0.025 : 0.05;
  attachments.push({
    joint: "spine",
    object: buildMesh(rings, material, "coatLeft", {
      segments: 44,
      arcStart: 0.25 + gap / 2,
      arcLength: 0.5 - gap / 2,
    }),
  });
  attachments.push({
    joint: "spine",
    object: buildMesh(rings, material, "coatRight", {
      segments: 44,
      arcStart: 0.75,
      arcLength: 0.5 - gap / 2,
    }),
  });

  const sleeves = buildSleeves(figure, { ...spec, sleeve: "long" }, material, ease);
  attachments.push(...sleeves.attachments);

  if (spec.kind === "hoodie") {
    // Hood resting on the shoulders, behind the head.
    const hood = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), material);
    hood.scale.set(1.08, 1.0, 1.12);
    hood.rotation.x = 0.45;
    hood.position.set(0, 0.0, -0.075);
    hood.name = "hood";
    withOutline(hood, 0.0035);
    attachments.push({ joint: "neck", object: hood });
  } else if (spec.collar) {
    const collar = buildCollar(figure, spec, material);
    if (collar) {
      collar.scale.setScalar(1.06);
      attachments.push({ joint: "neck", object: collar });
    }
    // Lapels down the chest.
    for (const side of ["L", "R"] as const) {
      const sign = side === "L" ? 1 : -1;
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.2, 0.012), material);
      lapel.position.set(sign * 0.062, -0.07, 0.102);
      lapel.rotation.z = sign * 0.3;
      lapel.rotation.x = -0.14;
      lapel.name = `lapel${side}`;
      withOutline(lapel, 0.003);
      attachments.push({ joint: "chest", object: lapel });
    }
  }

  if (spec.kind === "coat" && (spec.length ?? 0) > 0.7) {
    // Belt at the waist.
    const beltRings = offsetProfile(sliceProfile(column, -0.03, 0.03), ease + 0.004, 1.02);
    const belt = buildMesh(beltRings, material, "belt", { segments: 32 });
    attachments.push({ joint: "spine", object: belt });
  }

  return { attachments, hidden: sleeves.hidden, dispose: () => undefined };
}

function buildShoes(figure: Figure, spec: GarmentSpec, material: THREE.Material): GarmentBuild {
  const m = figure.measurements;
  const attachments: GarmentBuild["attachments"] = [];
  const hidden: PartName[] = ["footL", "footR"];
  const boot = spec.kind === "boots";
  const heelHeight = spec.kind === "heels" ? 0.055 : 0;
  const soleThickness = spec.kind === "sneakers" ? 0.028 : 0.016;

  for (const side of ["L", "R"] as const) {
    const shoe = new THREE.Group();
    shoe.name = `shoe${side}`;

    const upperRings: Ring[] = [
      { y: -m.ankleY + soleThickness, rx: 0.05, rz: m.footLength * 0.52, dz: m.footLength * 0.16, box: 0.55 },
      { y: -m.ankleY * 0.35, rx: 0.053, rz: m.footLength * 0.48, dz: m.footLength * 0.14, box: 0.5 },
      { y: 0.015, rx: 0.051, rz: m.footLength * 0.3, dz: m.footLength * 0.015, box: 0.35 },
      { y: 0.055, rx: 0.047, rz: m.footLength * 0.22, dz: -m.footLength * 0.04, box: 0.3 },
    ];
    shoe.add(buildMesh(upperRings, material, "shoeUpper", { segments: 22, caps: true }));

    // Sole.
    const soleMaterial = toonMaterial(spec.kind === "sneakers" ? "#f2efe8" : "#2b2622", {
      steps: 2,
      side: THREE.DoubleSide,
    });
    const soleRings: Ring[] = [
      { y: -m.ankleY, rx: 0.051, rz: m.footLength * 0.5, dz: m.footLength * 0.15, box: 0.65 },
      { y: -m.ankleY + soleThickness, rx: 0.053, rz: m.footLength * 0.53, dz: m.footLength * 0.16, box: 0.6 },
    ];
    const sole = buildMesh(soleRings, soleMaterial, "sole", { segments: 22, caps: true });
    sole.position.y = -heelHeight;
    shoe.add(sole);

    if (heelHeight > 0) {
      const heel = new THREE.Mesh(new THREE.BoxGeometry(0.05, heelHeight, 0.05), soleMaterial);
      heel.position.set(0, -m.ankleY - heelHeight / 2, -m.footLength * 0.3);
      shoe.add(heel);
    }

    if (boot) {
      // Shaft up the lower leg.
      const shaft = offsetProfile(
        sliceProfile(figure.profiles.lowerLeg, -(m.kneeY - m.ankleY) + 0.01, -(m.kneeY - m.ankleY) + 0.16),
        0.014,
        1.03,
      );
      attachments.push({
        joint: `knee${side}` as JointName,
        object: buildMesh(shaft, material, `bootShaft${side}`, { segments: 20 }),
      });
    }

    attachments.push({ joint: `ankle${side}` as JointName, object: shoe });
  }

  return { attachments, hidden, dispose: () => undefined };
}

/** Builds every mesh for one product in one colour. */
export function buildGarment(product: Product, colorHex: string, figure: Figure): GarmentBuild {
  const spec = product.garment;
  const material = materialFor(spec.fabric, colorHex);

  let build: GarmentBuild;
  switch (spec.kind) {
    case "jeans":
    case "trousers":
    case "shorts":
    case "skirt":
      build = buildBottoms(figure, spec, material);
      break;
    case "jacket":
    case "blazer":
    case "coat":
    case "hoodie":
      build = buildOuterwear(figure, spec, material);
      break;
    case "sneakers":
    case "boots":
    case "loafers":
    case "flats":
    case "heels":
      build = buildShoes(figure, spec, material);
      break;
    default:
      build = buildTop(figure, spec, material);
      break;
  }

  return {
    ...build,
    dispose: () => {
      for (const { object } of build.attachments) {
        object.traverse((child) => {
          const mesh = child as THREE.Mesh;
          mesh.geometry?.dispose();
        });
      }
      material.dispose();
    },
  };
}

/** Rebuilding on every colour change would be wasteful; this just retints an existing build. */
export function retintGarment(build: GarmentBuild, hex: string): void {
  for (const { object } of build.attachments) {
    object.traverse((child) => {
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.MeshToonMaterial | undefined;
      if (!material || !material.color) return;
      if (mesh.name === "sole" || mesh.name.endsWith("Outline")) return;
      material.color.set(hex);
      if (material.emissive) material.emissive.set(hex).multiplyScalar(0.18);
    });
  }
}

export { lerpRing };
