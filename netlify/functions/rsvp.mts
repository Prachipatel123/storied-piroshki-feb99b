import type { Config } from "@netlify/functions";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { rsvps } from "../../db/schema.js";
import { validateRsvp, type RsvpInput } from "../../shared/rsvp.js";
import { sendConfirmationEmail } from "../lib/email.js";

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" ? v : Number.NaN);

export default async (req: Request) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const attending = body.attending === true;
  const input: RsvpInput = {
    name: str(body.name).trim(),
    email: str(body.email).trim(),
    phone: str(body.phone).trim(),
    attending,
    guestCount: attending ? num(body.guestCount) : 0,
    adults: attending ? num(body.adults) : 0,
    children: attending ? num(body.children) : 0,
    attendeeNames: attending ? str(body.attendeeNames).trim() : "",
    comments: str(body.comments).trim(),
  };

  const errors = validateRsvp(input);
  if (Object.keys(errors).length > 0) {
    return Response.json({ error: "Please fix the highlighted fields.", errors }, { status: 422 });
  }

  const [saved] = await db
    .insert(rsvps)
    .values({
      name: input.name,
      email: input.email || null,
      phone: input.phone || null,
      attending: input.attending,
      guestCount: input.guestCount,
      adults: input.adults,
      children: input.children,
      attendeeNames: input.attendeeNames || null,
      comments: input.comments || null,
    })
    .returning({ id: rsvps.id });

  let emailSent = false;
  if (input.attending && input.email) {
    emailSent = await sendConfirmationEmail({ ...input });
    if (emailSent) await db.update(rsvps).set({ emailSent: true }).where(eq(rsvps.id, saved.id));
  }

  return Response.json({ ok: true, attending: input.attending, emailSent }, { status: 201 });
};

export const config: Config = {
  path: "/api/rsvp",
};
