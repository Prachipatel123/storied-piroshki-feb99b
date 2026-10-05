import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const rsvps = pgTable("rsvps", {
  id: serial().primaryKey(),
  name: text().notNull(),
  email: text(),
  phone: text(),
  attending: boolean().notNull(),
  guestCount: integer("guest_count").notNull().default(0),
  adults: integer().notNull().default(0),
  children: integer().notNull().default(0),
  attendeeNames: text("attendee_names"),
  comments: text(),
  emailSent: boolean("email_sent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Rsvp = typeof rsvps.$inferSelect;
export type NewRsvp = typeof rsvps.$inferInsert;
