/**
 * Downloads files from the Telegram channel for the media routes. A file id is permanent, but its
 * download path is valid for about an hour, so paths are cached per server instance.
 */
import "server-only";

const PATH_TTL_MS = 50 * 60 * 1000;
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

/** Fetches a channel file (or a byte range of it), resolving the path again if it expired. */
export async function fetchTelegramFile(fileId: string, range?: string): Promise<Response | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  const get = async (fresh: boolean) => {
    const path = await telegramPath(token, fileId, fresh);
    if (!path) return null;
    return fetch(`https://api.telegram.org/file/bot${token}/${path}`, {
      cache: "no-store",
      ...(range ? { headers: { Range: range } } : {}),
    });
  };
  let res = await get(false);
  if (!res || (!res.ok && res.status !== 416)) res = await get(true);
  return res;
}
