/**
 * Registration rules the browser and the server both apply.
 *
 * The browser applies them to show an inline error before a round trip. That is
 * a convenience, not a control: `supabase/functions/_shared/registration.ts`
 * applies the same rules to whatever actually arrived, and `registration-start`
 * rejects the request if they disagree. The numbers in `REGISTRATION_LIMITS`
 * are the same on both sides too, and `scripts/registration-otp.test.mjs` fails
 * if the two files ever drift, so this one and that one are edited together.
 */

/** Digit count of the codes Supabase Auth sends for both email and SMS. */
export const OTP_LENGTH = 6;

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

  // Mobile is required now. It was optional while nothing verified it, which is
  // exactly the state this flow exists to end: an unverified number is not an
  // identity, so registration no longer accepts one it will not check.
  if (!values.mobile.trim()) {
    errors.mobile = 'Enter your mobile number. We will send a verification code to it.';
  } else if (!isValidMobile(values.mobile)) {
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
