import { supabaseProjectUrl, supabasePublicKey, isSupabaseConfigured, supabaseConfigNotice } from '../../lib/supabase';
import { diagnosticError } from '../../lib/diagnostics';

/**
 * Client for the three registration Edge Functions.
 *
 * These calls are made with `fetch` rather than `supabase.functions.invoke()`
 * for two reasons. `invoke()` throws away the response body of a non-2xx
 * response, and every failure in this flow is meaningful and specific: an
 * expired code, a wrong code, a resend that is still in cooldown and a
 * duplicate address all have to be told apart so the applicant is told the
 * right thing. And `invoke()` attaches the session as a bearer token, which
 * would be misleading for an applicant who has no session yet and is not meant
 * to have one.
 *
 * Nothing here is a security control. The browser can lie about anything it
 * sends, and the functions do not believe it: the codes are checked by Supabase
 * Auth, the duplicate checks are made against the database, and completion is
 * refused unless both proofs are already recorded there. What this module owns
 * is the wording, the cooldowns and the loading states.
 */

export type RegistrationChannel = 'email' | 'mobile';

export type RegistrationFailureCode =
  | 'BAD_REQUEST'
  | 'INVALID_EMAIL'
  | 'INVALID_MOBILE'
  | 'WEAK_PASSWORD'
  | 'INVALID_NAME'
  | 'INVALID_USERNAME'
  | 'EMAIL_TAKEN'
  | 'MOBILE_TAKEN'
  | 'TOO_MANY_ATTEMPTS'
  | 'ATTEMPT_NOT_FOUND'
  | 'ATTEMPT_EXPIRED'
  | 'RESEND_COOLDOWN'
  | 'RESEND_LIMIT'
  | 'INVALID_OTP'
  | 'OTP_EXPIRED'
  | 'OTP_LOCKED'
  | 'NOT_VERIFIED'
  | 'PROVIDER_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'NOT_CONFIGURED'
  | 'CONFLICT'
  | 'INTERNAL'
  | 'NETWORK'
  | 'UNEXPECTED';

export interface RegistrationFailure {
  ok: false;
  code: RegistrationFailureCode;
  /** Applicant-safe wording, written by the server. */
  message: string;
  /** Seconds the applicant must wait, when the server said so. */
  retryAfterSeconds?: number;
  attemptsRemaining?: number;
}

export type RegistrationResult<T> = ({ ok: true } & T) | RegistrationFailure;

export interface StartRegistrationInput {
  email: string;
  /** Optional. Blank means the applicant gave no number and no SMS is sent. */
  mobile: string;
  fullName: string;
  username: string;
  password: string;
}

export interface StartRegistrationData {
  attemptId: string;
  /**
   * `mobile` is null when the applicant gave no number, which is the only case
   * in which no SMS was ever sent. The form must not offer a mobile code box
   * for it, and must not ask for a code that will never arrive.
   */
  channels: {
    email: { sent: boolean; code: string | null };
    mobile: { sent: boolean; code: string | null } | null;
  };
  /** Whether this attempt owes a mobile proof before it can be completed. */
  mobileRequired: boolean;
  resendCooldownSeconds: number;
  expiresAt: string;
  maskedEmail: string;
  /** Empty when no number was given. */
  maskedMobile: string;
}

export interface VerifyChannelData {
  channel: RegistrationChannel;
  emailVerified: boolean;
  mobileVerified: boolean;
  /** Every proof this attempt requires is in. The email alone, if that is all it needs. */
  bothVerified: boolean;
  /** False for a mobile-less attempt, where the mobile proof is not owed. */
  mobileRequired: boolean;
  verified?: boolean;
  alreadyVerified?: boolean;
  resent?: boolean;
  resendCooldownSeconds: number;
  expiresAt: string;
}

export interface CompleteRegistrationData {
  email: string;
}

const NETWORK_FAILURE: RegistrationFailure = {
  ok: false,
  code: 'NETWORK',
  message: 'We could not reach the registration service. Please check your connection and try again.',
};

