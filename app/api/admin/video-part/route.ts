/**
 * One piece (≤ 4 MB) of a product video uploaded from the admin panel. The browser cuts the file
 * (components/admin/VideoPicker.tsx), sends the pieces here one by one, and each is stored as a
 * document in the Telegram channel. The product's save then records the pieces in order.
 */
import { uploadMedia } from "@/lib/db/telegramStore";
import { VIDEO_PART_BYTES } from "@/lib/schemas";
import { isAdmin } from "@/lib/server/admin";
import { json, sameOrigin } from "@/lib/server/http";

export const runtime = "nodejs";
// Telegram may ask us to slow down (about 20 files a minute per channel); allow for the wait.
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
  if (!(await isAdmin())) return json({ error: "Please sign in to the admin panel." }, 401);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0) return json({ error: "Empty piece." }, 400);
  if (bytes.length > VIDEO_PART_BYTES) return json({ error: "Piece too large." }, 413);
  const index = Number(request.headers.get("x-part-index") ?? "0");
  try {
    const { fileId } = await uploadMedia(
      bytes,
      `video-part-${Number.isFinite(index) ? index : 0}.bin`,
      "application/octet-stream",
    );
    return json({ f: fileId, s: bytes.length });
  } catch (error) {
    console.error("[video part]", error);
    return json({ error: "Could not store this part of the video. Retrying…" }, 502);
  }
}
