import { z } from "zod";
import { read } from "@/lib/server/db";
import { publicUser, setSessionCookie, verifyPassword } from "@/lib/server/auth";
import { clientIp, handler, json, rateLimit } from "@/lib/server/http";

export const runtime = "nodejs";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email.").max(120),
  password: z.string().min(1, "Please enter your password.").max(128),
});

export const POST = handler(schema, async (input, { request }) => {
  if (!rateLimit(`login:${clientIp(request)}:${input.email}`, 8, 10 * 60 * 1000)) {
    return json({ error: "Too many attempts — try again in a few minutes." }, 429);
  }
  const db = await read();
  const user = db.t.users.find((u) => u.email === input.email);
  // The same message either way, so the form does not reveal which emails have accounts.
  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    return json({ error: "Email or password is not right." }, 401);
  }
  await setSessionCookie(user.id);
  return json({ user: publicUser(user) });
});
