/**
 * Turns a product video into HLS: a few renditions, each cut into short .ts pieces that are all
 * under Telegram's 20 MB bot download limit. The player stitches the pieces back together, so a
 * video can be any length and any quality.
 *
 * The top rendition is the original, capped at 1080p (short side) so the site stays fast:
 *   - H.264 sources up to 1080p (what browsers play) are cut WITHOUT re-encoding — every pixel
 *     is kept.
 *   - Other codecs (e.g. iPhone HEVC, which Chrome cannot play) and anything above 1080p (2K, 4K)
 *     are encoded once at CRF 18 (visually lossless), at the original size or 1080p.
 * Smaller renditions (720p / 480p, never above the top one) are added only so that a
 * slow connection still plays smoothly; the player picks the best one the connection can carry.
 *
 * Piece length: 6 seconds. If any piece of a rendition comes out over the limit (a very high
 * bitrate source), that rendition is cut again with proportionally shorter pieces.
 *
 *   node scripts/video-hls.ts <input> <output-dir>
 */
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { promisify } from "node:util";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const FFMPEG: string = require("ffmpeg-static");
const FFPROBE: string = require("ffprobe-static").path;
const run = promisify(execFile);

/** Telegram serves bot downloads up to 20 MB; stay clearly below it. */
export const PIECE_LIMIT = 19_000_000;
/** The best quality level is capped at 1080p (short side): more only makes the site slow. */
const MAX_SIDE = 1080;
const PIECE_SECONDS = 6;
const LADDER = [
  { side: 720, crf: 21, maxKbps: 4500, audioKbps: 128 },
  { side: 480, crf: 22, maxKbps: 2000, audioKbps: 96 },
];

export interface Probe {
  duration: number;
  width: number;
  height: number;
  fps: number;
  videoCodec: string;
  profile: string;
  level: number;
  pixFmt: string;
  audioCodec: string | null;
  rotated: boolean;
}

export interface Segment {
  file: string; // local path
  duration: number;
  bytes: number;
}

export interface Rendition {
  name: string;
  width: number;
  height: number;
  /** Peak bits per second over a piece, for the HLS BANDWIDTH attribute. */
  bandwidth: number;
  codecs: string;
  copied: boolean;
  segments: Segment[];
}

export async function probe(input: string): Promise<Probe> {
  const { stdout } = await run(FFPROBE, [
    "-v",
    "error",
    "-print_format",
    "json",
    "-show_format",
    "-show_streams",
    input,
  ]);
  const data = JSON.parse(stdout) as {
    format: { duration?: string };
    streams: Array<{
      codec_type: string;
      codec_name: string;
      profile?: string;
      level?: number;
      width?: number;
      height?: number;
      avg_frame_rate?: string;
      pix_fmt?: string;
      duration?: string;
      tags?: { rotate?: string };
      side_data_list?: Array<{ rotation?: number }>;
    }>;
  };
  const video = data.streams.find((s) => s.codec_type === "video");
  if (!video?.width || !video.height) throw new Error(`${basename(input)}: no video stream`);
  const audio = data.streams.find((s) => s.codec_type === "audio");
  const [n, d] = (video.avg_frame_rate ?? "30/1").split("/").map(Number);
  const duration = Number(data.format.duration ?? video.duration ?? 0);
  if (!(duration > 0)) throw new Error(`${basename(input)}: unknown duration`);
  const rotation = Math.abs(
    Number(video.tags?.rotate ?? video.side_data_list?.find((s) => s.rotation)?.rotation ?? 0),
  );
  const rotated = rotation === 90 || rotation === 270;
  return {
    duration,
    width: rotated ? video.height : video.width,
    height: rotated ? video.width : video.height,
    fps: n && d ? n / d : 30,
    videoCodec: video.codec_name,
    profile: video.profile ?? "",
    level: video.level ?? 0,
    pixFmt: video.pix_fmt ?? "",
    audioCodec: audio?.codec_name ?? null,
    rotated,
  };
}

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/** RFC 6381 codec string for an H.264 stream, e.g. avc1.640028 (High, level 4.0). */
function avc(profile: string, level: number): string {
  const p = /baseline/i.test(profile) ? "42e0" : /main/i.test(profile) ? "4d40" : "6400";
  return `avc1.${p}${Math.max(level, 30).toString(16).padStart(2, "0")}`;
}
function levelFor(width: number, height: number, fps: number): number {
  const mbps = (Math.ceil(width / 16) * Math.ceil(height / 16) * fps) / 1000; // macroblocks/s
  if (mbps <= 245) return 40;
  if (mbps <= 522) return 42;
  if (mbps <= 983) return 51;
  return 52;
}

