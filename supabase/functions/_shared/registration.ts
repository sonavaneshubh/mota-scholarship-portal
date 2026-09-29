// =============================================================================
// Shared helpers for the registration-* Edge Functions
// =============================================================================
// These three functions implement the Email OTP + optional Mobile OTP
// registration flow:
//
//   registration-start     validate, reject duplicates, open an attempt, dispatch
//                          the email code, and the SMS code when a mobile number
//                          was given
//   registration-verify    consume a code server-side and record the proof
//   registration-complete  re-check the proofs this attempt needs, then activate
//                          the account
//
// The email is the only proof registration always requires. The mobile number
// is optional on the form: an applicant who leaves it blank is verified by the
// email code alone, and `registration_attempts.mobile_e164` is NULL for them.
// An applicant who does give a number still has to prove it, exactly as before.
// "This attempt has a mobile number" is therefore read off the column's NULL
// rather than off a flag that could disagree with it.
//
// Every OTP is generated, delivered and checked by Supabase Auth (GoTrue). This
// module never sees a one-time code and never stores one. The only secret it
// uses is the service-role key, which the platform injects; the SMS provider
// credentials live in Supabase's own auth configuration and are never visible
// to this code, to the browser, or to this repository.
//
// The constants below are duplicated in
// mota-scholarship-portal-frontend/src/lib/registrationConfig.ts so the browser
// can render countdowns and inline errors with the same numbers the server
// enforces. `scripts/registration-otp.test.mjs` fails the build if the two
// copies drift apart, so treat that file and this one as one unit.
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * The flow's agreed limits. Mirrored in the frontend config file.
 *
 * `OTP_LENGTH` is the digit count Supabase Auth really issues here, confirmed
 * against a delivered "Confirm signup" mail whose `{{ .Token }}` code was eight
 * digits. It gates `isValidOtpToken` below, so a code of any other length is
 * rejected before it reaches `auth.verifyOtp`.
 */
export const OTP_LENGTH = 8;
export const RESEND_COOLDOWN_SECONDS = 45;
export const MAX_RESENDS_PER_CHANNEL = 5;
export const MAX_VERIFY_FAILURES_PER_CHANNEL = 5;
export const ATTEMPT_TTL_MINUTES = 15;
export const MAX_STARTS_PER_EMAIL_PER_HOUR = 5;

/**
 * Whether an applicant has to give a mobile number in order to register.
 *
 * `false`, and it is mirrored in the frontend config file so the form and the
 * server cannot disagree about whether the field may be left blank. It is a
 * constant rather than a setting because changing it changes who is allowed to
 * hold an account, which is a decision to be made once, in review, rather than
 * from a dashboard.
 *
 * Note what `false` does *not* mean: a number that is given is still verified.
 * This flag decides whether a number is demanded, never whether one is checked.
 */
export const MOBILE_REQUIRED = false;

export const PASSWORD_MIN_LENGTH = 10;

/**
 * The portal's default dialling code.
 *
 * The Ministry of Tribal Affairs portal is operated for Indian applicants, and
 * the profile form already validates the mobile field as a bare ten-digit
 * Indian number. Registration therefore treats a number typed without a
 * country code as Indian, and requires that shape, instead of accepting the
 * looser "+ then 10-15 digits" rule the old form used. An applicant with a
 * number from elsewhere types the country code and it is used as given.
 */
export const DEFAULT_COUNTRY_CODE = '91';

