"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MAX_SIDE = 1600;

/**
 * Shrinks a photo in the browser (longest side 1600 px, WebP or JPEG) so a phone photo of
 * 5–10 MB uploads in a second or two and stays under the server's 4 MB limit.
 */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error("This file is not a photo the browser can read.");
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  // Safari cannot write WebP and hands back a PNG instead; JPEG is the fallback there.
  const webp = await encode("image/webp", 0.86);
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await encode("image/jpeg", 0.86);
  if (!jpeg) throw new Error("The photo could not be prepared.");
  return jpeg;
}

export async function uploadPhoto(file: File): Promise<string> {
  const blob = await shrink(file);
  return uploadBlob(blob, blob.type === "image/webp" ? "photo.webp" : "photo.jpg");
}

/** Uploads an already prepared image (a shrunk photo, or a video's cover frame). */
export async function uploadBlob(blob: Blob, name: string): Promise<string> {
  const form = new FormData();
  form.append("file", blob, name);
  const res = await fetch("/api/admin/upload", { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed.");
  return data.url;
}

/** A photo slot: tap to choose (or take) a photo; shows it once uploaded. */
export function ImagePicker({
  value,
  onChange,
  label = "Add photo",
  className,
}: {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
  className?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadPhoto(file));
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className={cn(
          "relative block aspect-[3/4] w-full overflow-hidden rounded-xl border bg-bone text-xs text-ink-soft transition-colors",
          value ? "border-line" : "border-dashed border-ink-faint hover:border-ink",
        )}
      >
        {value ? (
          <Image src={value} alt="" fill unoptimized sizes="160px" className="object-cover" />
        ) : (
          <span className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center">
            <span className="text-2xl leading-none">+</span>
            {label}
          </span>
        )}
        {busy ? (
          <span className="absolute inset-0 grid place-items-center bg-white/80 text-xs font-medium">
            Uploading…
          </span>
        ) : null}
      </button>
      {value && !busy ? (
        <button
          type="button"
          aria-label="Remove photo"
          onClick={() => onChange(undefined)}
          className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-sm shadow"
        >
          ×
        </button>
      ) : null}
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
