import { MAX_GUESTS } from "./event.js";

export interface RsvpInput {
  name: string;
  email: string;
  phone: string;
  attending: boolean;
  guestCount: number;
  adults: number;
  children: number;
  attendeeNames: string;
  comments: string;
}

export type RsvpErrors = Partial<Record<keyof RsvpInput, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+()\d\s.-]{7,20}$/;

export const LIMITS = { name: 120, email: 200, phone: 30, attendeeNames: 1000, comments: 2000 };

const isInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

/**
 * Validates an RSVP. Shared by the browser form and the API so both enforce the same rules,
 * most importantly that adults + children always equals the selected guest count.
 */
export function validateRsvp(input: RsvpInput): RsvpErrors {
  const errors: RsvpErrors = {};
  const name = input.name.trim();
  const email = input.email.trim();
  const phone = input.phone.trim();

  if (!name) errors.name = "Please tell us your name.";
  else if (name.length > LIMITS.name) errors.name = `Please keep your name under ${LIMITS.name} characters.`;

  if (input.attending && !email) {
    errors.email = "Please add your email so we can send your confirmation.";
  } else if (email && (!EMAIL_RE.test(email) || email.length > LIMITS.email)) {
    errors.email = "That email address doesn't look quite right (e.g. name@example.com).";
  }

  if (phone && !PHONE_RE.test(phone)) {
    errors.phone = "Please use digits only, optionally with +, spaces, dashes or brackets.";
  }

  if (input.attending) {
    if (!isInt(input.guestCount) || input.guestCount < 1 || input.guestCount > MAX_GUESTS) {
      errors.guestCount = "Please choose how many guests will attend.";
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
