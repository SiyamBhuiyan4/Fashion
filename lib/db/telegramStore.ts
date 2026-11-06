/**
 * The store's database, kept inside a Telegram channel.
 *
 * Ported from the restaurant app (client/telegram-db/store.js) and sharing its bot and
 * channel. The whole database is one JSON document ({ version, updated_at, tables }),
 * encrypted and posted to the channel. The channel's pinned message belongs to another app,
 * so the pointer to the newest snapshot lives in the channel description, on its own line:
 *   [fashion-db] v=<version> m=<message_id> f=<file_id>
 *
 * The restaurant app keeps its own `[smartdine-db]` line in the same description. Each app
 * strips only its own lines and writes everything else back untouched, so the two pointers
 * live side by side. NEVER pin or unpin anything in this channel.
 *
 * Writes take a lock, also in the description:
 *   [fashion-db-lock] <writer id> <expires at, ms>
 * A writer sets the line, waits, then reads it back; only the writer that still sees its own
 * id proceeds. Locks expire on their own, so a crashed writer cannot block the database.
 * The website only ever reads; writes come from scripts/seed-db.mjs.
 *
 * Encryption: AES-256-GCM with a key derived from FASHION_DB_SECRET. The bot token is public
 * (it ships in the restaurant's public repo), so without this anyone could replace the
 * catalog with their own; a snapshot that does not decrypt is rejected.
 */
// Server-side only: it holds the bot token and the snapshot key. Never import it from a
// client component. (No "server-only" guard, so that scripts/seed-db.ts can reuse it.)
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const LOCK_MS = 15_000;
const LOCK_SETTLE_MS = 450;
const LOCK_WAIT_MS = 20_000;
const SNAPSHOT_CACHE = 3;

export interface Snapshot {
  version: number;
  updated_at: string;
  tables: Record<string, unknown[]>;
}

export class TelegramDbError extends Error {}
export class ConflictError extends TelegramDbError {}
export class NotConfiguredError extends TelegramDbError {}

interface Pointer {
  version: number;
  messageId: number;
  fileId: string;
}
interface Lock {
  id: string;
  expiresAt: number;
}
interface Description {
  base: string;
  pointer: Pointer | null;
  lock: Lock | null;
}
interface Config {
  token: string;
  chatId: string;
  key: Buffer;
  tag: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function tagPatterns(tag: string) {
  return {
    pointer: new RegExp(`\\[${tag}\\] v=(\\d+) m=(\\d+) f=([A-Za-z0-9_-]+)`),
    lock: new RegExp(`\\[${tag}-lock\\] ([a-f0-9]+) (\\d+)`),
  };
}

export function isConfigured(): boolean {
  return Boolean(
    process.env.TELEGRAM_BOT_TOKEN &&
    process.env.TELEGRAM_CHAT_ID &&
    (process.env.FASHION_DB_SECRET ?? "").length >= 16,
  );
}

function config(): Config {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const secret = process.env.FASHION_DB_SECRET;
  const tag = (process.env.FASHION_DB_TAG || "fashion-db").replace(/[^a-z0-9-]/gi, "");
  if (!token || !chatId) {
    throw new NotConfiguredError("TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set");
  }
  if (!secret || secret.length < 16) {
    throw new NotConfiguredError("FASHION_DB_SECRET (16+ characters) is not set");
  }
  return { token, chatId, key: createHash("sha256").update(secret).digest(), tag };
}

interface TelegramError extends Error {
  description?: string;
}

async function tg<T>(
  token: string,
  method: string,
  params: Record<string, unknown> | null,
  form?: FormData,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      ...(form
        ? { body: form }
        : {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params ?? {}),
          }),
      // No `cache: "no-store"`: that would opt every page that reads the catalogue out of
      // static rendering. Telegram's API is POST-only here, which Next never caches anyway.
    });
    const data = (await res.json().catch(() => null)) as {
      ok: boolean;
      result?: T;
      description?: string;
      error_code?: number;
      parameters?: { retry_after?: number };
    } | null;
    if (data?.ok && data.result !== undefined) return data.result;
    const retryAfter = data?.parameters?.retry_after;
    if (data?.error_code === 429 && retryAfter && attempt < 3) {
      await sleep(retryAfter * 1000 + 100);
      continue;
    }
    const error: TelegramError = new TelegramDbError(
      `Telegram ${method} failed: ${data?.description ?? res.status}`,
    );
    error.description = data?.description ?? "";
    throw error;
  }
}