export const CORS_HEADERS = {
  // This is a pre-authentication endpoint that anyone on the internet has to be
  // able to reach, exactly like Supabase's own /auth/v1/* routes, so the origin
  // cannot be pinned to a single host. The response carries no credentials and
  // grants no access; the caller proves possession of the email inbox and the
  // handset, and the browser holds no token that these functions honour.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/**
 * Machine-readable failure reasons.
 *
 * The browser switches on `code`, never on `error`: the message is written for
 * an applicant and may be reworded freely, the code is part of the contract.
 */
export const FAILURE = {
  BAD_REQUEST: 'BAD_REQUEST',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_MOBILE: 'INVALID_MOBILE',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  INVALID_NAME: 'INVALID_NAME',
  INVALID_USERNAME: 'INVALID_USERNAME',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  MOBILE_TAKEN: 'MOBILE_TAKEN',
  TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
  ATTEMPT_NOT_FOUND: 'ATTEMPT_NOT_FOUND',
  ATTEMPT_EXPIRED: 'ATTEMPT_EXPIRED',
  RESEND_COOLDOWN: 'RESEND_COOLDOWN',
  RESEND_LIMIT: 'RESEND_LIMIT',
  INVALID_OTP: 'INVALID_OTP',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_LOCKED: 'OTP_LOCKED',
  NOT_VERIFIED: 'NOT_VERIFIED',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL',
} as const;

export type FailureCode = (typeof FAILURE)[keyof typeof FAILURE];

/**
 * The applicant-facing wording for each failure code. Exported so
 * `scripts/registration-otp.test.mjs` can assert that every code the flow can
 * produce actually has a message, rather than silently sending a blank one.
 */
export const MESSAGES: Record<FailureCode, string> = {
  BAD_REQUEST: 'We could not read that request. Please start again.',
  INVALID_EMAIL: 'Enter a valid email address.',
  INVALID_MOBILE: 'Enter a valid mobile number including the country code if it is not +91.',
  WEAK_PASSWORD: 'Use at least 10 characters with uppercase, lowercase, number, and symbol.',
  INVALID_NAME: 'Enter the applicant name as it appears on your official records.',
  INVALID_USERNAME: 'Use 4-32 characters, start with a letter, and include only letters, numbers, dots, or underscores.',
  EMAIL_TAKEN: 'An account already exists with this email address. Sign in instead, or reset your password.',
  MOBILE_TAKEN: 'This mobile number is already registered to an account. Use a different number.',
  TOO_MANY_ATTEMPTS: 'Too many registration attempts. Please wait a while before trying again.',
  ATTEMPT_NOT_FOUND: 'This registration could not be found. Please start again.',
  ATTEMPT_EXPIRED: 'This registration has expired. Please start again.',
  RESEND_COOLDOWN: 'Please wait a moment before requesting another code.',
  RESEND_LIMIT: 'You have requested too many codes. Please try again later.',
  INVALID_OTP: 'That code is not correct. Please check it and try again.',
  OTP_EXPIRED: 'That code has expired. Please request a new one.',
  OTP_LOCKED: 'Too many incorrect attempts. Please request a new code.',
  NOT_VERIFIED: 'Please verify your email address, and your mobile number too if you gave one, before continuing.',
  PROVIDER_UNAVAILABLE: 'We could not reach the verification service. Please try again shortly.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  NOT_CONFIGURED: 'Registration is temporarily unavailable. Please contact the portal administrator.',
  CONFLICT: 'That action has already been completed. Please sign in.',
  INTERNAL: 'Something went wrong on our side. Please try again.',
};

export function fail(code: FailureCode, status: number, extra: Record<string, unknown> = {}) {
  return json({ ok: false, code, error: MESSAGES[code], ...extra }, status);
}

/**
 * Turns a GoTrue error into an applicant-safe failure.
 *
 * GoTrue's own messages are useful to an operator and useless, or alarming, to
 * an applicant ("Token has expired or is invalid", "Database error saving new
 * user"), and some of them differ in wording between releases. Mapping to a
 * fixed code set means the UI never has to pattern-match on provider prose, and
 * no provider internals, SQL fragments or hostnames reach the browser. The
 * unmapped message is written to the function log for the operator.
 */
export function classifyAuthError(error: { message?: string; code?: string; status?: number } | null | undefined) {
  const code = error?.code ?? '';
  const message = (error?.message ?? '').toLowerCase();

  // The code is consulted before the message throughout. GoTrue's wording for a
  // *wrong* code is "Token has expired or is invalid", which contains the word
  // "expired" -- so a message-first rule tells somebody who mistyped a digit that
  // their code expired and sends them off to wait for an SMS that will not fix
  // anything. Matching on the code first keeps those two apart, and the message
  // is only used when the code is absent.
  if (code === 'invalid_token' || code === 'bad_json') {
    return { code: FAILURE.INVALID_OTP, status: 400 } satisfies { code: FailureCode; status: number };
  }

  if (code === 'otp_expired' || code === 'email_expired' || code === 'sms_expired' || code === 'expired_token') {
    return { code: FAILURE.OTP_EXPIRED, status: 400 } satisfies { code: FailureCode; status: number };
  }

  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || code === 'over_sms_send_rate_limit') {
    return { code: FAILURE.RATE_LIMITED, status: 429 } satisfies { code: FailureCode; status: number };
  }

  if (code === 'otp_disabled' || code === 'sms_provider_disabled' || code === 'phone_login_disabled') {
    return { code: FAILURE.NOT_CONFIGURED, status: 503 } satisfies { code: FailureCode; status: number };
  }

  if (
    code === 'sms_send_failed' ||
    code === 'email_not_sent' ||
    code === 'email_address_not_authorized' ||
    code === 'unexpected_failure' ||
    code === 'provider_error' ||
    error?.status === 500 ||
    error?.status === 502 ||
    error?.status === 503
  ) {
    return { code: FAILURE.PROVIDER_UNAVAILABLE, status: 502 } satisfies { code: FailureCode; status: number };
  }

  if (
    message.includes('invalid token') ||
    message.includes('token is invalid') ||
    message.includes('invalid otp') ||
    message.includes('invalid verification code') ||
    message.includes('verification code') ||
    message.includes('email link is invalid') ||
    message.includes('sms link is invalid')
  ) {
    return { code: FAILURE.INVALID_OTP, status: 400 } satisfies { code: FailureCode; status: number };
  }

  if (message.includes('expired')) {
    return { code: FAILURE.OTP_EXPIRED, status: 400 } satisfies { code: FailureCode; status: number };
  }

  if (code === 'signup_disabled' || code === 'signups_not_allowed_for_otp') {
    return { code: FAILURE.NOT_CONFIGURED, status: 503 } satisfies { code: FailureCode; status: number };
  }

  if (code === 'user_already_exists' || code === 'email_exists' || code === 'phone_exists') {
    return { code: FAILURE.EMAIL_TAKEN, status: 409 } satisfies { code: FailureCode; status: number };
  }

  if (error?.status === 429) {
    return { code: FAILURE.RATE_LIMITED, status: 429 } satisfies { code: FailureCode; status: number };
  }

  return { code: FAILURE.PROVIDER_UNAVAILABLE, status: 502 } satisfies { code: FailureCode; status: number };
}

