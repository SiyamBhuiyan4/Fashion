/** Small helpers shared by the API routes. */
import "server-only";
import { NextResponse } from "next/server";

export const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Same-origin check for state-changing requests: the browser always sends Origin on a POST, and
 * a form or script on another site cannot fake it. Together with SameSite=Lax cookies this
 * stops cross-site request forgery.
 */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** A very small per-instance limiter for login/sign-up attempts. */
const hits = new Map<string, { count: number; until: number }>();
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.until < now) {
    hits.set(key, { count: 1, until: now + windowMs });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}

export function clientIp(request: Request): string {
  return (request.headers.get("x-forwarded-for") ?? "").split(",")[0]!.trim() || "local";
}