function encrypt(key: Buffer, value: unknown): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return JSON.stringify({
    alg: "A256GCM",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  });
}

function decrypt(key: Buffer, text: string): unknown {
  const box = JSON.parse(text) as { iv: string; tag: string; data: string };
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(box.iv, "base64"));
  decipher.setAuthTag(Buffer.from(box.tag, "base64"));
  const plain = Buffer.concat([decipher.update(Buffer.from(box.data, "base64")), decipher.final()]);
  return JSON.parse(plain.toString("utf8"));
}

async function readDescription({ token, chatId, tag }: Config): Promise<Description> {
  const chat = await tg<{ description?: string }>(token, "getChat", { chat_id: chatId });
  const description = chat.description ?? "";
  const re = tagPatterns(tag);
  const pointerMatch = description.match(re.pointer);
  const lockMatch = description.match(re.lock);
  return {
    // Everything that is not ours — including the restaurant app's pointer — is kept verbatim.
    base: description
      .replace(re.pointer, "")
      .replace(re.lock, "")
      .replace(/\n{2,}/g, "\n")
      .trim(),
    pointer: pointerMatch
      ? {
          version: Number(pointerMatch[1]),
          messageId: Number(pointerMatch[2]),
          fileId: pointerMatch[3]!,
        }
      : null,
    lock: lockMatch ? { id: lockMatch[1]!, expiresAt: Number(lockMatch[2]) } : null,
  };
}

async function writeDescription(cfg: Config, next: Description): Promise<void> {
  const lines = [next.base];
  if (next.pointer) {
    lines.push(
      `[${cfg.tag}] v=${next.pointer.version} m=${next.pointer.messageId} f=${next.pointer.fileId}`,
    );
  }
  if (next.lock) lines.push(`[${cfg.tag}-lock] ${next.lock.id} ${next.lock.expiresAt}`);
  const description = lines.filter(Boolean).join("\n");
  if (description.length > 255) {
    throw new TelegramDbError("Channel description would exceed Telegram's 255-character limit");
  }
  try {
    await tg(cfg.token, "setChatDescription", { chat_id: cfg.chatId, description });
  } catch (error) {
    if (!/not modified/i.test((error as TelegramError).description ?? "")) throw error;
  }
}

/** Decrypted snapshots by file id; a Telegram file id always refers to the same bytes. */
const cache = new Map<string, Snapshot>();

async function download({ token, key }: Config, fileId: string): Promise<Snapshot> {
  const cached = cache.get(fileId);
  if (cached) return structuredClone(cached);
  const file = await tg<{ file_path: string }>(token, "getFile", { file_id: fileId });
  // A Telegram file id always points at the same bytes, so this response is safe to cache.
  const res = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
  if (!res.ok) throw new TelegramDbError(`Snapshot download failed: ${res.status}`);
  const snapshot = decrypt(key, await res.text()) as Snapshot;
  if (!snapshot || typeof snapshot !== "object" || typeof snapshot.tables !== "object") {
    throw new TelegramDbError("Snapshot is not a database document");
  }
  cache.set(fileId, snapshot);
  while (cache.size > SNAPSHOT_CACHE) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  return structuredClone(snapshot);
}

const emptySnapshot = (): Snapshot => ({
  version: 0,
  updated_at: new Date().toISOString(),
  tables: {},
});

/** Reads the newest snapshot. Returns version 0 when nothing has been saved yet. */
export async function loadSnapshot(): Promise<{ snapshot: Snapshot; version: number }> {
  const cfg = config();
  const { pointer } = await readDescription(cfg);
  if (!pointer) return { snapshot: emptySnapshot(), version: 0 };
  return { snapshot: await download(cfg, pointer.fileId), version: pointer.version };
}

/** One writer at a time within this process, on top of the channel-wide lock. */
let localQueue: Promise<unknown> = Promise.resolve();

