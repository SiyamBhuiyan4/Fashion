/**
 * Product photo upload. The browser shrinks the photo first (components/admin/ImagePicker.tsx),
 * so it arrives well under Vercel's 4.5 MB request limit; it is stored in the Telegram channel
 * like all other media and served from /api/tg/<file_id>.<ext>.
 */
import { uploadMedia } from "@/lib/db/telegramStore";
import { isAdmin } from "@/lib/server/admin";
import { json, sameOrigin } from "@/lib/server/http";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;

function kindOf(bytes: Uint8Array): { ext: string; type: string } | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", type: "image/jpeg" };
  }
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { ext: "webp", type: "image/webp" };
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return { ext: "png", type: "image/png" };
  return null;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
  if (!(await isAdmin())) return json({ error: "Please sign in to the admin panel." }, 401);
  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    file = entry instanceof File ? entry : null;
  } catch {
    file = null;
  }
  if (!file) return json({ error: "No photo was sent." }, 400);
  if (file.size > MAX_BYTES) return json({ error: "This photo is too large (4 MB max)." }, 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = kindOf(bytes);
  if (!kind) return json({ error: "Please choose a JPG, PNG or WebP photo." }, 415);
  try {
    const name = `aurevya-${Date.now().toString(36)}.${kind.ext}`;
    const { url } = await uploadMedia(bytes, name, kind.type);
    return json({ url });
  } catch (error) {
    console.error("[admin upload]", error);
    return json({ error: "The photo could not be saved. Please try again." }, 502);
  }
}
