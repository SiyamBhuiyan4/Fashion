import { adminGet, adminPost } from "@/lib/server/admin";
import { loadAdmin, saveSettings } from "@/lib/server/adminStore";
import { json } from "@/lib/server/http";
import { settingsSchema } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = adminGet(async () => json({ settings: (await loadAdmin()).settings }));

export const POST = adminPost(settingsSchema, async (input) =>
  json({ settings: await saveSettings(input) }),
);
