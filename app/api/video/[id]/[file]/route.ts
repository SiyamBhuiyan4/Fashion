/**
 * HLS playlists for a product video, built from the "videos" table:
 *
 *   /api/video/<product-id>/master.m3u8   every quality level, best first
 *   /api/video/<product-id>/<name>.m3u8   the pieces of one level, in order
 *
 * The pieces are files in the Telegram channel, each under the 20 MB bot download limit, and are
 * fetched through /api/tg/<file_id>.ts. The player joins them back into one video.
 */
import { getVideoRow } from "@/lib/products.server";
import { productIdSchema } from "@/lib/schemas";

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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; file: string }> },
): Promise<Response> {
  const { id, file } = await params;
  const productId = productIdSchema.safeParse(id);
  const match = FILE_RE.exec(file);
  if (!productId.success || !match) return new Response("Not found", { status: 404 });

  const row = await getVideoRow(productId.data);
  if (!row) return new Response("Not found", { status: 404 });

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
