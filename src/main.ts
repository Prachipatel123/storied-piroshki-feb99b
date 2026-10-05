import "./styles.css";
import { EVENT, MAX_GUESTS } from "../shared/event.js";
import { validateRsvp, type RsvpErrors, type RsvpInput } from "../shared/rsvp.js";

const NOT_ATTENDING = "none";
const FIELD_ORDER: (keyof RsvpInput)[] = [
  "name", "email", "phone", "guestCount", "adults", "children", "attendeeNames", "comments",
];
const FIELD_LABELS: Record<keyof RsvpInput, string> = {
  name: "Your name", email: "Email", phone: "Phone", attending: "Attendance", guestCount: "Number of guests",
  adults: "Adults", children: "Children", attendeeNames: "Names of attendees", comments: "Comments",
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const form = $<HTMLFormElement>("rsvp-form");
const formView = $<HTMLDivElement>("form-view");
const successView = $<HTMLDivElement>("success-view");
const guestCount = $<HTMLSelectElement>("guestCount");
const adults = $<HTMLSelectElement>("adults");
const children = $<HTMLSelectElement>("children");
const party = $<HTMLFieldSetElement>("party");
const tally = $<HTMLParagraphElement>("tally");
const email = $<HTMLInputElement>("email");
const summary = $<HTMLDivElement>("error-summary");
const submitError = $<HTMLParagraphElement>("submit-error");
const submitBtn = $<HTMLButtonElement>("submit");

let attempted = false;

function option(value: string, label: string) {
  const o = document.createElement("option");
  o.value = value;
  o.textContent = label;
  return o;
}

for (let n = 1; n <= MAX_GUESTS; n++) guestCount.append(option(String(n), `${n} guest${n === 1 ? "" : "s"}`));
guestCount.append(option(NOT_ATTENDING, "Sorry, I can't make it"));

/** Rebuilds an Adults/Children dropdown with 0…max, keeping the previous choice when still valid. */
function fillCount(select: HTMLSelectElement, max: number) {
  const prev = select.value;
  select.replaceChildren(option("", "Choose…"));
  for (let n = 0; n <= max; n++) select.append(option(String(n), String(n)));
  if (prev !== "" && Number(prev) <= max) select.value = prev;
}

function readForm(): RsvpInput {
  const data = new FormData(form);
  const s = (k: string) => String(data.get(k) ?? "");
  const count = guestCount.value;
  const attending = count !== NOT_ATTENDING;
  const toNum = (v: string) => (v === "" ? Number.NaN : Number(v));
  return {
    name: s("name").trim(),
    email: s("email").trim(),
    phone: s("phone").trim(),
    attending,
    guestCount: attending ? toNum(count) : 0,
    adults: attending ? toNum(adults.value) : 0,
    children: attending ? toNum(children.value) : 0,
    attendeeNames: attending ? s("attendeeNames").trim() : "",
    comments: s("comments").trim(),
  };
}

function updateTally() {
  const total = Number(guestCount.value);
  if (!total) return void (tally.textContent = "");
  const a = adults.value === "" ? null : Number(adults.value);
  const c = children.value === "" ? null : Number(children.value);
  tally.classList.remove("tally--ok", "tally--off");
  if (a === null || c === null) {
    tally.textContent = `Choose adults and children so they add up to ${total}.`;
    return;
  }
  const sum = a + c;
  if (sum === total) {
    tally.textContent = `✓ ${a} adult${a === 1 ? "" : "s"} + ${c} child${c === 1 ? "" : "ren"} = ${total} guest${total === 1 ? "" : "s"}`;
    tally.classList.add("tally--ok");
  } else {
    tally.textContent = `${a} + ${c} = ${sum}, which doesn't match ${total} guest${total === 1 ? "" : "s"}. Please adjust.`;
    tally.classList.add("tally--off");
  }
}

function onGuestCountChange() {
  const value = guestCount.value;
  const attending = value !== NOT_ATTENDING;
  const total = Number(value);

  party.hidden = !(attending && total > 0);
  if (!party.hidden) {
    fillCount(adults, total);
    fillCount(children, total);
  }

  // Email is only required for attending guests, since it's used for the confirmation.
  const emailRequired = value === "" || attending;
  email.required = emailRequired;
  email.setAttribute("aria-required", String(emailRequired));
  $("email-req").hidden = !emailRequired;
  $("email-opt").hidden = emailRequired;
  $("email-help").textContent = emailRequired
    ? "We'll email you a confirmation with the event details."
    : "Optional, in case we'd like to send you a note.";

  updateTally();
}

function showErrors(errors: RsvpErrors) {
  for (const key of FIELD_ORDER) {
    const el = document.getElementById(key) as HTMLInputElement | null;
    const msg = document.getElementById(`${key}-error`);
    if (!el || !msg) continue;
    const text = errors[key] ?? "";
    msg.textContent = text;
    if (text) el.setAttribute("aria-invalid", "true");
    else el.removeAttribute("aria-invalid");
  }
}

function showSummary(errors: RsvpErrors) {
  const list = summary.querySelector("ul")!;
  list.replaceChildren();
  for (const key of FIELD_ORDER) {
    const text = errors[key];
    if (!text) continue;
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = `#${key}`;
    a.textContent = `${FIELD_LABELS[key]}: ${text}`;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById(key)?.focus();
    });
    li.append(a);
    list.append(li);
  }
  summary.hidden = list.children.length === 0;
}

