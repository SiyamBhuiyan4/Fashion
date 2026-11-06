"use client";

import { skinTones } from "@/data/skinTones";
import type { Gender } from "@/lib/types";
import { cn } from "@/lib/utils";
import { usePrefsStore } from "@/store/prefsStore";

export function SkinToneSelector({ gender }: { gender: Gender }) {
  const current = usePrefsStore((state) => state.skinTone[gender]);
  const setSkinTone = usePrefsStore((state) => state.setSkinTone);

  return (
    <fieldset className="flex items-center gap-2">
      <legend className="sr-only">Skin tone</legend>
      <span className="eyebrow mr-1">Skin</span>
      {skinTones.map((tone) => {
        const active = tone.id === current;
        return (
          <button
            key={tone.id}
            type="button"
            onClick={() => setSkinTone(gender, tone.id)}
            aria-pressed={active}
            aria-label={tone.label}
            title={tone.label}
            className={cn(
              "h-6 w-6 rounded-full border-2 transition-transform",
              active ? "scale-110 border-ink" : "border-white hover:scale-110",
            )}
            style={{ backgroundColor: tone.hex }}
          />
        );
      })}
    </fieldset>
  );
}
