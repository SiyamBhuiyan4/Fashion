/**
 * The 3D avatars, built in code.
 *
 * Each avatar is a joint tree (hips → spine → chest → neck → head, plus arms and legs) with one
 * mesh per body part, exactly as a rigged GLB would be split: head, neck, torso, upper arms,
 * forearms, hands, hips, upper legs, lower legs, feet. Parts can be hidden individually, so a
 * leg never poke through a trouser.
 *
 * Garments (lib/three/garments.ts) are built from the same measurements and parented to the same
 * joints, so they follow every pose without any skinning.
 *
 * Replacing these with real rigged GLB files later means swapping this module for a loader that
 * exposes the same joints and profiles.
 */
import * as THREE from "three";
import type { Gender } from "@/lib/types";
import { ringTubeGeometry, subdivideProfile, type Ring } from "@/lib/three/geometry";
import { toonMaterial, withOutline } from "@/lib/three/toon";
import { faceTexture } from "@/lib/three/face";

export type JointName =
  | "root"
  | "hips"
  | "spine"
  | "chest"
  | "neck"
  | "head"
  | "armL"
  | "armR"
  | "elbowL"
  | "elbowR"
  | "wristL"
  | "wristR"
  | "legL"
  | "legR"
  | "kneeL"
  | "kneeR"
  | "ankleL"
  | "ankleR";

export type PartName =
  | "head"
  | "hair"
  | "neck"
  | "torso"
  | "chest"
  | "pelvis"
  | "upperArmL"
  | "upperArmR"
  | "forearmL"
  | "forearmR"
  | "handL"
  | "handR"
  | "upperLegL"
  | "upperLegR"
  | "lowerLegL"
  | "lowerLegR"
  | "footL"
  | "footR"
  | "underwearTop"
  | "underwearBottom"
  | "baseLegL"
  | "baseLegR";

export interface BodyMeasurements {
  gender: Gender;
  height: number;
  ankleY: number;
  kneeY: number;
  hipY: number;
  waistY: number;
  chestY: number;
  shoulderY: number;
  neckY: number;
  headY: number;
  legX: number;
  shoulderX: number;
  upperArmLength: number;
  forearmLength: number;
  handLength: number;
  footLength: number;
  hairStyle: "short" | "long";
}

const MALE: BodyMeasurements = {
  gender: "men",
  height: 1.8,
  ankleY: 0.085,
  kneeY: 0.48,
  hipY: 0.96,
  waistY: 1.09,
  chestY: 1.28,
  shoulderY: 1.45,
  neckY: 1.5,
  headY: 1.62,
  legX: 0.078,
  shoulderX: 0.166,
  upperArmLength: 0.3,
  forearmLength: 0.26,
  handLength: 0.11,
  footLength: 0.26,
  hairStyle: "short",
};

const FEMALE: BodyMeasurements = {
  gender: "women",
  height: 1.69,
  ankleY: 0.075,
  kneeY: 0.45,
  hipY: 0.9,
  waistY: 1.03,
  chestY: 1.2,
  shoulderY: 1.36,
  neckY: 1.41,
  headY: 1.52,
  legX: 0.072,
  shoulderX: 0.134,
  upperArmLength: 0.28,
  forearmLength: 0.24,
  handLength: 0.1,
  footLength: 0.235,
  hairStyle: "long",
};

export function measurementsFor(gender: Gender): BodyMeasurements {
  return gender === "women" ? FEMALE : MALE;
}

/**
 * Body profiles in each joint's local space. Garments are built by growing these outwards, so a
 * shirt always matches the body it is worn on.
 */
