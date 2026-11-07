"use client";

import { useEffect, useRef, useState } from "react";
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

const MAX_BYTES = 5 * 1024 * 1024 * 1024;
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

const ATTEMPTS = 8;

async function uploadPart(blob: Blob, index: number): Promise<{ f: string; s: number }> {
  let lastError = "Upload failed.";
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
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
    // Waits grow (3 s, 6 s, 12 s … up to 60 s): enough for Telegram's slow-down or a dropped
    // connection to pass.
    await new Promise((r) => window.setTimeout(r, Math.min(60_000, 3000 * 2 ** attempt)));
  }
  throw new Error(lastError);
}

// ------------------------------------------------------------------ resuming an upload

/** Pieces already uploaded for a file, kept on this device so an interrupted upload resumes. */
type Saved = { parts: Array<{ f: string; s: number } | null>; at: number };
const RESUME_DAYS = 7;
/**
 * Which file this is, from its name, size and a fingerprint of its first and last 256 KB — not
 * its "modified" time, which some phones change every time a file is picked.
 */
async function resumeKey(file: File): Promise<string> {
  const edge = 256 * 1024;
  const head = await file.slice(0, edge).arrayBuffer();
  const tail = await file.slice(Math.max(0, file.size - edge)).arrayBuffer();
  const joined = new Uint8Array(head.byteLength + tail.byteLength);
  joined.set(new Uint8Array(head), 0);
  joined.set(new Uint8Array(tail), head.byteLength);
  let print = "";
  try {
    const digest = await crypto.subtle.digest("SHA-256", joined);
    print = Array.from(new Uint8Array(digest).slice(0, 12), (x) =>
      x.toString(16).padStart(2, "0"),
    ).join("");
  } catch {
    /* no crypto.subtle (plain http): name and size only */
  }
  return `aurevya.upload.${file.name}.${file.size}.${print}`;
}

function loadResume(key: string, count: number): Saved["parts"] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Array(count).fill(null);
    const saved = JSON.parse(raw) as Saved;
    if (Date.now() - saved.at > RESUME_DAYS * 86_400_000 || saved.parts.length !== count) {
      return new Array(count).fill(null);
    }
    return saved.parts;
  } catch {
    return new Array(count).fill(null);
  }
}

function saveResume(key: string, parts: Saved["parts"]) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ parts, at: Date.now() }));
  } catch {
    /* storage full or private mode: the upload still works, it just cannot resume */
  }
}

function clearResume(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Keeps a phone's screen on while a long upload runs (where the browser allows it). */
async function keepAwake(): Promise<() => void> {
  try {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    const lock = await nav.wakeLock?.request("screen");
    return () => void lock?.release().catch(() => undefined);
  } catch {
    return () => undefined;
  }
}

const minutesLeft = (seconds: number) =>
  seconds < 90 ? "less than 2 minutes left" : `about ${Math.round(seconds / 60)} minutes left`;

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
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    step: string;
    bytes?: number;
    size?: number;
    eta?: string;
  } | null>(null);
  const uploading = progress !== null;

  // Leaving the page while uploading (or before saving a new video) asks first.
  useEffect(() => {
    if (!uploading && !pending) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading, pending]);
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
    const release = await keepAwake();
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
      // Pieces uploaded before an interruption are kept; only the rest are sent.
      const key = await resumeKey(file);
      const parts = loadResume(key, count);
      const todo = parts.flatMap((part, i) => (part ? [] : [i]));
      let done = count - todo.length;
      const startedAt = Date.now();
      const doneAtStart = done;
      const report = () => {
        const sent = done - doneAtStart;
        const perPart = sent > 0 ? (Date.now() - startedAt) / sent : 0;
        setProgress({
          done,
          total: count,
          step: "Uploading",
          bytes: Math.min(file.size, done * VIDEO_PART_BYTES),
          size: file.size,
          eta: sent > 1 ? minutesLeft(((count - done) * perPart) / 1000) : undefined,
        });
      };
      report();
      let cursor = 0;
      const worker = async () => {
        while (cursor < todo.length) {
          const index = todo[cursor++]!;
          const blob = file.slice(index * VIDEO_PART_BYTES, (index + 1) * VIDEO_PART_BYTES);
          parts[index] = await uploadPart(blob, index);
          done++;
          saveResume(key, parts);
          report();
        }
      };
      try {
        await Promise.all(Array.from({ length: Math.min(PARALLEL, todo.length) }, worker));
      } catch (e) {
        const percent = Math.round((done / count) * 100);
        throw new Error(
          `The upload stopped at ${percent}% (${(e as Error).message}). Choose the same video again to continue from there —`,
        );
      }
      if (parts.some((p) => !p)) throw new Error("Some pieces are missing.");
      clearResume(key);

      onUploaded({
        type,
        size: file.size,
        parts: parts as Array<{ f: string; s: number }>,
        poster,
        width: info.width,
        height: info.height,
        duration: Math.max(0.1, info.duration),
      });
      setPreview(URL.createObjectURL(file));
    } catch (e) {
      setError(`${(e as Error).message} Please try again.`);
    }
    release();
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
          {progress.size ? (
            <p className="mt-0.5 text-xs text-ink-soft">
              {mb(progress.bytes ?? 0)} of {mb(progress.size)}
              {progress.eta ? ` · ${progress.eta}` : ""}
            </p>
          ) : null}
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${Math.max(3, (progress.done / progress.total) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            Keep this page open until it finishes. If the internet drops, choose the same video
            again — it continues where it stopped.
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
        Full quality, up to 5 GB (about 1 GB in 13 minutes). MP4 plays on every phone and browser;
        iPhone videos (MOV) play best when recorded as &ldquo;Most Compatible&rdquo; (Settings →
        Camera → Formats).
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