/** Browsers play H.264 in 8-bit 4:2:0; anything else has to be encoded. */
function canCopy(info: Probe): boolean {
  return (
    info.videoCodec === "h264" &&
    (info.pixFmt === "yuv420p" || info.pixFmt === "yuvj420p") &&
    !info.rotated // a rotation flag does not survive cutting into .ts pieces
  );
}

async function cut(
  input: string,
  dir: string,
  info: Probe,
  plan: {
    copy: boolean;
    width: number;
    height: number;
    crf: number;
    maxKbps: number | null;
    audioKbps: number;
  },
  seconds: number,
  /** Cut exactly at these times (seconds), so every quality level has the same piece boundaries. */
  keyframesIn?: number[],
): Promise<Segment[]> {
  // No cut points (the top level is a single piece) means: cut normally.
  const keyframes = keyframesIn && keyframesIn.length > 0 ? keyframesIn : undefined;
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const fps = Math.min(info.fps, 60);
  const gop = Math.max(1, Math.round(fps * seconds));
  const video = plan.copy
    ? ["-c:v", "copy"]
    : [
        "-vf",
        `scale=${plan.width}:${plan.height}:flags=lanczos,format=yuv420p`,
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-profile:v",
        "high",
        "-crf",
        String(plan.crf),
        ...(plan.maxKbps
          ? ["-maxrate", `${plan.maxKbps}k`, "-bufsize", `${plan.maxKbps * 2}k`]
          : []),
        ...(keyframes
          ? // Keyframes only at the given cut points; the muxer then cuts at every keyframe.
            [
              "-force_key_frames",
              keyframes.map((t) => t.toFixed(3)).join(","),
              "-g",
              "100000",
              "-sc_threshold",
              "0",
            ]
          : // A keyframe at every cut, so each piece starts cleanly and they are all equal length.
            ["-g", String(gop), "-keyint_min", String(gop), "-sc_threshold", "0"]),
      ];
  const audio = info.audioCodec
    ? info.audioCodec === "aac" && plan.copy
      ? ["-c:a", "copy"]
      : ["-c:a", "aac", "-b:a", `${plan.audioKbps}k`, "-ac", "2"]
    : ["-an"];
  await run(
    FFMPEG,
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      input,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      ...video,
      ...audio,
      "-f",
      "hls",
      "-hls_time",
      keyframes ? "0.05" : String(seconds),
      "-hls_playlist_type",
      "vod",
      "-hls_segment_type",
      "mpegts",
      "-hls_segment_filename",
      join(dir, "p%04d.ts"),
      join(dir, "index.m3u8"),
    ],
    { maxBuffer: 1 << 24 },
  );
  // Read the real piece lengths back from the playlist ffmpeg wrote.
  const lines = readFileSync(join(dir, "index.m3u8"), "utf8").split("\n");
  const segments: Segment[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = /^#EXTINF:([\d.]+)/.exec(lines[i]!);
    if (!match) continue;
    const file = join(dir, lines[i + 1]!.trim());
    segments.push({ file, duration: Number(match[1]), bytes: statSync(file).size });
  }
  if (segments.length === 0) throw new Error("ffmpeg produced no pieces");
  return segments;
}