export interface BodyProfiles {
  /** Waist to shoulders, local to the `spine` joint. */
  torso: Ring[];
  /** Hip block, local to `hips`. */
  pelvis: Ring[];
  /** Hip to knee, local to `legL` / `legR` (y runs negative, downwards). */
  upperLeg: Ring[];
  /** Knee to ankle, local to `kneeL` / `kneeR`. */
  lowerLeg: Ring[];
  /** Shoulder to elbow, local to `armL` / `armR`. */
  upperArm: Ring[];
  /** Elbow to wrist, local to `elbowL` / `elbowR`. */
  forearm: Ring[];
  /** Neck base to crown, local to `neck`. */
  neck: Ring[];
}

export interface Figure {
  root: THREE.Group;
  joints: Record<JointName, THREE.Object3D>;
  parts: Partial<Record<PartName, THREE.Mesh>>;
  measurements: BodyMeasurements;
  profiles: BodyProfiles;
  /** Heights of the spine joint and the chest joint in world space, for garment placement. */
  spineY: number;
  chestLocalY: number;
  skinMaterial: THREE.MeshToonMaterial;
  setSkinColor: (hex: string) => void;
}

type Profile = Array<[y: number, rx: number, rz: number, dz?: number, box?: number]>;

const toRings = (profile: Profile): Ring[] =>
  profile.map(([y, rx, rz, dz, box]) => ({ y, rx, rz, dz: dz ?? 0, box: box ?? 0 }));

function torsoProfile(m: BodyMeasurements): Ring[] {
  const female = m.gender === "women";
  const waist = m.waistY;
  const h = (y: number) => y - waist; // local to the spine joint
  // The first rings reach below the waist so the torso and the hips overlap instead of meeting
  // at a visible seam; the last one narrows into the neck.
  return subdivideProfile(
    toRings(
      female
        ? [
            [h(waist - 0.1), 0.118, 0.09, 0.004],
            [h(waist - 0.02), 0.112, 0.085, 0.004],
            [h(waist + 0.05), 0.116, 0.088, 0.006],
            [h(m.chestY - 0.04), 0.129, 0.099, 0.012],
            [h(m.chestY + 0.015), 0.134, 0.107, 0.016],
            [h(m.shoulderY - 0.085), 0.134, 0.093, 0.004],
            [h(m.shoulderY - 0.03), 0.142, 0.085, 0],
            [h(m.shoulderY + 0.012), 0.118, 0.074, 0],
            [h(m.shoulderY + 0.045), 0.07, 0.056, 0],
          ]
        : [
            [h(waist - 0.1), 0.138, 0.101, 0.004],
            [h(waist - 0.02), 0.132, 0.097, 0.004],
            [h(waist + 0.06), 0.139, 0.1, 0.006],
            [h(m.chestY), 0.155, 0.11, 0.008],
            [h(m.shoulderY - 0.09), 0.162, 0.103, 0.004],
            [h(m.shoulderY - 0.03), 0.17, 0.091, 0],
            [h(m.shoulderY + 0.012), 0.142, 0.08, 0],
            [h(m.shoulderY + 0.045), 0.08, 0.06, 0],
          ],
    ),
    3,
  );
}

function pelvisProfile(m: BodyMeasurements): Ring[] {
  const female = m.gender === "women";
  const h = (y: number) => y - m.hipY;
  return subdivideProfile(
    toRings(
      female
        ? [
            [h(m.hipY - 0.19), 0.122, 0.092, 0.004],
            [h(m.hipY - 0.12), 0.152, 0.106, 0.006],
            [h(m.hipY - 0.05), 0.168, 0.116, 0.008],
            [h(m.hipY + 0.02), 0.152, 0.108, 0.008],
            [h(m.waistY - 0.02), 0.113, 0.086, 0.006],
            [h(m.waistY + 0.04), 0.106, 0.081, 0.004],
          ]
        : [
            [h(m.hipY - 0.19), 0.124, 0.096, 0.004],
            [h(m.hipY - 0.12), 0.146, 0.106, 0.006],
            [h(m.hipY - 0.05), 0.158, 0.111, 0.006],
            [h(m.hipY + 0.02), 0.148, 0.106, 0.006],
            [h(m.waistY - 0.02), 0.13, 0.095, 0.004],
            [h(m.waistY + 0.04), 0.124, 0.091, 0.004],
          ],
    ),
    3,
  );
}