export interface FunctionEnv {
  url: string;
  serviceRoleKey: string;
  publicKey: string;
  /** Privileged client. Bypasses RLS. Never leaves the server. */
  admin: ReturnType<typeof createClient>;
  /**
   * Unprivileged client used for the two operations that must go through
   * GoTrue's own rate limiting and code generation: sending an OTP and
   * consuming one. `persistSession: false` is load-bearing, not tidiness --
   * it is what guarantees the session GoTrue hands back on a successful
   * verifyOtp is discarded here instead of being cached anywhere a later
   * request could pick it up.
   */
  publicClient: ReturnType<typeof createClient>;
}

/**
 * Builds the two clients, or returns null when the function is not configured.
 *
 * A missing service-role key is a deployment mistake, not an applicant error,
 * so it produces one generic message and a log line naming the variable. The
 * variable name is safe to log; its value never is, and is never echoed.
 */
export function getEnv(): FunctionEnv | null {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');

  if (!url || !serviceRoleKey || !publicKey) {
    const missing = [
      !url ? 'SUPABASE_URL' : null,
      !serviceRoleKey ? 'SUPABASE_SERVICE_ROLE_KEY' : null,
      !publicKey ? 'SUPABASE_ANON_KEY/SUPABASE_PUBLISHABLE_KEY' : null,
    ]
      .filter(Boolean)
      .join(', ');

    console.error(`registration function is not configured; missing: ${missing}`);
    return null;
  }

  const authOptions = { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } as const;

  return {
    url,
    serviceRoleKey,
    publicKey,
    admin: createClient(url, serviceRoleKey, { auth: authOptions }),
    publicClient: createClient(url, publicKey, { auth: authOptions }),
  };
}

