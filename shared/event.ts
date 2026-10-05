/** Single source of truth for the event details shown on the page and in emails. */
export const EVENT = {
  hosts: "Nidhi & Yakin",
  venue: "North Dumfries Community Complex",
  address: "2958 Greenfield Rd, Ayr, ON N0B 1E0",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=North+Dumfries+Community+Complex,+2958+Greenfield+Rd,+Ayr,+ON+N0B+1E0",
  dateLabel: "Sunday, 15 November 2026",
  timeLabel: "10:00 AM onwards",
  rsvpDeadlineLabel: "19 October 2026",
  invitation:
    "Please join us to celebrate the upcoming arrival of our little one! Looking forward to welcoming you!",
} as const;

/** Largest party size offered in the guest-count dropdown. */
export const MAX_GUESTS = 10;
