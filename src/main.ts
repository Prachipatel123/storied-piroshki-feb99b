import "./styles.css";
import { EVENT, MAX_GUESTS } from "../shared/event.js";
import { validatePhone, validateRsvp, type RsvpErrors, type RsvpInput } from "../shared/rsvp.js";

const FIELD_ORDER: (keyof RsvpInput)[] = [
  "name", "phone", "attending", "adults", "children", "guestCount", "attendeeNames", "comments",
];
/** Where to send focus for errors that don't belong to a single input. */
const FOCUS_TARGET: Partial<Record<keyof RsvpInput, string>> = { attending: "attending-yes", guestCount: "adults" };
const FIELD_LABELS: Record<keyof RsvpInput, string> = {
  name: "Your name", phone: "Phone number", attending: "Attendance", guestCount: "Number of guests",
  adults: "Adults", children: "Children", attendeeNames: "Names of attendees", comments: "Comments",
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const form = $<HTMLFormElement>("rsvp-form");
const formView = $<HTMLDivElement>("form-view");
const successView = $<HTMLDivElement>("success-view");
const adults = $<HTMLInputElement>("adults");
const children = $<HTMLInputElement>("children");
const party = $<HTMLFieldSetElement>("party");
const tally = $<HTMLParagraphElement>("tally");
const phone = $<HTMLInputElement>("phone");
const summary = $<HTMLDivElement>("error-summary");
const submitError = $<HTMLDivElement>("submit-error");
const submitErrorText = $<HTMLParagraphElement>("submit-error-text");
const duplicateChange = $<HTMLButtonElement>("duplicate-change");
const submitBtn = $<HTMLButtonElement>("submit");
const changeOpen = $<HTMLButtonElement>("change-open");
const changeIntro = $<HTMLParagraphElement>("change-intro");
const lookupForm = $<HTMLFormElement>("lookup-form");
const lookupPhone = $<HTMLInputElement>("lookupPhone");
const lookupError = $<HTMLParagraphElement>("lookupPhone-error");
const lookupBtn = $<HTMLButtonElement>("lookup-submit");
const editingBanner = $<HTMLDivElement>("editing-banner");

let attempted = false;
/** True while the guest is changing a reply they already sent (saved with PUT instead of POST). */
let editing = false;
/** Phone number of the last saved reply, so the success screen can offer to change it. */
let lastPhone = "";

const attendingChoice = () =>
  (form.querySelector<HTMLInputElement>('input[name="attending"]:checked')?.value ?? "") as "yes" | "no" | "";

/** Reads a stepper's number, treating anything unusable as 0. */
const count = (input: HTMLInputElement) => {
  const n = Number.parseInt(input.value, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

function readForm(): RsvpInput {
  const data = new FormData(form);
  const s = (k: string) => String(data.get(k) ?? "");
  const attending = attendingChoice() === "yes";
  const a = attending ? count(adults) : 0;
  const c = attending ? count(children) : 0;
  return {
    name: s("name").trim(),
    phone: s("phone").trim(),
    attending,
    guestCount: a + c,
    adults: a,
    children: c,
    attendeeNames: attending ? s("attendeeNames").trim() : "",
    comments: s("comments").trim(),
  };
}

/** Shared validation, plus the one check only the form needs: that an attendance choice was made. */
function validateForm(): RsvpErrors {
  const errors = validateRsvp(readForm());
  if (!attendingChoice()) errors.attending = "Please let us know whether you can make it.";
  return errors;
}

/** Keeps each stepper within 0 and the room left under MAX_GUESTS, and updates the +/− buttons. */
function syncSteppers() {
  for (const input of [adults, children]) {
    const other = input === adults ? children : adults;
    const max = MAX_GUESTS - count(other);
    const value = Math.min(count(input), max);
    if (input.value !== String(value)) input.value = String(value);
    input.max = String(max);
  }
  const total = count(adults) + count(children);
  for (const btn of form.querySelectorAll<HTMLButtonElement>(".step")) {
    const value = count($<HTMLInputElement>(btn.dataset.target!));
    btn.disabled = Number(btn.dataset.delta) < 0 ? value <= 0 : total >= MAX_GUESTS;
  }
  updateTally();
}

function updateTally() {
  const a = count(adults);
  const c = count(children);
  const total = a + c;
  tally.classList.toggle("tally--ok", total > 0);
  tally.textContent = total
    ? `${total} guest${total === 1 ? "" : "s"} in total: ${a} adult${a === 1 ? "" : "s"} + ${c} child${c === 1 ? "" : "ren"}`
    : "Please add at least one guest.";
  if (total >= MAX_GUESTS) tally.textContent += ` (up to ${MAX_GUESTS} per RSVP)`;
}

function onAttendingChange() {
  party.hidden = attendingChoice() !== "yes";
  syncSteppers();
}

function showErrors(errors: RsvpErrors) {
  for (const key of FIELD_ORDER) {
    const el = document.getElementById(FOCUS_TARGET[key] ?? key) as HTMLInputElement | null;
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
      document.getElementById(FOCUS_TARGET[key] ?? key)?.focus();
    });
    li.append(a);
    list.append(li);
  }
  summary.hidden = list.children.length === 0;
}

function revalidate() {
  if (!attempted) return;
  const errors = validateForm();
  showErrors(errors);
  if (!summary.hidden) showSummary(errors);
}

for (const radio of form.querySelectorAll('input[name="attending"]')) {
  radio.addEventListener("change", () => { onAttendingChange(); revalidate(); });
}
for (const btn of form.querySelectorAll<HTMLButtonElement>(".step")) {
  btn.addEventListener("click", () => {
    const input = $<HTMLInputElement>(btn.dataset.target!);
    input.value = String(count(input) + Number(btn.dataset.delta));
    syncSteppers();
    revalidate();
    // Keep focus usable when a button becomes disabled at 0 or at the guest limit.
    if (btn.disabled) input.focus();
  });
}
for (const input of [adults, children]) input.addEventListener("input", syncSteppers);
form.addEventListener("input", revalidate);
// Validate individual fields as people leave them, so mistakes surface early but not while typing.
for (const id of ["name", "phone"] as const) {
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
  submitBtn.querySelector(".submit-label")!.textContent = busy
    ? (editing ? "Saving your changes…" : "Sending your RSVP…")
    : (editing ? "Save changes" : "Submit RSVP");
  form.setAttribute("aria-busy", String(busy));
}

function showSubmitError(text: string, offerChange = false) {
  submitErrorText.textContent = text;
  duplicateChange.hidden = !offerChange;
  submitError.hidden = false;
}

/** Switches the form between "new RSVP" and "changing an existing RSVP". */
function setEditing(on: boolean) {
  editing = on;
  editingBanner.hidden = !on;
  changeIntro.hidden = on;
  lookupForm.hidden = true;
  changeOpen.setAttribute("aria-expanded", "false");
  // The phone number identifies the reply being changed, so it can't be edited here.
  phone.readOnly = on;
  $("phone-help").textContent = on
    ? "This is the number your RSVP is saved under."
    : "We use this to find your RSVP if you need to change it later, and to reach you on the day.";
  $("rsvp-title").textContent = on ? "Change your RSVP" : "Will you celebrate with us?";
  setBusy(false);
}

function resetForm() {
  form.reset();
  attempted = false;
  showErrors({});
  summary.hidden = true;
  submitError.hidden = true;
  onAttendingChange();
}

interface SavedRsvp {
  name: string;
  phone: string;
  attending: boolean;
  guestCount: number;
  adults: number;
  children: number;
  attendeeNames: string | null;
  comments: string | null;
}

function fillForm(r: SavedRsvp) {
  resetForm();
  $<HTMLInputElement>("name").value = r.name;
  phone.value = r.phone;
  $<HTMLInputElement>(r.attending ? "attending-yes" : "attending-no").checked = true;
  if (r.attending) {
    adults.value = String(r.adults);
    children.value = String(r.children);
    $<HTMLTextAreaElement>("attendeeNames").value = r.attendeeNames ?? "";
  }
  $<HTMLTextAreaElement>("comments").value = r.comments ?? "";
  onAttendingChange();
}

/** Loads a saved reply by phone number into the form. Returns an error message, or "" on success. */
async function loadForEdit(number: string): Promise<string> {
  const err = validatePhone(number);
  if (err) return err;
  try {
    const res = await fetch("/api/rsvp/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: number }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 404) return "We couldn't find an RSVP for that number. Please check it, or fill in the form below to RSVP.";
    if (!res.ok) return body.error || "Something went wrong. Please try again.";
    fillForm(body.rsvp);
    setEditing(true);
    successView.hidden = true;
    formView.hidden = false;
    $("rsvp").scrollIntoView({ block: "start" });
    $("name").focus();
    return "";
  } catch {
    return "We couldn't reach the server just now. Please check your connection and try again.";
  }
}

changeOpen.addEventListener("click", () => {
  const open = lookupForm.hidden;
  lookupForm.hidden = !open;
  changeOpen.setAttribute("aria-expanded", String(open));
  if (open) {
    if (!lookupPhone.value && phone.value) lookupPhone.value = phone.value;
    lookupPhone.focus();
  }
});

lookupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  lookupBtn.disabled = true;
  lookupBtn.textContent = "Finding…";
  const err = await loadForEdit(lookupPhone.value.trim());
  lookupBtn.disabled = false;
  lookupBtn.textContent = "Find my RSVP";
  lookupError.textContent = err;
  if (err) {
    lookupPhone.setAttribute("aria-invalid", "true");
    lookupPhone.focus();
  } else {
    lookupPhone.removeAttribute("aria-invalid");
    lookupPhone.value = "";
  }
});

