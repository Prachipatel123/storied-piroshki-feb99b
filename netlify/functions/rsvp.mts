import type { Config } from "@netlify/functions";
import { desc, eq, isNotNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import { rsvps } from "../../db/schema.js";
import { phoneKey, validatePhone, validateRsvp, type RsvpInput } from "../../shared/rsvp.js";

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" ? v : Number.NaN);

/** Finds the most recent RSVP for a phone number, matching however the number was typed. */
async function findByPhone(phone: string) {
  const key = phoneKey(phone);
  const rows = await db
    .select({
      id: rsvps.id,
      name: rsvps.name,
      phone: rsvps.phone,
      attending: rsvps.attending,
      guestCount: rsvps.guestCount,
      adults: rsvps.adults,
      children: rsvps.children,
      attendeeNames: rsvps.attendeeNames,
      comments: rsvps.comments,
    })
    .from(rsvps)
    .where(isNotNull(rsvps.phone))
    .orderBy(desc(rsvps.createdAt));
  return rows.find((r) => phoneKey(r.phone ?? "") === key);
}

function readInput(body: Record<string, unknown>): RsvpInput {
  const attending = body.attending === true;
  return {
    name: str(body.name).trim(),
    phone: str(body.phone).trim(),
    attending,
    guestCount: attending ? num(body.guestCount) : 0,
    adults: attending ? num(body.adults) : 0,
    children: attending ? num(body.children) : 0,
    attendeeNames: attending ? str(body.attendeeNames).trim() : "",
    comments: str(body.comments).trim(),
  };
}

const toRow = (input: RsvpInput) => ({
  name: input.name,
  phone: input.phone,
  attending: input.attending,
  guestCount: input.guestCount,
  adults: input.adults,
  children: input.children,
  attendeeNames: input.attendeeNames || null,
  comments: input.comments || null,
});

const notFound = () =>
  Response.json(
    {
      error: "We couldn't find an RSVP for that phone number. Please check the number, or submit a new RSVP.",
      errors: { phone: "We couldn't find an RSVP for this number." },
    },
    { status: 404 },
  );

export default async (req: Request) => {
  const isLookup = new URL(req.url).pathname.endsWith("/lookup");
  const allowed = isLookup ? "POST" : "POST, PUT";
  if (!allowed.includes(req.method)) {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: allowed } });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // POST /api/rsvp/lookup: load an existing reply so the guest can change it.
  if (isLookup) {
    const phone = str(body.phone).trim();
    const phoneError = validatePhone(phone);
    if (phoneError) return Response.json({ error: phoneError, errors: { phone: phoneError } }, { status: 422 });
    const found = await findByPhone(phone);
    if (!found) return notFound();
    const { id: _id, ...rsvp } = found;
    return Response.json({ rsvp }, { headers: { "Cache-Control": "no-store" } });
  }

  const input = readInput(body);
  const errors = validateRsvp(input);
  if (Object.keys(errors).length > 0) {
    return Response.json({ error: "Please fix the highlighted fields.", errors }, { status: 422 });
  }

  const existing = await findByPhone(input.phone);

  // PUT /api/rsvp: change an existing reply.
  if (req.method === "PUT") {
    if (!existing) return notFound();
    await db.update(rsvps).set({ ...toRow(input), updatedAt: new Date() }).where(eq(rsvps.id, existing.id));
    return Response.json({ ok: true, updated: true, attending: input.attending });
  }

  // POST /api/rsvp: one reply per phone number.
  if (existing) {
    return Response.json(
      {
        error: "An RSVP has already been sent with this phone number.",
        code: "duplicate",
        errors: { phone: "An RSVP has already been sent with this phone number. You can change it instead." },
      },
      { status: 409 },
    );
  }

  await db.insert(rsvps).values(toRow(input));
  return Response.json({ ok: true, updated: false, attending: input.attending }, { status: 201 });
};

export const config: Config = {
  path: ["/api/rsvp", "/api/rsvp/lookup"],
};