async function acquireLock(cfg: Config): Promise<{ id: string; description: Description }> {
  const id = randomBytes(6).toString("hex");
  const deadline = Date.now() + LOCK_WAIT_MS;
  while (Date.now() < deadline) {
    const current = await readDescription(cfg);
    if (current.lock && current.lock.id !== id && current.lock.expiresAt > Date.now()) {
      await sleep(250 + Math.random() * 350);
      continue;
    }
    await writeDescription(cfg, { ...current, lock: { id, expiresAt: Date.now() + LOCK_MS } });
    await sleep(LOCK_SETTLE_MS);
    const check = await readDescription(cfg);
    if (check.lock?.id === id) return { id, description: check };
    await sleep(200 + Math.random() * 400);
  }
  throw new ConflictError("The database is busy — try again in a moment");
}

/**
 * Applies a change under the write lock. `change` receives the newest snapshot (a copy it may
 * modify) and returns true when it changed something. Resolves with the stored version.
 */
export function withWriteLock(
  change: (snapshot: Snapshot, version: number) => boolean | Promise<boolean>,
): Promise<number> {
  const run = async (): Promise<number> => {
    const cfg = config();
    const { id, description } = await acquireLock(cfg);
    let released = false;
    try {
      const version = description.pointer?.version ?? 0;
      const snapshot = description.pointer
        ? await download(cfg, description.pointer.fileId)
        : emptySnapshot();
      if (!(await change(snapshot, version))) return version;

      const next = version + 1;
      const body: Snapshot = { ...snapshot, version: next, updated_at: new Date().toISOString() };
      const form = new FormData();
      form.append("chat_id", cfg.chatId);
      form.append("disable_notification", "true");
      form.append("caption", `Fashion store data (${cfg.tag}) v${next}`);
      form.append(
        "document",
        new Blob([encrypt(cfg.key, body)], { type: "application/json" }),
        `${cfg.tag}-v${next}.json`,
      );
      const sent = await tg<{ message_id: number; document: { file_id: string } }>(
        cfg.token,
        "sendDocument",
        null,
        form,
      );

      // New pointer and lock release in a single edit, re-reading first so that a write by the
      // restaurant app in the meantime is not lost.
      const fresh = await readDescription(cfg);
      await writeDescription(cfg, {
        base: fresh.lock?.id === id || !fresh.lock ? fresh.base : description.base,
        pointer: { version: next, messageId: sent.message_id, fileId: sent.document.file_id },
        lock: null,
      });
      released = true;
      cache.set(sent.document.file_id, structuredClone(body));
      if (description.pointer?.messageId) {
        void tg(cfg.token, "deleteMessage", {
          chat_id: cfg.chatId,
          message_id: description.pointer.messageId,
        }).catch(() => undefined);
      }
      return next;
    } finally {
      if (!released) {
        const now = await readDescription(cfg).catch(() => null);
        if (now?.lock?.id === id) {
          await writeDescription(cfg, { ...now, lock: null }).catch(() => undefined);
        }
      }
    }
  };
  const result = localQueue.then(run, run);
  localQueue = result.catch(() => undefined);
  return result;
}

/** Uploads a file to the channel and returns its permanent same-origin link. */
export async function uploadMedia(
  bytes: Uint8Array,
  filename: string,
  contentType: string,
): Promise<{ fileId: string; url: string }> {
  const cfg = config();
  const form = new FormData();
  form.append("chat_id", cfg.chatId);
  form.append("disable_notification", "true");
  form.append("caption", `fashion media · ${filename}`);
  const blob = new Blob([new Uint8Array(bytes)], { type: contentType });
  // Everything goes up as a document so Telegram stores the exact bytes. It still files a .webp
  // under `sticker` and some types under `photo`/`video`, so every field is checked for the id.
  form.append("document", blob, filename);
  const sent = await tg<{
    document?: { file_id: string };
    sticker?: { file_id: string };
    video?: { file_id: string };
    animation?: { file_id: string };
    photo?: Array<{ file_id: string }>;
  }>(cfg.token, "sendDocument", null, form);
  const fileId =
    sent.document?.file_id ??
    sent.sticker?.file_id ??
    sent.video?.file_id ??
    sent.animation?.file_id ??
    sent.photo?.at(-1)?.file_id;
  if (!fileId) throw new TelegramDbError(`Upload of ${filename} returned no file id`);
  const extension = filename.split(".").pop() ?? "bin";
  return { fileId, url: `/api/tg/${fileId}.${extension}` };
}