duplicateChange.addEventListener("click", async () => {
  duplicateChange.disabled = true;
  const err = await loadForEdit(phone.value.trim());
  duplicateChange.disabled = false;
  if (err) showSubmitError(err);
});

$("edit-cancel").addEventListener("click", () => {
  resetForm();
  setEditing(false);
  $("name").focus();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  attempted = true;
  submitError.hidden = true;

  const input = readForm();
  const errors = validateForm();
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
      method: editing ? "PUT" : "POST",
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
    if (res.status === 409 && body.code === "duplicate") {
      showErrors(body.errors ?? {});
      showSubmitError(
        "Looks like you've already sent an RSVP with this phone number. Would you like to change it instead?",
        true,
      );
      duplicateChange.focus();
      return;
    }
    if (res.status === 404 && editing) {
      showSubmitError("We couldn't find your earlier RSVP any more. Please cancel and submit a new RSVP.");
      return;
    }
    if (!res.ok) throw new Error(body.error || "Request failed");
    showSuccess(input, editing);
  } catch {
    showSubmitError("Oh no, we couldn't send your RSVP just now. Please check your connection and try again.");
  } finally {
    setBusy(false);
  }
});

function showSuccess(input: RsvpInput, updated: boolean) {
  lastPhone = input.phone;
  const firstName = input.name.split(/\s+/)[0];
  const title = $("success-title");
  const message = $("success-message");
  if (input.attending) {
    title.textContent = updated ? `All updated, ${firstName}!` : `Yay, thank you ${firstName}!`;
    const partyLabel = `${input.guestCount} guest${input.guestCount === 1 ? "" : "s"}`;
    message.textContent = `Your RSVP for ${partyLabel} is ${updated ? "updated" : "confirmed"}. We can't wait to celebrate with you on ${EVENT.dateLabel}, ${EVENT.timeLabel}, at ${EVENT.venue}!`;
  } else {
    title.textContent = updated ? `Your RSVP is updated, ${firstName}` : `Thank you for letting us know, ${firstName}`;
    message.textContent = "We'll miss you at the shower, and we're so grateful for your love and good wishes. ♡";
  }
  formView.hidden = true;
  successView.hidden = false;
  successView.classList.add("pop");
  title.focus();
}

$("change-this").addEventListener("click", async () => {
  const btn = $<HTMLButtonElement>("change-this");
  btn.disabled = true;
  const err = await loadForEdit(lastPhone);
  btn.disabled = false;
  if (err) {
    $("success-message").textContent = err;
    btn.focus();
  }
});

$("again").addEventListener("click", () => {
  resetForm();
  setEditing(false);
  successView.hidden = true;
  formView.hidden = false;
  $("name").focus();
});

onAttendingChange();
