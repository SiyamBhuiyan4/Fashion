"use client";

import { useRef, useState } from "react";
import { VIDEO_PART_BYTES } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { uploadBlob } from "@/components/admin/ImagePicker";
import { button } from "@/components/admin/ui";

/** What the product save sends for a newly uploaded video. */
export interface UploadedVideo {
  type: "video/mp4" | "video/webm" | "video/quicktime";
  size: number;
  parts: Array<{ f: string; s: number }>;
  poster?: string;
  width: number;
  height: number;
  duration: number;
}

const MAX_BYTES = 1500 * 1024 * 1024;
const PARALLEL = 2;

const mb = (bytes: number) =>
  `${(bytes / 1024 / 1024).toFixed(bytes > 100 * 1024 * 1024 ? 0 : 1)} MB`;

function videoType(file: File): UploadedVideo["type"] | null {
  if (file.type === "video/mp4" || /\.(mp4|m4v)$/i.test(file.name)) return "video/mp4";
  if (file.type === "video/quicktime" || /\.mov$/i.test(file.name)) return "video/quicktime";
  if (file.type === "video/webm" || /\.webm$/i.test(file.name)) return "video/webm";
  return null;
}

/** Size, length and a still frame of the video, read in the browser. */
async function inspect(file: File): Promise<{
  width: number;
  height: number;
  duration: number;
  frame: Blob | null;
}> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("unreadable"));
      window.setTimeout(() => reject(new Error("timeout")), 15_000);
    });
    const width = video.videoWidth || 1080;
    const height = video.videoHeight || 1920;
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
    // A frame a little way in makes a better poster than the very first one.
    video.currentTime = Math.min(1, duration / 3);
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      window.setTimeout(resolve, 5_000);
    });
    let frame: Blob | null = null;
    if (video.videoWidth > 0) {
      const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
      frame = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    }
    return { width, height, duration: Math.min(duration, 3 * 3600), frame };
  } catch {
    // Some formats (e.g. HEVC in Chrome) cannot be previewed here; they still upload as they are.
    return { width: 1080, height: 1920, duration: 1, frame: null };
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

async function uploadPart(blob: Blob, index: number): Promise<{ f: string; s: number }> {
  let lastError = "Upload failed.";
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch("/api/admin/video-part", {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream", "x-part-index": String(index) },
        body: blob,
      });
      const data = (await res.json().catch(() => ({}))) as {
        f?: string;
        s?: number;
        error?: string;
      };
      if (res.status === 401) throw new Error("Signed out — please sign in again.");
      if (res.ok && data.f && data.s) return { f: data.f, s: data.s };
      lastError = data.error ?? `Upload failed (${res.status}).`;
    } catch (e) {
      lastError = (e as Error).message;
      if (lastError.startsWith("Signed out")) throw e;
    }
    await new Promise((r) => window.setTimeout(r, 3000 * (attempt + 1)));
  }
  throw new Error(lastError);
}

/**
 * The product's video. Any size: the file is cut into 4 MB pieces in the browser and uploaded
 * piece by piece (each stored in the Telegram channel), then played back as the original file.
 */
export function VideoPicker({
  current,
  pending,
  removed,
  onUploaded,
  onRemove,
  onBusy,
}: {
  current: { url: string; poster?: string; size: number } | null;
  pending: UploadedVideo | null;
  removed: boolean;
  onUploaded: (video: UploadedVideo) => void;
  onRemove: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; step: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const start = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    const type = videoType(file);
    if (!type) {
      setError("Choose an MP4, MOV or WebM video.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`This video is ${mb(file.size)}. Please keep videos under ${mb(MAX_BYTES)}.`);
      return;
    }
    setError(null);
    onBusy(true);
    try {
      setProgress({ done: 0, total: 1, step: "Reading the video…" });
      const info = await inspect(file);
      let poster: string | undefined;
      if (info.frame) {
        setProgress({ done: 0, total: 1, step: "Saving the cover picture…" });
        poster = await uploadBlob(info.frame, "poster.jpg").catch(() => undefined);
        if (poster && !poster.endsWith(".jpg")) poster = undefined;
      }

      const count = Math.ceil(file.size / VIDEO_PART_BYTES);
      const parts: Array<{ f: string; s: number }> = new Array(count);
      let done = 0;
      let next = 0;
      setProgress({ done: 0, total: count, step: "Uploading" });
      const worker = async () => {
        while (next < count) {
          const index = next++;
          const blob = file.slice(index * VIDEO_PART_BYTES, (index + 1) * VIDEO_PART_BYTES);
          parts[index] = await uploadPart(blob, index);
          done++;
          setProgress({ done, total: count, step: "Uploading" });
        }
      };
      await Promise.all(Array.from({ length: Math.min(PARALLEL, count) }, worker));

      onUploaded({
        type,
        size: file.size,
        parts,
        poster,
        width: info.width,
        height: info.height,
        duration: Math.max(0.1, info.duration),
      });
      setPreview(URL.createObjectURL(file));
    } catch (e) {
      setError(`${(e as Error).message} Please try again.`);
    }
    setProgress(null);
    onBusy(false);
  };

  const shownUrl = pending ? preview : removed ? null : current?.url;

  return (
    <div>
      {progress ? (
        <div className="rounded-xl border border-line bg-bone p-4">
          <p className="text-sm font-medium">
            {progress.step === "Uploading"
              ? `Uploading video… ${Math.round((progress.done / progress.total) * 100)}%`
              : progress.step}
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${Math.max(3, (progress.done / progress.total) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            Keep this page open until it finishes. Big videos take a few minutes.
          </p>
        </div>
      ) : shownUrl ? (
        <div className="flex gap-3">
          <video
            src={shownUrl}
            poster={pending?.poster ?? current?.poster}
            controls
            muted
            playsInline
            preload="metadata"
            className="aspect-[3/4] w-32 shrink-0 rounded-xl bg-ink object-cover"
          />
          <div className="flex flex-col gap-2 text-sm">
            <p className="text-ink-soft">
              {pending
                ? `New video, ${mb(pending.size)} — saved when you save the product.`
                : "Current video"}
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn(button.secondary, "h-9 px-3 text-xs")}
            >
              Replace video
            </button>
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                onRemove();
              }}
              className={cn(button.danger, "h-9 px-3 text-xs")}
            >
              Remove video
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-28 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink-faint text-sm text-ink-soft hover:border-ink"
        >
          <span className="text-2xl leading-none">▶</span>
          Add video (any size)
        </button>
      )}
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
      <p className="mt-2 text-xs text-ink-faint">
        Full quality, no size limit. MP4 plays on every phone and browser; iPhone videos (MOV) play
        best when recorded as &ldquo;Most Compatible&rdquo; (Settings → Camera → Formats).
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm"
        className="hidden"
        onChange={(e) => void start(e.target.files?.[0])}
      />
    </div>
  );
}
