/** Small helpers shared by the customer API routes. */
import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { UserError } from "@/lib/server/db";
import { currentUserId } from "@/lib/server/auth";
import { ConflictError } from "@/lib/db/telegramStore";

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

/**
 * Wraps a POST handler: checks the origin, parses and validates the JSON body, optionally
 * requires a signed-in customer, and turns errors into clean JSON responses.
 */
export function handler<S extends z.ZodType>(
  schema: S,
  run: (input: z.infer<S>, ctx: { request: Request; userId: string | null }) => Promise<Response>,
  options: { auth?: boolean } = {},
) {
  return async (request: Request): Promise<Response> => {
    if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
    const userId = await currentUserId();
    if (options.auth && !userId) return json({ error: "Please sign in first." }, 401);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid request." }, 400);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, 400);
    }
    try {
      return await run(parsed.data, { request, userId });
    } catch (error) {
      if (error instanceof UserError) return json({ error: error.message }, error.status);
      if (error instanceof ConflictError) {
        return json({ error: "The shop is busy — please try again in a moment." }, 503);
      }
      console.error("[api]", error);
      return json({ error: "Something went wrong. Please try again." }, 500);
    }
  };
}
