import { z } from "zod";
import { transact } from "@/lib/server/db";
import { handler, json } from "@/lib/server/http";

export const runtime = "nodejs";

export const POST = handler(
  z.object({}),
  async (_input, { userId }) => {
    await transact((db) => {
      for (const n of db.t.notifications) if (n.userId === userId) n.read = true;
    });
    return json({ ok: true });
  },
  { auth: true },
);
