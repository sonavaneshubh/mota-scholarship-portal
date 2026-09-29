/**
 * Registration rules the browser and the server both apply.
 *
 * The browser applies them to show an inline error before a round trip. That is
 * a convenience, not a control: `supabase/functions/_shared/registration.ts`
 * applies the same rules to whatever actually arrived, and `registration-start`
 * rejects the request if they disagree. The numbers in `REGISTRATION_LIMITS`
 * and the `MOBILE_REQUIRED` flag are the same on both sides too, and
 * `scripts/registration-otp.test.mjs` fails if the two files ever drift, so this
 * one and that one are edited together.
 *
 * The email is the only proof registration always requires. The mobile number is
 * optional: leave it blank and the account is created once the email code is
 * accepted. Give one, and it is verified like it always was.
 */

/**
 * Digit count of the codes Supabase Auth sends for both email and SMS.
 *
 * `8`, matching what this project's Supabase Auth actually issues. Verified
 * against a real "Confirm signup" mail: the code rendered by the
 * `{{ .Token }}` template was eight digits. The number of boxes, `maxLength`,
 * the paste spread and the submit gate all read this one constant, so a future
 * change to the Auth setting is a one-line edit here plus the mirrored copy in
 * `supabase/functions/_shared/registration.ts`.
 *
 * The token is never padded, trimmed or sliced on its way to
 * `auth.verifyOtp`; whatever the applicant typed, in full, is what gets sent.
 */
export const OTP_LENGTH = 8;

/** Wait before another code may be requested, per channel. */
export const RESEND_COOLDOWN_SECONDS = 45;

/** Codes an applicant may request per channel within one attempt. */
export const MAX_RESENDS_PER_CHANNEL = 5;

/** Wrong codes an applicant may enter per channel within one attempt. */
export const MAX_VERIFY_FAILURES_PER_CHANNEL = 5;

/** How long a half-finished registration stays open. */
export const ATTEMPT_TTL_MINUTES = 15;

export const REGISTRATION_LIMITS = {
  OTP_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  MAX_RESENDS_PER_CHANNEL,
  MAX_VERIFY_FAILURES_PER_CHANNEL,
  ATTEMPT_TTL_MINUTES,
} as const;

/**
 * Whether an applicant has to give a mobile number in order to register.
 *
 * `false`, so the form may leave the field blank and the account is created on
 * the email verification alone. Mirrored from
 * `supabase/functions/_shared/registration.ts`; `scripts/registration-otp.test.mjs`
 * fails if the two copies disagree, so they are edited together.
 *
 * This decides whether a number is *demanded*, never whether one is *checked*:
 * a number that is given is still verified by a code sent to it.
 */
export const MOBILE_REQUIRED = false;

/**
 * Dialling code assumed when the applicant types a bare ten-digit number.
 * The portal is operated for Indian applicants and the profile form already
 * validates this field the same way, so registration agrees with it rather than
 * introducing a third opinion.
 */
export const DEFAULT_COUNTRY_CODE = '91';

export const PASSWORD_MIN_LENGTH = 10;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9._]{3,31}$/;
const E164_PATTERN = /^\+[1-9][0-9]{9,14}$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Turns applicant-typed mobile input into E.164, or an empty string when it
 * cannot be read as a number at all.
 *
 * Accepts `9876543210`, `+91 98765 43210`, `(98765) 43210`, `919876543210`.
 * Accepting a bare number is what lets the common case stay a bare number on
 * the form while still being stored in the one shape GoTrue requires.
 */
export function normalizeMobile(value: string): string {
  const compact = value.trim().replace(/[\s()\-.]/g, '');

  if (!/^\+?[0-9]+$/.test(compact)) {
    return '';
  }

  const digits = compact.startsWith('+') ? compact.slice(1) : compact;

  if (compact.startsWith('+')) {
    return E164_PATTERN.test(compact) ? compact : '';
  }

  if (digits.length === 10) {
    return `+${DEFAULT_COUNTRY_CODE}${digits}`;
  }

  if (digits.length > 10 && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    return `+${digits}`;
  }

  return '';
}

export function isValidEmail(email: string): boolean {
  const value = normalizeEmail(email);
  return value.length > 3 && value.length <= 254 && EMAIL_PATTERN.test(value);
}

export function isValidMobile(mobile: string): boolean {
  return E164_PATTERN.test(normalizeMobile(mobile));
}

export function isValidPassword(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= 200 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9\s]/.test(password)
  );
}

export function isValidName(name: string): boolean {
  const value = name.trim().replace(/\s+/g, ' ');
  return value.length >= 2 && value.length <= 80;
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username.trim());
}

export function isValidOtp(value: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(value.trim());
}

export interface RegistrationFieldErrors {
  applicantName?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
  email?: string;
  mobile?: string;
  captcha?: string;
}

export function getRegistrationErrors(values: {
  applicantName: string;
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  mobile: string;
}): RegistrationFieldErrors {
  const errors: RegistrationFieldErrors = {};
  const name = values.applicantName.trim().replace(/\s+/g, ' ');

  if (!name) {
    errors.applicantName = 'Enter the applicant name.';
  } else if (name.length < 2) {
    errors.applicantName = 'Enter the full applicant name.';
  } else if (name.length > 80) {
    errors.applicantName = 'Enter an applicant name within 80 characters.';
  }

  if (values.username.trim()) {
    if (!isValidUsername(values.username)) {
      errors.username = 'Use 4-32 characters, start with a letter, and include only letters, numbers, dots, or underscores.';
    }
  } else {
    errors.username = 'Enter a username.';
  }

  if (!values.password) {
    errors.password = 'Enter a password.';
  } else if (!isValidPassword(values.password)) {
    errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters with uppercase, lowercase, number, and symbol.`;
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Confirm the password.';
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (!values.email.trim()) {
    errors.email = 'Enter your email address.';
  } else if (!isValidEmail(values.email)) {
    errors.email = 'Enter a valid Email ID.';
  }

  // The mobile number is optional. Leaving it blank registers the applicant on
  // the email proof alone. Typing something is a promise that the number is
  // theirs, so whatever is typed has to be a usable number -- a half-typed value
  // is an error rather than something to quietly drop, which would attach a
  // different number (or none) to the account than the applicant intended.
  if (MOBILE_REQUIRED && !values.mobile.trim()) {
    errors.mobile = 'Enter your mobile number. We will send a verification code to it.';
  } else if (values.mobile.trim() && !isValidMobile(values.mobile)) {
    errors.mobile = 'Enter a 10-digit mobile number, or the full number with its country code.';
  }

  return errors;
}

/** `"u***@example.com"` and `"+91 ******1234"`, for the "we sent it to" line. */
export function maskEmail(email: string): string {
  const value = normalizeEmail(email);
  const [local = '', domain = ''] = value.split('@');

  if (!domain) {
    return value;
  }

  return `${local.slice(0, 1)}${'*'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
}

export function maskMobile(mobile: string): string {
  const value = normalizeMobile(mobile);

  if (!value) {
    return '';
  }

  return `${value.slice(0, 3)}${'*'.repeat(Math.max(value.length - 7, 1))}${value.slice(-4)}`;
}
