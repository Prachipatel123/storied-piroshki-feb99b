import { MAX_GUESTS } from "./event.js";

export interface RsvpInput {
  name: string;
  phone: string;
  attending: boolean;
  guestCount: number;
  adults: number;
  children: number;
  attendeeNames: string;
  comments: string;
}

export type RsvpErrors = Partial<Record<keyof RsvpInput, string>>;

const PHONE_RE = /^[+()\d\s.-]{7,20}$/;

export const LIMITS = { name: 120, phone: 30, attendeeNames: 1000, comments: 2000 };

/**
 * Normalises a phone number so the same number always matches, however it was typed:
 * digits only, with a leading North American country code "1" dropped.
 * "+1 (519) 555-0123", "519.555.0123" and "5195550123" all become "5195550123".
 */
export function phoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

/** Phone is required because it's how we recognise a guest who has already replied. */
export function validatePhone(phone: string): string | undefined {
  if (!phone.trim()) return "Please add your phone number. We use it to find your RSVP if you need to change it.";
  if (!PHONE_RE.test(phone.trim()) || phoneKey(phone).length < 7) {
    return "Please use digits only, optionally with +, spaces, dashes or brackets.";
  }
  return undefined;
}

const isInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

/**
 * Validates an RSVP. Shared by the browser form and the API so both enforce the same rules,
 * most importantly that adults + children always equals the selected guest count.
 */
export function validateRsvp(input: RsvpInput): RsvpErrors {
  const errors: RsvpErrors = {};
  const name = input.name.trim();
  const phone = input.phone.trim();

  if (!name) errors.name = "Please tell us your name.";
  else if (name.length > LIMITS.name) errors.name = `Please keep your name under ${LIMITS.name} characters.`;

  const phoneError = validatePhone(phone);
  if (phoneError) errors.phone = phoneError;

  if (input.attending) {
    if (!isInt(input.guestCount) || input.guestCount < 1 || input.guestCount > MAX_GUESTS) {
      errors.guestCount = `Please add at least one guest, up to ${MAX_GUESTS} in total.`;
    } else if (!isInt(input.adults) || input.adults < 0 || input.adults > input.guestCount) {
      errors.adults = "Please choose the number of adults.";
    } else if (!isInt(input.children) || input.children < 0 || input.children > input.guestCount) {
      errors.children = "Please choose the number of children.";
    } else if (input.adults + input.children !== input.guestCount) {
      const sum = input.adults + input.children;
      errors.children = `Adults (${input.adults}) + children (${input.children}) = ${sum}, but you selected ${input.guestCount} guest${input.guestCount === 1 ? "" : "s"}. Please adjust so they add up.`;
    }
  }

  if (input.attendeeNames.length > LIMITS.attendeeNames) {
    errors.attendeeNames = `Please keep names under ${LIMITS.attendeeNames} characters.`;
  }
  if (input.comments.length > LIMITS.comments) {
    errors.comments = `Please keep comments under ${LIMITS.comments} characters.`;
  }

  return errors;
}
