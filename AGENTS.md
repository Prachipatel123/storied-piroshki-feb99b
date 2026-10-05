# AGENTS.md

## What this is
A single-event baby shower invitation + RSVP site for Nidhi & Yakin. Static pages built with Vite (vanilla TypeScript), an API built on Netlify Functions, and storage in Netlify Database through Drizzle ORM.

## Layout
- `index.html`, `src/main.ts`, `src/styles.css`: the invitation page and RSVP form behaviour (attendance choice, adults/children +/− steppers with a live total, look-up-and-change flow, inline errors, error summary, success state).
- `host.html`, `src/host.ts`, `src/host.css`: the password-protected host dashboard (stats, table, CSV export). The password lives in `sessionStorage` and is sent as `Authorization: Bearer …`.
- `shared/event.ts`: event details and `MAX_GUESTS`, used by the frontend success message. `shared/rsvp.ts`: `validateRsvp`, the **single validation source** used by both the browser and `/api/rsvp`.
- `netlify/functions/rsvp.mts`: `POST /api/rsvp` (new reply, 409 if the phone number already has one), `PUT /api/rsvp` (change the reply for that phone number), `POST /api/rsvp/lookup` (load a reply by phone number).
- `netlify/functions/host-rsvps.mts`: `GET /api/host/rsvps`. Checks the password against `HOST_PASSWORD` with a timing-safe comparison.
- `db/schema.ts`: the `rsvps` table. Migrations go in `netlify/database/migrations/` (generated with `drizzle-kit generate --name …`, never hand-edited, never applied manually).

## Conventions & decisions
- Event details are written statically in `index.html` (so they work without JS and are SEO-friendly) **and** in `shared/event.ts`. Keep the two in sync.
- The venue is "North Dumfries Community Complex" (the brief spelled it "Dumfried"). The Maps link searches the full address.
- "Sorry, I can't make it" is stored as `attending=false` with all counts at 0. There is no email field (no sending domain); phone is required and identifies the guest, matched via `phoneKey` in `shared/rsvp.ts`.
- Adults/Children use +/− steppers (defaults 1 adult, 0 children). The browser sends `guestCount = adults + children`; the server still checks `adults + children === guestCount` and 1–`MAX_GUESTS`. Children-only parties are allowed.
- One RSVP per phone number; guests change it instead of re-submitting (`updated_at` records the last change). Submissions are not blocked after the deadline.
- Import paths use `.js` extensions (ESM). Install drizzle with the `@beta` tag.
- Respect `prefers-reduced-motion` and keep every control keyboard-reachable with visible focus.
