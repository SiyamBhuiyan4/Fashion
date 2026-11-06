/**
 * Poses and animation, written as code rather than loaded as clips.
 *
 * Each pose is a function of time that returns an angle (and a small offset) per joint; the
 * animator eases the skeleton towards those values every frame, so switching pose is a smooth
 * blend rather than a cut. "Turn" runs once and hands back to "Idle" when it finishes.
 */
import type * as THREE from "three";
import type { JointName } from "@/lib/three/figure";
import type { Pose } from "@/lib/types";

export interface PoseFrame {
  /** Rotations in radians, per joint; anything omitted eases back to the rest pose. */
  rotation: Partial<Record<JointName, [x: number, y: number, z: number]>>;
  /** Vertical bob and sideways shift of the whole body, in metres. */
  bob: number;
  shift: number;
  /** Chest expansion from breathing (a scale factor). */
  breath: number;
}

const empty = (): PoseFrame => ({ rotation: {}, bob: 0, shift: 0, breath: 1 });

/** Relaxed stand: breathing, a slow weight shift, a little arm drift. */
function idleFrame(t: number): PoseFrame {
  const breath = Math.sin(t * 1.6);
  const sway = Math.sin(t * 0.45);
  const drift = Math.sin(t * 0.7);
  return {
    bob: breath * 0.004,
    shift: sway * 0.012,
    breath: 1 + breath * 0.012,
    rotation: {
      hips: [0, sway * 0.045, sway * 0.02],
      spine: [breath * 0.006, sway * -0.03, sway * -0.012],
      chest: [breath * 0.008, sway * -0.02, 0],
      neck: [breath * 0.004, drift * 0.05, 0],
      head: [drift * 0.02, drift * 0.07, sway * 0.015],
      armL: [drift * 0.05, 0, -0.07 - Math.abs(sway) * 0.03],
      armR: [-drift * 0.05, 0, 0.07 + Math.abs(sway) * 0.03],
      elbowL: [0.12 + drift * 0.03, 0, 0],
      elbowR: [0.12 - drift * 0.03, 0, 0],
      legL: [sway * 0.02, 0, 0],
      legR: [-sway * 0.02, 0, 0],
      kneeL: [-0.02, 0, 0],
      kneeR: [-0.035, 0, 0],
    },
  };
}

/** Walking on the spot: a full cycle every ~1.1 s. */
function walkFrame(t: number): PoseFrame {
  const cycle = t * 5.4;
  const swing = Math.sin(cycle);
  const opposite = Math.sin(cycle + Math.PI);
  // Knees bend on the back half of each leg's swing.
  const kneeL = Math.max(0, -Math.sin(cycle - 0.6)) * 0.95;
  const kneeR = Math.max(0, -Math.sin(cycle + Math.PI - 0.6)) * 0.95;
  return {
    bob: Math.abs(Math.sin(cycle)) * 0.018 - 0.009,
    shift: Math.sin(cycle) * 0.016,
    breath: 1 + Math.sin(t * 3) * 0.01,
    rotation: {
      hips: [0.02, swing * 0.09, 0],
      spine: [0.03, opposite * 0.06, 0],
      chest: [0.01, opposite * 0.05, 0],
      neck: [-0.02, 0, 0],
      head: [-0.01, swing * 0.03, 0],
      armL: [opposite * 0.62, 0, -0.1],
      armR: [swing * 0.62, 0, 0.1],
      elbowL: [0.35 + Math.max(0, opposite) * 0.4, 0, 0],
      elbowR: [0.35 + Math.max(0, swing) * 0.4, 0, 0],
      legL: [swing * 0.52, 0, 0],
      legR: [opposite * 0.52, 0, 0],
      kneeL: [-kneeL, 0, 0],
      kneeR: [-kneeR, 0, 0],
      ankleL: [kneeL * 0.3 - swing * 0.15, 0, 0],
      ankleR: [kneeR * 0.3 - opposite * 0.15, 0, 0],
    },
  };
}

const TURN_SECONDS = 4.5;

/** A slow full turn on the spot, then back to idle. */
function turnFrame(t: number, elapsed: number): PoseFrame {
  const progress = Math.min(1, elapsed / TURN_SECONDS);
  // Ease in and out so the turn starts and stops softly.
  const eased = progress < 0.5 ? 2 * progress * progress : 1 - (1 - progress) ** 2 * 2;
  const base = idleFrame(t);
  const stepping = Math.sin(progress * Math.PI * 6) * (progress > 0.02 && progress < 0.98 ? 1 : 0);
  return {
    ...base,
    bob: base.bob + Math.abs(stepping) * 0.006,
    rotation: {
      ...base.rotation,
      root: [0, eased * Math.PI * 2, 0],
      legL: [stepping * 0.14, 0, 0],
      legR: [-stepping * 0.14, 0, 0],
      kneeL: [-Math.max(0, stepping) * 0.2, 0, 0],
      kneeR: [-Math.max(0, -stepping) * 0.2, 0, 0],
      armL: [stepping * 0.1, 0, -0.1],
      armR: [-stepping * 0.1, 0, 0.1],
    },
  };
}

export function turnIsFinished(elapsed: number): boolean {
  return elapsed >= TURN_SECONDS;
}

export class PoseAnimator {
  private time = 0;
  private turnElapsed = 0;
  private current: Pose = "idle";

  constructor(
    private readonly joints: Record<JointName, THREE.Object3D>,
    private readonly chest?: THREE.Object3D,
  ) {}

  setPose(pose: Pose): void {
    if (pose === this.current) return;
    this.current = pose;
    if (pose === "turn") this.turnElapsed = 0;
  }

  get pose(): Pose {
    return this.current;
  }

  /** Advances the animation. Returns true when a one-shot pose has just finished. */
  update(delta: number): boolean {
    const step = Math.min(0.05, delta);
    this.time += step;
    let finished = false;

    let frame: PoseFrame;
    if (this.current === "walk") {
      frame = walkFrame(this.time);
    } else if (this.current === "turn") {
      this.turnElapsed += step;
      frame = turnFrame(this.time, this.turnElapsed);
      if (turnIsFinished(this.turnElapsed)) {
        finished = true;
        this.current = "idle";
      }
    } else {
      frame = idleFrame(this.time);
    }

    // Ease towards the frame so pose changes blend instead of snapping.
    const ease = 1 - Math.exp(-step * 9);
    const rest = empty();
    for (const name of Object.keys(this.joints) as JointName[]) {
      const joint = this.joints[name];
      if (!joint) continue;
      const target = frame.rotation[name] ?? rest.rotation[name] ?? [0, 0, 0];
      if (name === "root" && this.current !== "turn") {
        // Let the turn's rotation settle back to zero only through the easing below.
        joint.rotation.y += (0 - joint.rotation.y) * ease * 0.5;
        continue;
      }
      joint.rotation.x += (target[0] - joint.rotation.x) * ease;
      joint.rotation.y += (target[1] - joint.rotation.y) * ease;
      joint.rotation.z += (target[2] - joint.rotation.z) * ease;
    }

    const hips = this.joints.hips;
    if (hips) {
      const baseY = hips.userData.baseY as number | undefined;
      if (baseY !== undefined) {
        hips.position.y += (baseY + frame.bob - hips.position.y) * ease;
        hips.position.x += (frame.shift - hips.position.x) * ease;
      }
    }
    if (this.chest) {
      const scale = this.chest.scale.x + (frame.breath - this.chest.scale.x) * ease;
      this.chest.scale.setScalar(scale);
    }

    return finished;
  }
}
