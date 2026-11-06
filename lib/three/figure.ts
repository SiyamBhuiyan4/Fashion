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
  | "underwearBottom";

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
  legX: 0.09,
  shoulderX: 0.176,
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
  legX: 0.085,
  shoulderX: 0.144,
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
  skinMaterial: THREE.MeshStandardMaterial;
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
): THREE.Mesh {
  const object = new THREE.Mesh(geometry, material);
  object.name = name;
  object.castShadow = true;
  object.receiveShadow = true;
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

  const skinMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(skinHex),
    roughness: 0.82,
    metalness: 0,
  });
  const hairMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#2a2018"),
    roughness: 0.65,
    metalness: 0.05,
  });
  const underwearMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(female ? "#d8c3bb" : "#2f3238"),
    roughness: 0.9,
    metalness: 0,
  });

  const profiles: BodyProfiles = {
    torso: torsoProfile(m),
    pelvis: pelvisProfile(m),
    upperLeg: upperLegProfile(m),
    lowerLeg: lowerLegProfile(m),
    upperArm: upperArmProfile(m),
    forearm: forearmProfile(m),
    neck: neckProfile(m),
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

  // Base underwear, so garments always sit on a dressed body.
  const briefsRings = profiles.pelvis
    .filter((ring) => ring.y > -0.13 && ring.y < 0.02)
    .map((ring, index, all) => {
      // Tapers towards the leg openings, so it reads as underwear rather than a tube.
      const t = index / Math.max(1, all.length - 1);
      const taper = 0.9 + 0.12 * t;
      return { ...ring, rx: ring.rx * taper + 0.003, rz: ring.rz * taper + 0.003 };
    });
  if (briefsRings.length >= 2) {
    parts.underwearBottom = mesh(
      ringTubeGeometry(briefsRings, { segments: 32 }),
      underwearMaterial,
      "underwearBottom",
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

  if (female) {
    // Bra band, so the avatar is never shown bare.
    const band = profiles.torso
      .filter((ring) => ring.y > m.chestY - m.waistY - 0.06 && ring.y < m.chestY - m.waistY + 0.06)
      .map((ring) => ({ ...ring, rx: ring.rx * 1.02 + 0.003, rz: ring.rz * 1.02 + 0.003 }));
    if (band.length >= 2) {
      parts.underwearTop = mesh(
        ringTubeGeometry(band, { segments: 32 }),
        underwearMaterial,
        "underwearTop",
      );
      spine.add(parts.underwearTop);
    }
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

  const headRadius = female ? 0.09 : 0.095;
  const headGeometry = new THREE.SphereGeometry(headRadius, 28, 22);
  headGeometry.scale(0.84, 1.2, 0.98);
  headGeometry.translate(0, 0.01, 0.004);
  parts.head = mesh(headGeometry, skinMaterial, "head");
  head.add(parts.head);

  // Hair: a smooth cap over the skull, plus length down the back for the female avatar.
  const hairGeometry = new THREE.SphereGeometry(
    headRadius * 1.05,
    30,
    22,
    0,
    Math.PI * 2,
    0,
    Math.PI * 0.42,
  );
  hairGeometry.scale(0.86, 1.2, 1.0);
  hairGeometry.translate(0, 0.012, -0.008);
  parts.hair = mesh(hairGeometry, hairMaterial, "hair");
  head.add(parts.hair);

  // The back of the head, so the cap does not stop in mid-air.
  const napeRings = toRings([
    [-0.055, headRadius * 0.72, headRadius * 0.74, -0.01],
    [0.01, headRadius * 0.92, headRadius * 0.96, -0.008],
    [0.06, headRadius * 0.88, headRadius * 0.95, -0.006],
  ]);
  head.add(
    mesh(
      ringTubeGeometry(napeRings, { segments: 26, arcStart: 0.42, arcLength: 0.66, capStart: false, capEnd: false }),
      hairMaterial,
      "hairNape",
    ),
  );

  if (female) {
    // Falls behind the shoulders: an arc around the back of the head only.
    const fall = toRings([
      [-0.26, 0.072, 0.05, -0.052],
      [-0.12, 0.084, 0.06, -0.044],
      [-0.02, 0.09, 0.072, -0.028],
      [0.05, 0.088, 0.082, -0.012],
    ]);
    head.add(
      mesh(
        ringTubeGeometry(fall, { segments: 26, arcStart: 0.5, arcLength: 0.5, capStart: false, capEnd: false }),
        hairMaterial,
        "hairLength",
      ),
    );
  }

  // ------------------------------------------------------------------------ arms
  for (const side of ["L", "R"] as const) {
    const sign = side === "L" ? 1 : -1;
    const arm = group(`arm${side}`, [sign * m.shoulderX, m.shoulderY - m.chestY - 0.012, 0]);
    // Arms hang slightly away from the body.
    arm.rotation.z = sign * 0.035;
    joints[`arm${side}` as JointName] = arm;
    chest.add(arm);

    const shoulderGeometry = new THREE.SphereGeometry(female ? 0.06 : 0.068, 20, 16);
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
    setSkinColor: (hex: string) => skinMaterial.color.set(hex),
  };
}
