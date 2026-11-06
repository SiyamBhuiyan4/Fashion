/**
 * Permanent link for a file in the Telegram channel: /api/tg/<file_id>.<ext>
 *
 * Ported from the restaurant app (api/tg/[name].js). All media stays on Telegram; this only
 * resolves Telegram's short-lived download path for a file id (valid about an hour) and streams
 * the bytes through, so the links stored in the database never expire. Whole-file responses are
 * cached by the CDN, so Telegram is asked once per file rather than on every view; byte ranges
 * are passed straight through for video seeking.
 */
import type { NextRequest } from "next/server";

// The Node runtime streams the response body just as well and is not deprecated.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE_ID_RE = /^[A-Za-z0-9_-]{10,200}$/;

const TYPES: Record<string, string> = {
  webp: "image/webp",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  avif: "image/avif",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  // HLS video pieces (see app/api/video).
  ts: "video/mp2t",
};

const PATH_TTL_MS = 50 * 60 * 1000;
/** file_id -> resolved Telegram path, per server instance. */
const pathCache = new Map<string, { path: string; at: number }>();

async function telegramPath(token: string, fileId: string, fresh: boolean): Promise<string | null> {
  const hit = pathCache.get(fileId);
  if (!fresh && hit && Date.now() - hit.at < PATH_TTL_MS) return hit.path;
  const res = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
    { cache: "no-store" },
  );
  const data = (await res.json().catch(() => null)) as {
    ok: boolean;
    result?: { file_path?: string };
  } | null;
  const path = data?.ok ? data.result?.file_path : null;
  if (path) pathCache.set(fileId, { path, at: Date.now() });
  return path ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> },
): Promise<Response> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const { name } = await params;
  const [fileId = "", extension = ""] = decodeURIComponent(name).split(".");
  if (!FILE_ID_RE.test(fileId)) return new Response("Bad file id", { status: 400 });
  const type = TYPES[extension.toLowerCase()];
  // Only known media types are served, so the channel can never hand back an HTML or SVG
  // document that would run on this origin.
  if (!type) return new Response("Unsupported file type", { status: 400 });
  if (!token) return new Response("Telegram is not configured", { status: 500 });

  const range = request.headers.get("range");
  const fetchFile = async (fresh: boolean): Promise<Response | null> => {
    const path = await telegramPath(token, fileId, fresh);
    if (!path) return null;
    return fetch(
      `https://api.telegram.org/file/bot${token}/${path}`,
      range ? { headers: { Range: range }, cache: "no-store" } : { cache: "no-store" },
    );
  };

  let upstream = await fetchFile(false);
  // A cached path can expire before the TTL; resolve it once more before giving up.
  if (!upstream || (!upstream.ok && upstream.status !== 416)) upstream = await fetchFile(true);
  if (!upstream) return new Response("File not found on Telegram", { status: 404 });
  if (!upstream.ok && upstream.status !== 416)
    return new Response("Telegram error", { status: 502 });

  const headers = new Headers();
  headers.set("Content-Type", type);
  headers.set("Accept-Ranges", "bytes");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Disposition", `inline; filename="${fileId}.${extension}"`);
  for (const header of ["content-length", "content-range", "etag", "last-modified"]) {
    const value = upstream.headers.get(header);
    if (value) headers.set(header, value);
  }
  // Partial responses stay out of the shared cache so a fragment is never stored as the whole file.
  headers.set(
    "Cache-Control",
    upstream.status === 200
      ? "public, max-age=86400, s-maxage=31536000, immutable"
      : "public, max-age=86400",
  );
  return new Response(upstream.body, { status: upstream.status, headers });
}
