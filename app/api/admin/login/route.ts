import { z } from "zod";
import { adminConfigured, checkPassword, setAdminCookie } from "@/lib/server/admin";
import { clientIp, json, rateLimit, sameOrigin } from "@/lib/server/http";

export const runtime = "nodejs";

const schema = z.object({ password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
  if (!adminConfigured()) {
    return json({ error: "The admin password is not set up yet (ADMIN_PASSWORD_HASH)." }, 503);
  }
  if (!rateLimit(`admin:${clientIp(request)}`, 8, 15 * 60_000)) {
    return json({ error: "Too many tries. Please wait 15 minutes." }, 429);
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !checkPassword(parsed.data.password)) {
    return json({ error: "Wrong password." }, 401);
  }
  await setAdminCookie();
  return json({ ok: true });
}
