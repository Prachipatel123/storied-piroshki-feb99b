# AGENTS.md

## What this is
A single-event baby shower invitation + RSVP site for Nidhi & Yakin. Static pages built with Vite (vanilla TypeScript), an API built on Netlify Functions, and storage in Netlify Database through Drizzle ORM.

## Layout
- `index.html`, `src/main.ts`, `src/styles.css`: the invitation page and RSVP form behaviour (guest-count reveal, live adults/children tally, inline errors, error summary, success state).
- `host.html`, `src/host.ts`, `src/host.css`: the password-protected host dashboard (stats, table, CSV export). The password lives in `sessionStorage` and is sent as `Authorization: Bearer …`.
- `shared/event.ts`: event details and `MAX_GUESTS`, used by the frontend success message and the email. `shared/rsvp.ts`: `validateRsvp`, the **single validation source** used by both the browser and `/api/rsvp`.
- `netlify/functions/rsvp.mts`: `POST /api/rsvp`. Validates, inserts, then sends the confirmation email if attending.
- `netlify/functions/host-rsvps.mts`: `GET /api/host/rsvps`. Checks the password against `HOST_PASSWORD` with a timing-safe comparison.
- `netlify/lib/email.ts`: Resend email (plain text + HTML). Never throws; returns `false` when it isn't configured or fails.
- `db/schema.ts`: the `rsvps` table. Migrations go in `netlify/database/migrations/` (generated with `drizzle-kit generate --name …`, never hand-edited, never applied manually).

## Conventions & decisions
- Event details are written statically in `index.html` (so they work without JS and are SEO-friendly) **and** in `shared/event.ts`. Keep the two in sync.
- The venue is "North Dumfries Community Complex" (the brief spelled it "Dumfried"). The Maps link searches the full address.
- "Sorry, I can't make it" is stored as `attending=false` with all counts at 0. Email is required only when attending.
- Adults/Children dropdowns have no default, so guests choose both on purpose. The rule is `adults + children === guestCount`; children-only parties are allowed.
- RSVPs are append-only. Duplicate replies are possible, and the host can see them all. Submissions are not blocked after the deadline.
- Import paths use `.js` extensions (ESM). Install drizzle with the `@beta` tag.
- Respect `prefers-reduced-motion` and keep every control keyboard-reachable with visible focus.