/**
 * Parses the request body, or returns null when it is absent or not an object.
 *
 * This is not an origin check. There is nothing here to forge an origin for: the
 * caller holds no credential these functions honour, and the two things that
 * would let a stranger act on an applicant's behalf -- knowing the code sent to
 * the inbox and the code sent to the handset -- are never accepted over the
 * wire at all.
 */
export async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Normalisation and validation
// -----------------------------------------------------------------------------
// These run again inside every function that touches a value, not just at the
// start of the flow. The browser checks the same rules to show inline errors,
// but nothing here trusts that it did: the regexes and the password policy are
// re-applied to whatever actually arrived over the wire.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9._]{3,31}$/;
const E164_PATTERN = /^\+[1-9][0-9]{9,14}$/;

export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isValidEmail(email: string): boolean {
  // 254 is the practical ceiling for a forward-path address; anything longer is
  // a rejection rather than a truncated string.
  return email.length > 3 && email.length <= 254 && EMAIL_PATTERN.test(email);
}

/**
 * Normalises applicant-typed mobile input to E.164.
 *
 * Accepts `9876543210`, `+91 98765 43210`, `(98765) 43210`, `91-9876543210`. A
 * bare ten-digit number is read as Indian. Anything else is returned as an
 * empty string, which the callers turn into a validation failure.
 */
export function normalizeMobile(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

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

  // No country code, but an explicit international prefix that is not the
  // default: `919876543210` is read as India, anything else needs a '+'.
  if (digits.length > 10 && digits.startsWith(DEFAULT_COUNTRY_CODE)) {
    return `+${digits}`;
  }

  return '';
}

/**
 * Whether an attempt carries a mobile number.
 *
 * The single test every function uses to decide whether a mobile proof is
 * outstanding, so the three of them cannot answer it three different ways. It
 * reads the stored column rather than a separate flag, which means the answer is
 * always the number that was actually persisted.
 */
export function hasMobile(mobileE164: unknown): boolean {
  return typeof mobileE164 === 'string' && mobileE164.length > 0;
}

/**
 * Reads the optional mobile field from a request body.
 *
 * A blank field and an unusable field have to be told apart, and a bare string
 * cannot tell them: `normalizeMobile` returns an empty string for both. `given`
 * says the applicant typed something, so an empty `e164` beside `given: true`
 * is a rejection and beside `given: false` is a perfectly good registration.
 */
export function readOptionalMobile(value: unknown): { given: boolean; e164: string } {
  const typed = typeof value === 'string' ? value.trim() : '';

  if (!typed) {
    return { given: false, e164: '' };
  }

  return { given: true, e164: normalizeMobile(typed) };
}

export function isValidPassword(password: unknown): boolean {
  return (
    typeof password === 'string' &&
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= 200 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9\s]/.test(password)
  );
}

export function normalizeName(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export function isValidName(name: string): boolean {
  return name.length >= 2 && name.length <= 80;
}

export function normalizeUsername(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

export function isValidOtpToken(value: unknown): value is string {
  return typeof value === 'string' && new RegExp(`^[0-9]{${OTP_LENGTH}}$`).test(value.trim());
}

/** What is deliberately not logged: the code, and the password. */
export function logSafe(fields: Record<string, unknown>) {
  console.log(JSON.stringify(fields));
}
