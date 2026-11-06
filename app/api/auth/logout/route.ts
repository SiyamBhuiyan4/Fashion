import { clearSessionCookie } from "@/lib/server/auth";
import { json, sameOrigin } from "@/lib/server/http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
  await clearSessionCookie();
  return json({ ok: true });
}
