"use client";

import { poseLabels, type Pose } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useOutfitStore } from "@/store/outfitStore";

const poses: Pose[] = ["idle", "walk", "turn"];

export function PoseButtons() {
  const pose = useOutfitStore((state) => state.pose);
  const setPose = useOutfitStore((state) => state.setPose);

  return (
    <div className="flex items-center gap-1 rounded-full border border-line bg-white p-1">
      {poses.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setPose(option)}
          aria-pressed={pose === option}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs transition-colors",
            pose === option ? "bg-ink text-bone" : "text-ink-soft hover:bg-bone-dark",
          )}
        >
          {poseLabels[option]}
        </button>
      ))}
    </div>
  );
}
