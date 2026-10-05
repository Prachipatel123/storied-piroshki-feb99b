# Nidhi & Yakin's Baby Shower — Invitation & RSVP

A one-page invitation for Nidhi and Yakin's baby shower (Sunday, 15 November 2026, 10:00 AM onwards, North Dumfries Community Complex, Ayr, ON) with a working RSVP form, plus a private host dashboard.

## Features

- **Invitation page (`/`)**: event details, a Google Maps link to the venue, and the RSVP deadline (19 October 2026).
- **RSVP form**: name and email (required when attending), optional phone, a guest-count dropdown (1–10 or "Sorry, I can't make it"), Adults/Children dropdowns that must add up to the guest count, optional attendee names, and optional comments. The same rules are checked in the browser and on the server.
- **Confirmation email**: attending guests get an email with the event details (sent through [Resend](https://resend.com)).
- **Host dashboard (`/host`)**: password-protected list of every RSVP with totals (guests, adults, children, declines) and CSV export.

## Tech

- Vite + TypeScript (no framework) for the static pages
- Netlify Functions for the API (`/api/rsvp`, `/api/host/rsvps`)
- Netlify Database (managed Postgres) with Drizzle ORM
- Resend HTTP API for confirmation emails

## Environment variables

Set these in **Netlify → Project configuration → Environment variables**, then redeploy:

| Variable | Required | Purpose |
| --- | --- | --- |
| `HOST_PASSWORD` | Yes, for `/host` | Password for the host dashboard. Until it's set, `/host` explains that it isn't configured yet. |
| `RESEND_API_KEY` | Yes, for emails | API key from resend.com. |
| `RSVP_FROM_EMAIL` | Yes, for emails | Sender, e.g. `Nidhi & Yakin <rsvp@yourdomain.com>`. The domain must be verified in Resend. |
| `RSVP_REPLY_TO_EMAIL` | No | Where guest replies to the confirmation email go. |

If the email variables are missing or sending fails, the RSVP is still saved. The guest sees a confirmation on screen, and the host dashboard marks the confirmation email as "not sent".

## Run locally

```bash
npm install
npm run dev        # netlify dev: serves the site, functions and the database locally
```

## Database changes

Edit `db/schema.ts`, then run `npx drizzle-kit generate --name <what_changed>`. Migrations in `netlify/database/migrations/` are applied automatically on deploy.