function revalidate() {
  if (!attempted) return;
  const errors = validateRsvp(readForm());
  showErrors(errors);
  if (!summary.hidden) showSummary(errors);
}

guestCount.addEventListener("change", () => { onGuestCountChange(); revalidate(); });
for (const sel of [adults, children]) sel.addEventListener("change", () => { updateTally(); revalidate(); });
form.addEventListener("input", revalidate);
// Validate individual fields as people leave them, so mistakes surface early but not while typing.
for (const id of ["name", "email", "phone"] as const) {
  $(id).addEventListener("blur", () => {
    const input = $<HTMLInputElement>(id);
    if (!input.value.trim() && !attempted) return;
    const err = validateRsvp(readForm())[id] ?? "";
    $(`${id}-error`).textContent = err;
    if (err) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  });
}

function setBusy(busy: boolean) {
  submitBtn.disabled = busy;
  submitBtn.classList.toggle("is-busy", busy);
  submitBtn.querySelector(".submit-label")!.textContent = busy ? "Sending your RSVP…" : "Submit RSVP";
  form.setAttribute("aria-busy", String(busy));
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  attempted = true;
  submitError.hidden = true;

  const input = readForm();
  const errors = validateRsvp(input);
  showErrors(errors);
  if (Object.keys(errors).length > 0) {
    showSummary(errors);
    summary.focus();
    return;
  }
  summary.hidden = true;

  setBusy(true);
  try {
    const res = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 422 && body.errors) {
      showErrors(body.errors);
      showSummary(body.errors);
      summary.focus();
      return;
    }
    if (!res.ok) throw new Error(body.error || "Request failed");
    showSuccess(input, Boolean(body.emailSent));
  } catch {
    submitError.textContent =
      "Oh no, we couldn't send your RSVP just now. Please check your connection and try again.";
    submitError.hidden = false;
  } finally {
    setBusy(false);
  }
});

function showSuccess(input: RsvpInput, emailSent: boolean) {
  const firstName = input.name.split(/\s+/)[0];
  const title = $("success-title");
  const message = $("success-message");
  if (input.attending) {
    title.textContent = `Yay, thank you ${firstName}! 🎉`;
    const partyLabel = `${input.guestCount} guest${input.guestCount === 1 ? "" : "s"}`;
    message.textContent = emailSent
      ? `Your RSVP for ${partyLabel} is confirmed. We've sent the details to ${input.email}. We can't wait to celebrate with you on ${EVENT.dateLabel}!`
      : `Your RSVP for ${partyLabel} is confirmed. We can't wait to celebrate with you on ${EVENT.dateLabel}, ${EVENT.timeLabel}, at ${EVENT.venue}!`;
  } else {
    title.textContent = `Thank you for letting us know, ${firstName}`;
    message.textContent = "We'll miss you at the shower, and we're so grateful for your love and good wishes. ♡";
  }
  formView.hidden = true;
  successView.hidden = false;
  successView.classList.add("pop");
  title.focus();
}

$("again").addEventListener("click", () => {
  form.reset();
  attempted = false;
  showErrors({});
  summary.hidden = true;
  onGuestCountChange();
  successView.hidden = true;
  formView.hidden = false;
  $("name").focus();
});

onGuestCountChange();
