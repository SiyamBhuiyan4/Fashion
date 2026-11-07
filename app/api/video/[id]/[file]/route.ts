/**
 * Product videos, from the "videos" table:
 *
 *   /api/video/<product-id>/file          a video uploaded in the admin panel: its pieces (each
 *                                          ≤ 4 MB in the Telegram channel) joined back into the
 *                                          original file, with byte ranges so the player can seek
 *   /api/video/<product-id>/master.m3u8   HLS (videos added with `npm run videos:upload`): every
 *   /api/video/<product-id>/<name>.m3u8   quality level, and the pieces of one level, in order
 */
import { getVideoRow } from "@/lib/products.server";
import { productIdSchema, type VideoFileRow } from "@/lib/schemas";
import { fetchTelegramFile } from "@/lib/server/telegramFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE_RE = /^([a-z0-9]{2,12})\.m3u8$/;

function playlist(body: string[]): Response {
  return new Response(body.join("\n") + "\n", {
    headers: {
      "Content-Type": "application/vnd.apple.mpegurl",
      "X-Content-Type-Options": "nosniff",
      // A new upload replaces the row, so playlists are only cached briefly.
      "Cache-Control": "public, max-age=60, s-maxage=300",
    },
  });
}

/** Answers one byte range of an uploaded video from the piece that holds it. */
async function serveFile(request: Request, row: VideoFileRow): Promise<Response> {
  const total = row.size;
  const starts: number[] = [];
  let offset = 0;
  for (const part of row.parts) {
    starts.push(offset);
    offset += part.s;
  }

  let start = 0;
  let end = total - 1;
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range) {
    if (range[1] === "" && range[2] !== "") {
      start = Math.max(0, total - Number(range[2]));
    } else {
      start = Number(range[1] || 0);
      if (range[2] !== "") end = Math.min(total - 1, Number(range[2]));
    }
  }
  if (start >= total || start > end) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${total}` } });
  }

  // One piece per response: the player asks for the rest as it needs it.
  let index = starts.findIndex((s, i) => start >= s && start < s + row.parts[i]!.s);
  if (index < 0) index = 0;
  const partStart = starts[index]!;
  end = Math.min(end, partStart + row.parts[index]!.s - 1);

  const upstream = await fetchTelegramFile(
    row.parts[index]!.f,
    `bytes=${start - partStart}-${end - partStart}`,
  );
  if (!upstream || !upstream.ok) return new Response("Video unavailable", { status: 502 });

  return new Response(upstream.body, {
    status: 206,
    headers: {
      "Content-Type": row.type,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
      // The address changes with every new upload (?v=), so a piece never goes stale.
      "Cache-Control": "public, max-age=86400",
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; file: string }> },
): Promise<Response> {
  const { id, file } = await params;
  const productId = productIdSchema.safeParse(id);
  if (!productId.success) return new Response("Not found", { status: 404 });

  if (file === "file") {
    const row = await getVideoRow(productId.data);
    if (!row || !("parts" in row)) return new Response("Not found", { status: 404 });
    return serveFile(request, row);
  }

  const match = FILE_RE.exec(file);
  if (!match) return new Response("Not found", { status: 404 });
  const row = await getVideoRow(productId.data);
  if (!row || !("renditions" in row)) return new Response("Not found", { status: 404 });

  if (match[1] === "master") {
    const levels = [...row.renditions].sort((a, b) => b.bandwidth - a.bandwidth);
    return playlist([
      "#EXTM3U",
      "#EXT-X-VERSION:3",
      "#EXT-X-INDEPENDENT-SEGMENTS",
      ...levels.flatMap((level) => [
        `#EXT-X-STREAM-INF:BANDWIDTH=${level.bandwidth},RESOLUTION=${level.width}x${level.height},CODECS="${level.codecs}"`,
        `${level.name}.m3u8`,
      ]),
    ]);
  }

  const level = row.renditions.find((r) => r.name === match[1]);
  if (!level) return new Response("Not found", { status: 404 });
  const target = Math.ceil(Math.max(...level.segments.map((s) => s.d)));
  return playlist([
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    `#EXT-X-TARGETDURATION:${target}`,
    "#EXT-X-MEDIA-SEQUENCE:0",
    "#EXT-X-PLAYLIST-TYPE:VOD",
    ...level.segments.flatMap((s) => [`#EXTINF:${s.d.toFixed(3)},`, `/api/tg/${s.f}.ts`]),
    "#EXT-X-ENDLIST",
  ]);
}
