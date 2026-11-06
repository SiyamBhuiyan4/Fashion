/** Saves the customer's name and body measurements (used for size recommendations). */
import { z } from "zod";
import { transact, UserError } from "@/lib/server/db";
import { publicUser } from "@/lib/server/auth";
import { handler, json } from "@/lib/server/http";
import { sizeSchema } from "@/lib/schemas";

export const runtime = "nodejs";

const optionalNumber = (min: number, max: number) =>
  z.union([z.number().min(min).max(max), z.null()]).optional();

const schema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  heightCm: optionalNumber(120, 220),
  weightKg: optionalNumber(30, 200),
  chestCm: optionalNumber(60, 160),
  waistCm: optionalNumber(50, 150),
  footEu: optionalNumber(34, 48),
  defaultSize: z.union([sizeSchema, z.null()]).optional(),
});

export const POST = handler(
  schema,
  async (input, { userId }) => {
    const user = await transact((db) => {
      const user = db.user(userId!);
      if (!user) throw new UserError("Account not found.", 404);
      if (input.name) user.name = input.name;
      const { name: _name, ...measurements } = input;
      void _name;
      const profile = { ...user.profile } as Record<string, unknown>;
      for (const [key, value] of Object.entries(measurements)) {
        if (value === null) delete profile[key];
        else if (value !== undefined) profile[key] = value;
      }
      user.profile = profile;
      return user;
    });
    return json({ user: publicUser(user) });
  },
  { auth: true },
);
