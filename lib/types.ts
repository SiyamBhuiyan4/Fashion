export type { Category, Fabric, GarmentKind, GarmentSpec, Gender, Product, ProductColor, Slot } from "@/lib/schemas";

export type Pose = "idle" | "walk" | "turn";

export const poseLabels: Record<Pose, string> = {
  idle: "Idle",
  walk: "Walk",
  turn: "Turn",
};
