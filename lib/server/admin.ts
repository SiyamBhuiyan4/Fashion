/**
 * The owner's sign-in for the admin panel (/admin).
 *
 * The password itself is never stored: ADMIN_PASSWORD_HASH (in .env.local and on Vercel) holds
 * only its scrypt hash, `s1.<salt>.<hash>`, made with `npm run admin:password`. Signing in sets
 * `aurevya_admin`, a signed cookie (HMAC with a key derived from FASHION_DB_SECRET) that also
 * carries a fingerprint of the hash, so changing the password signs every admin device out.
 */
import "server-only";
import { createHash, createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { z } from "zod";
import { ConflictError } from "@/lib/db/telegramStore";
import { UserError } from "@/lib/server/db";
import { json, sameOrigin } from "@/lib/server/http";

export const ADMIN_COOKIE = "aurevya_admin";
const ADMIN_DAYS = 14;

const storedHash = () => (process.env.ADMIN_PASSWORD_HASH ?? "").trim();

export function adminConfigured(): boolean {
  return (
    /^s1\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{40,}$/.test(storedHash()) &&
    Boolean(process.env.FASHION_DB_SECRET)
  );
}

const sha = (value: string) => createHash("sha256").update(value).digest();

function key(): Buffer {
  return sha(`admin-session:${process.env.FASHION_DB_SECRET ?? ""}`);
}

function fingerprint(): string {
  return sha(`admin-password:${storedHash()}`).toString("base64url").slice(0, 12);
}

export function checkPassword(password: string): boolean {
  if (!adminConfigured()) return false;
  const [, salt, hash] = storedHash().split(".");
  const expected = Buffer.from(hash!, "base64url");
  const actual = scryptSync(password, Buffer.from(salt!, "base64url"), expected.length);
  return timingSafeEqual(actual, expected);
}

const sign = (payload: string) => createHmac("sha256", key()).update(payload).digest("base64url");

export async function setAdminCookie() {
  const maxAge = ADMIN_DAYS * 24 * 60 * 60;
  const payload = Buffer.from(
    JSON.stringify({ r: "admin", f: fingerprint(), exp: Date.now() + maxAge * 1000 }),
  ).toString("base64url");
  (await cookies()).set(ADMIN_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge,
  });
}

export async function clearAdminCookie() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      r?: string;
      f?: string;
      exp?: number;
    };
    return data.r === "admin" && data.f === fingerprint() && (data.exp ?? 0) > Date.now();
  } catch {
    return false;
  }
}

function errorResponse(error: unknown): Response {
  if (error instanceof UserError) return json({ error: error.message }, error.status);
  if (error instanceof ConflictError) {
    return json({ error: "The shop is busy — please try again in a moment." }, 503);
  }
  console.error("[admin]", error);
  return json({ error: "Something went wrong. Please try again." }, 500);
}

/** A GET for the admin panel: signed-in owner only. */
export function adminGet(run: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    if (!(await isAdmin())) return json({ error: "Please sign in to the admin panel." }, 401);
    try {
      return await run(request);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** A JSON POST for the admin panel: same origin, signed-in owner, validated body. */
export function adminPost<S extends z.ZodType>(
  schema: S,
  run: (input: z.infer<S>, request: Request) => Promise<Response>,
) {
  return async (request: Request): Promise<Response> => {
    if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
    if (!(await isAdmin())) return json({ error: "Please sign in to the admin panel." }, 401);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request." }, 400);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const where = issue?.path.length ? `${issue.path.join(" › ")}: ` : "";
      return json({ error: `${where}${issue?.message ?? "Invalid request."}` }, 400);
    }
    try {
      return await run(parsed.data, request);
    } catch (error) {
      return errorResponse(error);
    }
  };
}