export async function toHls(
  input: string,
  outDir: string,
  log: (line: string) => void = () => undefined,
): Promise<{ info: Probe; renditions: Rendition[] }> {
  const info = await probe(input);
  const shortSide = Math.min(info.width, info.height);
  const scale = (side: number) => ({
    width: even((info.width * side) / shortSide),
    height: even((info.height * side) / shortSide),
  });

  type Plan = Parameters<typeof cut>[3] & { name: string };
  // The best level is the original, but never above 1080p: bigger frames only slow the site.
  const oversize = shortSide > MAX_SIDE;
  const topSide = Math.min(shortSide, MAX_SIDE);
  const plans: Plan[] = [
    {
      name: "source",
      copy: canCopy(info) && !oversize,
      ...(oversize ? scale(MAX_SIDE) : { width: even(info.width), height: even(info.height) }),
      crf: 18,
      maxKbps: null,
      audioKbps: 192,
    },
  ];
  if (oversize) log(`  ${info.width}x${info.height} is above 1080p — the best level will be 1080p`);
  for (const step of LADDER) {
    if (step.side >= topSide) continue; // never upscale, never duplicate the best level
    plans.push({ name: `${step.side}p`, copy: false, ...scale(step.side), ...step });
  }

  const renditions: Rendition[] = [];
  /** Where the top quality level was cut; the smaller levels are cut at exactly the same times. */
  let boundaries: number[] | undefined;
  for (const plan of plans) {
    const dir = join(outDir, plan.name);
    let seconds = PIECE_SECONDS;
    const fit = async (): Promise<Segment[]> => {
      if (boundaries) return cut(input, dir, info, plan, seconds, boundaries);
      let segments = await cut(input, dir, info, plan, seconds);
      // Any piece too big? Cut again with pieces short enough that the biggest one fits.
      for (let attempt = 0; attempt < 4; attempt++) {
        const biggest = Math.max(...segments.map((s) => s.bytes));
        if (biggest <= PIECE_LIMIT) return segments;
        const next = Math.max(1, Math.floor(seconds * (PIECE_LIMIT / biggest) * 0.9 * 10) / 10);
        if (next >= seconds) break;
        log(`  ${plan.name}: a piece is ${mb(biggest)}, cutting again at ${next}s pieces`);
        seconds = next;
        segments = await cut(input, dir, info, plan, seconds);
      }
      return segments;
    };

    let segments = await fit();
    let biggest = Math.max(...segments.map((s) => s.bytes));
    if (biggest > PIECE_LIMIT && plan.copy) {
      // The source's own keyframes are too far apart to cut it small enough without encoding.
      log(`  ${plan.name}: keyframes too far apart to cut as-is — encoding at CRF 18 instead`);
      plan.copy = false;
      seconds = PIECE_SECONDS;
      segments = await fit();
      biggest = Math.max(...segments.map((s) => s.bytes));
    }
    if (biggest > PIECE_LIMIT) {
      throw new Error(`${plan.name}: could not cut it into pieces under 20 MB (${mb(biggest)})`);
    }
    if (!boundaries) {
      boundaries = [];
      let t = 0;
      for (const segment of segments.slice(0, -1)) boundaries.push((t += segment.duration));
    }
    const bandwidth = Math.round(
      Math.max(...segments.map((s) => (s.bytes * 8) / Math.max(s.duration, 0.1))),
    );
    const fps = Math.min(info.fps, 60);
    const codecs = [
      plan.copy
        ? avc(info.profile, info.level)
        : avc("high", levelFor(plan.width, plan.height, fps)),
      info.audioCodec ? "mp4a.40.2" : null,
    ]
      .filter(Boolean)
      .join(",");
    const total = segments.reduce((sum, s) => sum + s.bytes, 0);
    log(
      `  ${plan.name}: ${plan.width}x${plan.height}, ${segments.length} pieces, ${mb(total)} ` +
        `(${plan.copy ? "original, not re-encoded" : `CRF ${plan.crf}`}, biggest piece ${mb(biggest)})`,
    );
    renditions.push({
      name: plan.name,
      width: plan.width,
      height: plan.height,
      bandwidth,
      codecs,
      copied: plan.copy,
      segments,
    });
  }
  return { info, renditions };
}

export async function posterFrame(input: string, duration: number, output: string) {
  await run(FFMPEG, [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    Math.min(1, duration / 3).toFixed(2),
    "-i",
    input,
    "-frames:v",
    "1",
    "-vf",
    "scale='min(1080,iw)':-2",
    "-q:v",
    "3",
    output,
  ]);
}

export const mb = (bytes: number) => `${(bytes / 1_000_000).toFixed(2)} MB`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const [input, out = "hls-out"] = process.argv.slice(2);
  if (!input) {
    console.error("Usage: node scripts/video-hls.ts <input> <output-dir>");
    process.exit(1);
  }
  toHls(input, out, console.log)
    .then(({ renditions }) => console.log(`${renditions.length} renditions in ${out}`))
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    });
}
