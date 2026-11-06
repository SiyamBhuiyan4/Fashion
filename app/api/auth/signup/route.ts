import { z } from "zod";
import { id, nowIso, transact, UserError } from "@/lib/server/db";
import { hashPassword, publicUser, setSessionCookie } from "@/lib/server/auth";
import { clientIp, handler, json, rateLimit } from "@/lib/server/http";

export const runtime = "nodejs";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(60),
  email: z.string().trim().toLowerCase().email("Please enter a valid email.").max(120),
  password: z
    .string()
    .min(8, "Use at least 8 characters for the password.")
    .max(128, "That password is too long."),
});

export const POST = handler(schema, async (input, { request }) => {
  if (!rateLimit(`signup:${clientIp(request)}`, 5, 10 * 60 * 1000)) {
    return json({ error: "Too many attempts — try again in a few minutes." }, 429);
  }
  const passwordHash = await hashPassword(input.password);
  const user = await transact((db) => {
    if (db.t.users.some((u) => u.email === input.email)) {
      throw new UserError("An account with this email already exists. Try signing in.", 409);
    }
    const created = {
      id: id("usr"),
      email: input.email,
      name: input.name,
      passwordHash,
      createdAt: nowIso(),
      profile: {},
    };
    db.t.users.push(created);
    db.notify(
      created.id,
      `Welcome to MAISON, ${created.name.split(" ")[0]}`,
      "Your first order gets 10% off automatically at checkout.",
      "/#women",
    );
    return created;
  });
  await setSessionCookie(user.id);
  return json({ user: publicUser(user) }, 201);
});
