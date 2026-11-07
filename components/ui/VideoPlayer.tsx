"use client";

import { useEffect, useRef } from "react";

/**
 * Plays a product video: an uploaded file (/api/video/<id>/file) directly, or HLS
 * (/api/video/<id>/master.m3u8). Safari and iOS play HLS natively;
 * everywhere else hls.js is loaded on demand and feeds the pieces to the <video> element.
 *
 * The player picks the quality the connection can carry, starting from the best. `preview`
 * (the small hover clip on product cards) also caps it to the size of the card, so the grid
 * never pulls a 4K stream into a 300-pixel box.
 */
export function VideoPlayer({
  src,
  poster,
  className,
  controls = false,
  preview = false,
}: {
  src: string;
  poster?: string;
  className?: string;
  controls?: boolean;
  preview?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let destroyed = false;
    let cleanup = () => undefined as void;

    const play = () => void video.play().catch(() => undefined);
    const native = () => {
      video.src = src;
      play();
      cleanup = () => {
        video.removeAttribute("src");
        video.load();
      };
    };

    // A video uploaded in the admin panel is a plain file: the browser plays it directly.
    if (!src.includes(".m3u8")) {
      native();
      return () => {
        destroyed = true;
        cleanup();
      };
    }

    // hls.js first wherever Media Source works (it handles quality switching best); the
    // browser's own HLS (Safari, older iPhones) otherwise.
    void import("hls.js")
      .then(({ default: Hls }) => {
        if (destroyed) return;
        if (!Hls.isSupported()) return native();
        const hls = new Hls({
          capLevelToPlayerSize: preview,
          maxBufferLength: preview ? 10 : 30,
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          // hls.js orders levels lowest first. The product page starts at the best one and only
          // steps down if the connection cannot keep up; the small card preview picks by size.
          if (!preview) hls.startLevel = data.levels.length - 1;
          play();
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else hls.destroy();
        });
        cleanup = () => hls.destroy();
      })
      .catch(() => {
        if (!destroyed) native();
      });

    return () => {
      destroyed = true;
      cleanup();
    };
  }, [src, preview]);

  return (
    <video
      ref={ref}
      poster={poster}
      muted
      loop
      playsInline
      autoPlay
      controls={controls}
      preload={preview ? "auto" : "metadata"}
      aria-hidden={preview || undefined}
      className={className}
    />
  );
}