const NOT_CONFIGURED: RegistrationFailure = {
  ok: false,
  code: 'NOT_CONFIGURED',
  message: supabaseConfigNotice,
};

/**
 * Reads a JSON body without throwing.
 *
 * A function that is deployed with no configuration, is asleep, or is behind a
 * gateway error page answers with HTML or nothing at all. `response.json()` then
 * rejects, and an unhandled rejection here would surface as a form that silently
 * does nothing -- the same failure mode the old deployed login had.
 */
async function readBody(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const body = await response.json();
    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function call<T>(functionName: string, payload: Record<string, unknown>): Promise<RegistrationResult<T>> {
  if (!isSupabaseConfigured) {
    return NOT_CONFIGURED;
  }

  let response: Response;

  try {
    response = await fetch(`${supabaseProjectUrl.replace(/\/+$/, '')}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // The public browser key, which the Functions gateway requires in order
        // to route the call at all. It grants nothing: these functions are
        // deployed with verify_jwt = false precisely because an applicant with
        // no session has to be able to reach them, and the key carries no
        // privilege the applicant does not already have.
        apikey: supabasePublicKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    diagnosticError('registration', `${functionName} could not be reached`, { error });
    return NETWORK_FAILURE;
  }

  const body = await readBody(response);

  if (!response.ok || !body || body.ok !== true) {
    const code = typeof body?.code === 'string' ? (body.code as RegistrationFailureCode) : 'UNEXPECTED';
    const message =
      typeof body?.error === 'string' && body.error.length > 0
        ? body.error
        : 'Something went wrong. Please try again.';

    // A 5xx or a body we could not parse is the server's problem, not the
    // applicant's, so the raw status and the function name go to the log and
    // only the server's own wording reaches the screen.
    if (response.status >= 500 || !body) {
      diagnosticError('registration', `${functionName} returned an unusable response`, {
        status: response.status,
        code,
      });
    } else {
      // A 4xx is the server's considered answer, and the message on screen is
      // only its rendering, so the two failure modes look identical there: a code
      // that is genuinely wrong, and a code the deployed function is too old to
      // accept. The reason code is what separates them, so it is logged for
      // every 4xx.
      //
      // `code` is a fixed vocabulary -- never the applicant's token, never their
      // email, and never a body field that could carry either. `attemptsRemaining`
      // is a count, so it is safe for the same reason.
      diagnosticError('registration', `${functionName} refused the request`, {
        status: response.status,
        code,
        attemptsRemaining: typeof body?.attemptsRemaining === 'number' ? body.attemptsRemaining : undefined,
      });
    }

    const failure: RegistrationFailure = { ok: false, code, message };

    if (typeof body?.retryAfterSeconds === 'number') {
      failure.retryAfterSeconds = body.retryAfterSeconds;
    }

    if (typeof body?.attemptsRemaining === 'number') {
      failure.attemptsRemaining = body.attemptsRemaining;
    }

    return failure;
  }

  return body as { ok: true } & T;
}

/** Validates, rejects duplicates, opens the attempt, sends the email code and, if a number was given, the SMS. */
export function startRegistration(input: StartRegistrationInput) {
  return call<StartRegistrationData>('registration-start', { ...input });
}

/** Sends a fresh code for one channel, subject to the resend cooldown. */
export function resendOtp(attemptId: string, channel: RegistrationChannel) {
  return call<VerifyChannelData>('registration-verify', { attemptId, channel, action: 'resend' });
}

/** Submits one code. GoTrue decides whether it is right. */
export function verifyOtp(attemptId: string, channel: RegistrationChannel, token: string) {
  return call<VerifyChannelData>('registration-verify', { attemptId, channel, action: 'verify', token });
}

/**
 * Activates the account. Refused by the server unless every proof the attempt
 * needs was already accepted -- the email code always, and the mobile code too
 * when a number was given -- so a caller that skips a step gets `NOT_VERIFIED`
 * rather than an account.
 */
export function completeRegistration(attemptId: string, password: string) {
  return call<CompleteRegistrationData>('registration-complete', { attemptId, password });
}