function upperLegProfile(m: BodyMeasurements): Ring[] {
  const length = m.hipY - m.kneeY;
  const female = m.gender === "women";
  const thigh = female ? 0.096 : 0.1;
  const knee = female ? 0.061 : 0.066;
  return subdivideProfile(
    toRings([
      [-length - 0.03, knee * 0.95, knee * 0.92],
      [-length, knee, knee * 0.95],
      [-length * 0.62, knee + (thigh - knee) * 0.58, (knee + (thigh - knee) * 0.58) * 0.95],
      [-length * 0.22, thigh, thigh * 0.95],
      [0.02, thigh * 0.94, thigh * 0.92],
      [0.06, thigh * 0.7, thigh * 0.68],
    ]),
    3,
  );
}

function lowerLegProfile(m: BodyMeasurements): Ring[] {
  const length = m.kneeY - m.ankleY;
  const female = m.gender === "women";
  const calf = female ? 0.061 : 0.069;
  const ankle = female ? 0.033 : 0.038;
  return subdivideProfile(
    toRings([
      [-length - 0.01, ankle * 0.96, ankle * 1.02],
      [-length * 0.6, ankle + (calf - ankle) * 0.4, (ankle + (calf - ankle) * 0.4) * 1.05],
      [-length * 0.24, calf, calf * 1.06, -0.006],
      [0.01, female ? 0.058 : 0.064, (female ? 0.058 : 0.064) * 0.98],
      [0.06, female ? 0.05 : 0.056, (female ? 0.05 : 0.056) * 0.96],
    ]),
    3,
  );
}

function upperArmProfile(m: BodyMeasurements): Ring[] {
  const female = m.gender === "women";
  const top = female ? 0.043 : 0.051;
  const bottom = female ? 0.033 : 0.039;
  return subdivideProfile(
    toRings([
      [-m.upperArmLength - 0.01, bottom * 0.96, bottom * 0.96],
      [-m.upperArmLength * 0.45, (top + bottom) / 2, (top + bottom) / 2],
      [0.03, top * 1.04, top * 1.04],
      [0.07, top * 0.82, top * 0.82],
    ]),
    3,
  );
}

function forearmProfile(m: BodyMeasurements): Ring[] {
  const female = m.gender === "women";
  const top = female ? 0.033 : 0.039;
  const bottom = female ? 0.023 : 0.027;
  return subdivideProfile(
    toRings([
      [-m.forearmLength - 0.005, bottom * 0.94, bottom * 0.94],
      [-m.forearmLength * 0.5, (top + bottom) / 2, (top + bottom) / 2],
      [0.01, top, top],
    ]),
    3,
  );
}

function neckProfile(m: BodyMeasurements): Ring[] {
  const female = m.gender === "women";
  const r = female ? 0.047 : 0.055;
  return toRings([
    [-0.05, r * 1.3, r * 1.25],
    [0.02, r, r],
    [m.headY - m.neckY - 0.05, r * 0.94, r * 0.94],
  ]);
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
  outline = 0.0035,
): THREE.Mesh {
  const object = new THREE.Mesh(geometry, material);
  object.name = name;
  object.castShadow = true;
  object.receiveShadow = true;
  // The drawn line around every shape is what makes the cel shading read as anime.
  if (outline > 0) withOutline(object, outline);
  return object;
}

function group(name: string, position?: [number, number, number]): THREE.Group {
  const object = new THREE.Group();
  object.name = name;
  if (position) object.position.set(...position);
  return object;
}

