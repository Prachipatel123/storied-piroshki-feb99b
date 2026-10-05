# Nidhi & Yakin's Baby Shower — Invitation & RSVP

A one-page invitation for Nidhi and Yakin's baby shower (Sunday, 15 November 2026, 10:00 AM onwards, North Dumfries Community Complex, Ayr, ON) with a working RSVP form, plus a private host dashboard.

## Features

- **Invitation page (`/`)**: event details, a Google Maps link to the venue, and the RSVP deadline (19 October 2026).
- **RSVP form**: name, phone number (required, one RSVP per number), a "Yes, I'll be there!" / "Sorry, I can't make it" choice, plus/minus steppers for adults and children (up to 10 guests in total), optional attendee names, and optional comments. The same rules are checked in the browser and on the server.
- **Changing an RSVP**: guests who have already replied can look up their RSVP by phone number and update it.
- **Host dashboard (`/host`)**: password-protected list of every RSVP with totals (guests, adults, children, declines) and CSV export.

## Tech

- Vite + TypeScript (no framework) for the static pages
- Netlify Functions for the API (`/api/rsvp`, `/api/host/rsvps`)
- Netlify Database (managed Postgres) with Drizzle ORM

## Environment variables

Set these in **Netlify → Project configuration → Environment variables**, then redeploy:

| Variable | Required | Purpose |
| --- | --- | --- |
| `HOST_PASSWORD` | Yes, for `/host` | Password for the host dashboard. Until it's set, `/host` explains that it isn't configured yet. |


## Run locally

```bash
npm install
npm run dev        # netlify dev: serves the site, functions and the database locally
```

## Database changes

Edit `db/schema.ts`, then run `npx drizzle-kit generate --name <what_changed>`. Migrations in `netlify/database/migrations/` are applied automatically on deploy.
