/**
 * Email + password accounts.
 *
 * Passwords are stored only as scrypt hashes (random salt, constant-time compare). A session
 * is a signed cookie — `maison_session` = base64url({ uid, exp }).HMAC — so logging in needs
 * no database write and the cookie cannot be forged without FASHION_DB_SECRET.
 */
import "server-only";
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { read, type Db, type User } from "@/lib/server/db";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = "maison_session";
const SESSION_DAYS = 30;

function sessionKey(): Buffer {
  const secret = process.env.FASHION_DB_SECRET;
  if (!secret) throw new Error("FASHION_DB_SECRET is not set");
  return createHash("sha256").update(`session:${secret}`).digest();
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 32);
  return `s1$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [version, salt, hash] = stored.split("$");
  if (version !== "s1" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = await scryptAsync(password, Buffer.from(salt, "base64url"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function sign(payload: string): string {
  return createHmac("sha256", sessionKey()).update(payload).digest("base64url");
}

export function sessionToken(userId: string): { value: string; maxAge: number } {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + maxAge * 1000 }),
  ).toString("base64url");
  return { value: `${payload}.${sign(payload)}`, maxAge };
}

export function readSession(token: string | undefined): string | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      uid?: string;
      exp?: number;
    };
    if (!data.uid || !data.exp || data.exp < Date.now()) return null;
    return data.uid;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string) {
  const { value, maxAge } = sessionToken(userId);
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function currentUserId(): Promise<string | null> {
  return readSession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** The signed-in customer and a fresh read of the data, or null when signed out. */
export async function currentUser(): Promise<{ user: User; db: Db } | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const db = await read();
  const user = db.user(uid);
  return user ? { user, db } : null;
}

/** The customer-safe view of an account (never the password hash). */
export function publicUser(user: User) {
  return { id: user.id, email: user.email, name: user.name, profile: user.profile };
}
