import type { Config } from "@netlify/functions";
import { createHash, timingSafeEqual } from "node:crypto";
import { desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { rsvps } from "../../db/schema.js";

const digest = (s: string) => createHash("sha256").update(s).digest();

export default async (req: Request) => {
  if (req.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  const expected = Netlify.env.get("HOST_PASSWORD");
  if (!expected) {
    return Response.json(
      { error: "The host page isn't set up yet. Add a HOST_PASSWORD environment variable in Netlify and redeploy." },
      { status: 503 },
    );
  }

  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Compare fixed-length hashes so the check takes the same time regardless of input.
  if (!provided || !timingSafeEqual(digest(provided), digest(expected))) {
    return Response.json({ error: "That password isn't right. Please try again." }, { status: 401 });
  }

  const rows = await db.select().from(rsvps).orderBy(desc(rsvps.createdAt));
  return Response.json({ rsvps: rows }, { headers: { "Cache-Control": "no-store" } });
};

export const config: Config = {
  path: "/api/host/rsvps",
};