/** Builds one avatar. The caller owns the result and must dispose it. */
export function buildFigure(gender: Gender, skinHex: string): Figure {
  const m = measurementsFor(gender);
  const female = gender === "women";

  // Cel shading: flat colour in two or three bands, as in the character sheets.
  const skinMaterial = toonMaterial(skinHex, { steps: 3, emissiveMix: 0.07 });
  const hairMaterial = toonMaterial("#1b1822", { steps: 2, emissiveMix: 0.22 });
  const underwearMaterial = toonMaterial(female ? "#cdbdb4" : "#44474f", { steps: 2 });

  /**
   * Anime proportions: a large head on a slender body. The measured profiles above are close to
   * life, so the body is taken in here rather than every number being rewritten twice.
   */
  const slim = (rings: Ring[], factor: number): Ring[] =>
    rings.map((ring) => ({
      ...ring,
      rx: ring.rx * factor,
      rz: ring.rz * factor,
      dz: (ring.dz ?? 0) * factor,
    }));
  const bodyFactor = female ? 0.84 : 0.87;
  const limbFactor = female ? 0.88 : 0.9;

  const profiles: BodyProfiles = {
    torso: slim(torsoProfile(m), bodyFactor),
    pelvis: slim(pelvisProfile(m), bodyFactor),
    upperLeg: slim(upperLegProfile(m), limbFactor),
    lowerLeg: slim(lowerLegProfile(m), limbFactor),
    upperArm: slim(upperArmProfile(m), limbFactor),
    forearm: slim(forearmProfile(m), limbFactor),
    neck: slim(neckProfile(m), 0.94),
  };

  const parts: Partial<Record<PartName, THREE.Mesh>> = {};
  const joints = {} as Record<JointName, THREE.Object3D>;

  const root = group("root");
  joints.root = root;

  // ---------------------------------------------------------------- hips & legs
  const hips = group("hips", [0, m.hipY, 0]);
  // The idle bob and weight shift move around this rest height (see lib/three/poses.ts).
  hips.userData.baseY = m.hipY;
  joints.hips = hips;
  root.add(hips);

  parts.pelvis = mesh(ringTubeGeometry(profiles.pelvis, { segments: 32 }), skinMaterial, "pelvis");
  hips.add(parts.pelvis);

  // A modest base layer, so the avatar is decent from every angle before anything is worn and
  // under an open jacket: fitted shorts over the hips and the top of the thighs.
  const shortsRings = profiles.pelvis
    .filter((ring) => ring.y > -0.17 && ring.y < 0.02)
    .map((ring) => ({ ...ring, rx: ring.rx * 1.05 + 0.007, rz: ring.rz * 1.05 + 0.008 }));
  if (shortsRings.length >= 2) {
    parts.underwearBottom = mesh(
      ringTubeGeometry(shortsRings, { segments: 32 }),
      underwearMaterial,
      "underwearBottom",
      0.003,
    );
    hips.add(parts.underwearBottom);
  }

  for (const side of ["L", "R"] as const) {
    const sign = side === "L" ? 1 : -1;
    const leg = group(`leg${side}`, [sign * m.legX, -0.02, 0]);
    joints[`leg${side}` as JointName] = leg;
    hips.add(leg);

    const upperLeg = mesh(
      ringTubeGeometry(profiles.upperLeg, { segments: 24 }),
      skinMaterial,
      `upperLeg${side}`,
    );
    parts[`upperLeg${side}` as PartName] = upperLeg;
    leg.add(upperLeg);

    // The shorts continue a little way down each thigh.
    const baseLegRings = profiles.upperLeg
      .filter((ring) => ring.y > -(m.hipY - 0.02 - m.kneeY) * 0.42 && ring.y < 0.03)
      .map((ring) => ({ ...ring, rx: ring.rx * 1.06 + 0.006, rz: ring.rz * 1.06 + 0.006 }));
    if (baseLegRings.length >= 2) {
      const baseLeg = mesh(
        ringTubeGeometry(baseLegRings, { segments: 22, capStart: false }),
        underwearMaterial,
        `baseLeg${side}`,
        0.003,
      );
      parts[`baseLeg${side}` as PartName] = baseLeg;
      leg.add(baseLeg);
    }

    const knee = group(`knee${side}`, [0, -(m.hipY - 0.02 - m.kneeY), 0]);
    joints[`knee${side}` as JointName] = knee;
    leg.add(knee);

    const lowerLeg = mesh(
      ringTubeGeometry(profiles.lowerLeg, { segments: 24 }),
      skinMaterial,
      `lowerLeg${side}`,
    );
    parts[`lowerLeg${side}` as PartName] = lowerLeg;
    knee.add(lowerLeg);

    const ankle = group(`ankle${side}`, [0, -(m.kneeY - m.ankleY), 0]);
    joints[`ankle${side}` as JointName] = ankle;
    knee.add(ankle);

    const footRings = toRings([
      [-m.ankleY, 0.042, m.footLength * 0.5, m.footLength * 0.16, 0.5],
      [-m.ankleY * 0.45, 0.046, m.footLength * 0.47, m.footLength * 0.14, 0.45],
      [0.01, 0.045, m.footLength * 0.3, m.footLength * 0.02, 0.3],
      [0.05, 0.042, m.footLength * 0.24, -m.footLength * 0.03, 0.25],
    ]);
    const foot = mesh(ringTubeGeometry(footRings, { segments: 20 }), skinMaterial, `foot${side}`);
    parts[`foot${side}` as PartName] = foot;
    ankle.add(foot);
  }

  // --------------------------------------------------------------- spine & chest
  const spine = group("spine", [0, m.waistY - m.hipY, 0]);
  joints.spine = spine;
  hips.add(spine);

  parts.torso = mesh(ringTubeGeometry(profiles.torso, { segments: 32 }), skinMaterial, "torso");
  spine.add(parts.torso);

  // A fitted vest on both models: nothing revealing from any angle, and it reads as an
  // undershirt beneath an open jacket.
  const vestRings = profiles.torso
    .filter((ring) => ring.y > -0.14 && ring.y < m.shoulderY - m.waistY - 0.018)
    .map((ring) => ({ ...ring, rx: ring.rx * 1.04 + 0.006, rz: ring.rz * 1.04 + 0.006 }));
  if (vestRings.length >= 2) {
    parts.underwearTop = mesh(
      ringTubeGeometry(vestRings, { segments: 32, capStart: false, capEnd: false }),
      underwearMaterial,
      "underwearTop",
      0.003,
    );
    spine.add(parts.underwearTop);
  }

  const chestLocalY = m.chestY - m.waistY;
  const chest = group("chest", [0, chestLocalY, 0]);
  joints.chest = chest;
  spine.add(chest);

  // -------------------------------------------------------------------- neck & head
  const neck = group("neck", [0, m.neckY - m.chestY, 0]);
  joints.neck = neck;
  chest.add(neck);
  parts.neck = mesh(ringTubeGeometry(profiles.neck, { segments: 20 }), skinMaterial, "neck");
  neck.add(parts.neck);

  const head = group("head", [0, m.headY - m.neckY, 0]);
  joints.head = head;
  neck.add(head);

  // An anime head: larger than life (about a seventh of the body) and slightly tapered to
  // the chin.
  const headRadius = female ? 0.108 : 0.112;
  const headGeometry = new THREE.SphereGeometry(headRadius, 30, 24);
  headGeometry.scale(0.82, 1.1, 0.92);
  headGeometry.translate(0, 0.012, 0.004);
  // Narrow the jaw: everything below the cheekbones is pulled in towards the chin.
  const headPosition = headGeometry.getAttribute("position");
  for (let i = 0; i < headPosition.count; i++) {
    const y = headPosition.getY(i);
    const chin = THREE.MathUtils.clamp((-y + 0.01) / (headRadius * 1.1), 0, 1);
    const pinch = 1 - chin * chin * 0.42;
    headPosition.setX(i, headPosition.getX(i) * pinch);
    headPosition.setZ(i, headPosition.getZ(i) * (1 - chin * chin * 0.22));
  }
  headGeometry.computeVertexNormals();
  parts.head = mesh(headGeometry, skinMaterial, "head", 0.004);
  head.add(parts.head);

  // The face is painted onto a patch that hugs the front of the skull.
  const face = faceTexture(gender);
  const faceGeometry = new THREE.SphereGeometry(
    headRadius * 1.003,
    40,
    40,
    Math.PI / 2 - 0.52,
    1.04,
    Math.PI * 0.3,
    Math.PI * 0.44,
  );
  faceGeometry.scale(0.82, 1.1, 0.92);
  faceGeometry.translate(0, 0.012, 0.004);
  const faceMesh = new THREE.Mesh(
    faceGeometry,
    new THREE.MeshBasicMaterial({ map: face, transparent: true, depthWrite: false }),
  );
  faceMesh.name = "face";
  faceMesh.renderOrder = 2;
  head.add(faceMesh);

  // ---------------------------------------------------------------- hair
  // Cap over the skull.
  const capGeometry = new THREE.SphereGeometry(
    headRadius * 1.07,
    32,
    24,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.47,
  );
  capGeometry.scale(0.87, 1.12, 0.98);
  capGeometry.translate(0, 0.012, -0.004);
  parts.hair = mesh(capGeometry, hairMaterial, "hair", 0.004);
  head.add(parts.hair);

  // Back of the head down to the nape.
  const napeRings = toRings([
    [-0.075, headRadius * 0.6, headRadius * 0.66, -0.012],
    [-0.02, headRadius * 0.84, headRadius * 0.9, -0.01],
    [0.035, headRadius * 0.9, headRadius * 0.95, -0.008],
  ]);
  head.add(
    mesh(
      ringTubeGeometry(napeRings, {
        segments: 28,
        arcStart: 0.38,
        arcLength: 0.74,
        capStart: false,
        capEnd: false,
      }),
      hairMaterial,
      "hairNape",
      0.003,
    ),
  );

  /** One pointed lock of hair, hanging from the hairline. */
  const strand = (
    length: number,
    width: number,
    position: [number, number, number],
    rotation: [number, number, number],
  ): THREE.Mesh => {
    const geometry = new THREE.ConeGeometry(width, length, 5, 1);
    geometry.scale(1, 1, 0.55);
    geometry.translate(0, -length / 2, 0);
    const piece = mesh(geometry, hairMaterial, "hairStrand", 0.0028);
    piece.position.set(...position);
    piece.rotation.set(...rotation);
    return piece;
  };

  const front = headRadius * 0.74;
  if (female) {
    // A long fringe parted off-centre, side locks to the collarbone and length down the back.
    const fringe: Array<[number, number, number, number, number]> = [
      [0.1, 0.028, -0.07, 0.092, 0.055],
      [0.115, 0.03, -0.028, 0.098, 0.075],
      [0.11, 0.028, 0.026, 0.098, 0.074],
      [0.095, 0.026, 0.068, 0.09, 0.052],
    ];
    for (const [length, width, x, y, z] of fringe) {
      head.add(strand(length, width, [x, y, z], [0.46, 0, -x * 2.2]));
    }
    for (const side of [-1, 1]) {
      head.add(
        strand(0.26, 0.042, [side * (headRadius * 0.78), 0.02, 0.012], [0.06, 0, side * 0.12]),
      );
      head.add(
        strand(0.17, 0.034, [side * (headRadius * 0.86), 0.03, -0.02], [-0.04, 0, side * 0.2]),
      );
    }
    const fall = toRings([
      [-0.34, 0.082, 0.056, -0.055],
      [-0.2, 0.098, 0.07, -0.05],
      [-0.06, 0.108, 0.086, -0.032],
      [0.04, 0.104, 0.096, -0.014],
    ]);
    head.add(
      mesh(
        ringTubeGeometry(fall, {
          segments: 28,
          arcStart: 0.46,
          arcLength: 0.58,
          capStart: false,
          capEnd: false,
        }),
        hairMaterial,
        "hairLength",
        0.003,
      ),
    );
  } else {
    // Short, tousled: a shorter fringe plus spikes lifting off the crown.
    const fringe: Array<[number, number, number, number, number]> = [
      [0.062, 0.028, -0.068, 0.104, 0.05],
      [0.075, 0.03, -0.026, 0.108, 0.07],
      [0.07, 0.028, 0.024, 0.108, 0.069],
      [0.06, 0.026, 0.066, 0.102, 0.048],
    ];
    for (const [length, width, x, y, z] of fringe) {
      head.add(strand(length, width, [x, y, z], [0.72, 0, -x * 3]));
    }
    // Tufts lying back across the crown, lifted just enough to read as tousled.
    const tufts: Array<[number, number, number, number, number, number]> = [
      [0.07, 0.03, -0.072, 0.088, 0.032, -0.95],
      [0.082, 0.032, -0.028, 0.095, 0.046, -1.05],
      [0.078, 0.03, 0.032, 0.094, 0.044, -1.0],
      [0.068, 0.028, 0.074, 0.086, 0.028, -0.9],
      [0.072, 0.03, -0.048, 0.092, -0.048, -2.2],
      [0.07, 0.03, 0.048, 0.09, -0.05, -2.15],
    ];
    for (const [length, width, x, y, z, tilt] of tufts) {
      head.add(strand(length, width, [x, y, z], [tilt, 0, -x * 3]));
    }
  }
  void front;

  // ------------------------------------------------------------------------ arms
  for (const side of ["L", "R"] as const) {
    const sign = side === "L" ? 1 : -1;
    const arm = group(`arm${side}`, [sign * m.shoulderX, m.shoulderY - m.chestY - 0.012, 0]);
    // Arms hang slightly away from the body.
    arm.rotation.z = sign * 0.075;
    joints[`arm${side}` as JointName] = arm;
    chest.add(arm);

    const shoulderGeometry = new THREE.SphereGeometry(female ? 0.05 : 0.058, 20, 16);
    shoulderGeometry.scale(1.15, 0.82, 1);
    shoulderGeometry.translate(-sign * 0.03, -0.014, 0);
    const shoulder = mesh(shoulderGeometry, skinMaterial, `shoulder${side}`);
    arm.add(shoulder);

    const upperArm = mesh(
      ringTubeGeometry(profiles.upperArm, { segments: 18 }),
      skinMaterial,
      `upperArm${side}`,
    );
    parts[`upperArm${side}` as PartName] = upperArm;
    arm.add(upperArm);

    const elbow = group(`elbow${side}`, [0, -m.upperArmLength, 0]);
    joints[`elbow${side}` as JointName] = elbow;
    arm.add(elbow);

    const forearm = mesh(
      ringTubeGeometry(profiles.forearm, { segments: 18 }),
      skinMaterial,
      `forearm${side}`,
    );
    parts[`forearm${side}` as PartName] = forearm;
    elbow.add(forearm);

    const wrist = group(`wrist${side}`, [0, -m.forearmLength, 0]);
    joints[`wrist${side}` as JointName] = wrist;
    elbow.add(wrist);

    const handGeometry = new THREE.SphereGeometry(female ? 0.036 : 0.042, 16, 12);
    handGeometry.scale(0.62, 1.5, 1);
    handGeometry.translate(0, -m.handLength * 0.4, 0);
    const hand = mesh(handGeometry, skinMaterial, `hand${side}`);
    parts[`hand${side}` as PartName] = hand;
    wrist.add(hand);
  }

  return {
    root,
    joints,
    parts,
    measurements: m,
    profiles,
    spineY: m.waistY,
    chestLocalY,
    skinMaterial,
    setSkinColor: (hex: string) => {
      skinMaterial.color.set(hex);
      skinMaterial.emissive.set(hex).multiplyScalar(0.07);
    },
  };
}
