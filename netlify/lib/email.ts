import { EVENT } from "../../shared/event.js";

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

interface ConfirmationDetails {
  name: string;
  email: string;
  guestCount: number;
  adults: number;
  children: number;
  attendeeNames: string;
}

/**
 * Sends the attendee a confirmation email through Resend (https://resend.com).
 * Requires RESEND_API_KEY and RSVP_FROM_EMAIL. Returns false (without throwing) when email
 * isn't configured or the provider rejects the message, so an RSVP is never lost over email.
 */
export async function sendConfirmationEmail(d: ConfirmationDetails): Promise<boolean> {
  const apiKey = Netlify.env.get("RESEND_API_KEY");
  const from = Netlify.env.get("RSVP_FROM_EMAIL");
  if (!apiKey || !from) {
    console.warn("Confirmation email skipped: RESEND_API_KEY or RSVP_FROM_EMAIL is not set.");
    return false;
  }
  const replyTo = Netlify.env.get("RSVP_REPLY_TO_EMAIL");

  const party = `${d.guestCount} guest${d.guestCount === 1 ? "" : "s"} (${d.adults} adult${d.adults === 1 ? "" : "s"}, ${d.children} child${d.children === 1 ? "" : "ren"})`;
  const names = d.attendeeNames.trim();

  const text = [
    `Hi ${d.name},`,
    "",
    `Thank you for your RSVP to ${EVENT.hosts}'s baby shower. We can't wait to celebrate with you!`,
    "",
    `Party: ${party}`,
    ...(names ? [`Attendees: ${names}`] : []),
    "",
    `Date: ${EVENT.dateLabel}`,
    `Time: ${EVENT.timeLabel}`,
    `Venue: ${EVENT.venue}, ${EVENT.address}`,
    `Map: ${EVENT.mapsUrl}`,
    "",
    "If anything changes, just reply to this email.",
    "",
    `With love, ${EVENT.hosts}`,
  ].join("\n");

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 16px 6px 0;color:#9a7a86;font-size:14px;vertical-align:top">${label}</td><td style="padding:6px 0;color:#4a3640;font-size:15px">${value}</td></tr>`;

  const html = `<!doctype html><html><body style="margin:0;background:#fdf6f0;font-family:Georgia,'Times New Roman',serif">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
<div style="background:#fff;border-radius:20px;padding:32px;border:1px solid #f3dfe4">
<p style="margin:0 0 4px;color:#c9849a;letter-spacing:2px;font-size:12px;text-transform:uppercase;font-family:Arial,sans-serif">You're on the list</p>
<h1 style="margin:0 0 16px;color:#4a3640;font-size:26px;font-weight:normal">See you at the baby shower, ${escapeHtml(d.name)}!</h1>
<p style="color:#6b5560;font-size:16px;line-height:1.6">Thank you for your RSVP. ${escapeHtml(EVENT.hosts)} can't wait to celebrate with you.</p>
<table style="border-collapse:collapse;margin:20px 0">
${row("Party", escapeHtml(party))}
${names ? row("Attendees", escapeHtml(names)) : ""}
${row("Date", escapeHtml(EVENT.dateLabel))}
${row("Time", escapeHtml(EVENT.timeLabel))}
${row("Venue", `<a href="${escapeHtml(EVENT.mapsUrl)}" style="color:#b0607a">${escapeHtml(EVENT.venue)}</a><br>${escapeHtml(EVENT.address)}`)}
</table>
<p style="color:#6b5560;font-size:15px;line-height:1.6">If anything changes, just reply to this email.</p>
<p style="color:#4a3640;font-size:16px;margin-top:24px">With love,<br>${escapeHtml(EVENT.hosts)}</p>
</div></div></body></html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [d.email],
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject: `You're confirmed for ${EVENT.hosts}'s baby shower 🍼`,
        text,
        html,
      }),
    });
    if (!res.ok) {
      console.error(`Confirmation email failed with status ${res.status}: ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Confirmation email failed:", err);
    return false;
  }
}
