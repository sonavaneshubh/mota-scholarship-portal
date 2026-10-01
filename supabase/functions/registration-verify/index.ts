// =============================================================================
// registration-verify
// =============================================================================
// Consumes one one-time code and records the proof.
//
//   POST { attemptId, channel: 'email' | 'mobile', action: 'verify' | 'resend', token? }
//
// The code is checked here, not in the browser. The browser posts the digits;
// GoTrue decides whether they are right; only then is the matching
// `*_verified_at` column written. There is no request shape that sets a verified
// flag, so the browser cannot assert its own verification.
//
// The email channel is always available. The mobile channel exists only when the
// applicant gave a number: an attempt whose `mobile_e164` is null never had a
// code sent to it, so asking to verify one is refused rather than passed to
// GoTrue with no number to check it against.
//
// The session GoTrue returns on a successful verifyOtp is read for its user id
// and then dropped. Handing it to the browser would be a hole: the applicant's
// password has not been set at this point, and a valid session would let them
// into the applicant area before registration was complete. The only session
// an applicant ever receives is the one they get by signing in with their
// password afterwards.
//
// Cooldowns, resend budgets and per-channel failure counts are all enforced
// here against columns on the attempt row, so they hold across page refreshes,
// across tabs, and against someone calling this function directly in a loop.
//
// Required secret: SUPABASE_SERVICE_ROLE_KEY (service_role)
//
// Deploy with: supabase functions deploy registration-verify
// =============================================================================

import {
  FAILURE,
  MAX_RESENDS_PER_CHANNEL,
  MAX_VERIFY_FAILURES_PER_CHANNEL,
  OTP_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  classifyAuthError,
  fail,
  getEnv,
  isValidOtpToken,
  json,
  logSafe,
  hasMobile,
  readJsonBody,
  CORS_HEADERS,
} from '../_shared/registration.ts';

const TABLE = 'registration_attempts';

/**
 * GoTrue's `/otp` endpoint stamps a different token type depending on whether
 * the address was already known when the code went out: a brand-new address
 * gets `signup`, a repeat send gets `magiclink`. Which one applies is therefore
 * not knowable from this side, and the alternative -- refusing to know -- means
 * a correct code is rejected.
 *
 * So the documented types are tried in order and the loop stops at the first
 * answer that is not "that code is wrong". A genuinely wrong code is therefore
 * rejected by all three and counted as a single applicant-level failure, which
 * is the budget that matters; a correct code is accepted by whichever type
 * matches, on the first or second attempt.
 */
const EMAIL_OTP_TYPES = ['email', 'signup', 'magiclink'] as const;

type Attempt = {
  id: string;
  email: string;
  /** Null when the applicant gave no number, which is allowed. */
  mobile_e164: string | null;
  status: string;
  email_verified_at: string | null;
  mobile_verified_at: string | null;
  email_otp_sent_at: string | null;
  mobile_otp_sent_at: string | null;
  email_resend_count: number;
  mobile_resend_count: number;
  email_verify_failures: number;
  mobile_verify_failures: number;
  expires_at: string;
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return fail(FAILURE.BAD_REQUEST, 405);
  }

  const env = getEnv();

  if (!env) {
    return fail(FAILURE.NOT_CONFIGURED, 503);
  }

  const body = await readJsonBody(request);

  if (!body) {
    return fail(FAILURE.BAD_REQUEST, 400);
  }

  const attemptId = typeof body.attemptId === 'string' ? body.attemptId : '';
  const channel = body.channel === 'email' || body.channel === 'mobile' ? body.channel : null;
  const action = body.action === 'resend' ? 'resend' : 'verify';

  if (!attemptId || !channel) {
    return fail(FAILURE.BAD_REQUEST, 400);
  }

  const { data: attempt, error: loadError } = await env.admin
    .from(TABLE)
    .select('id,email,mobile_e164,status,email_verified_at,mobile_verified_at,email_otp_sent_at,mobile_otp_sent_at,email_resend_count,mobile_resend_count,email_verify_failures,mobile_verify_failures,expires_at')
    .eq('id', attemptId)
    .maybeSingle();

  if (loadError) {
    console.error('registration-verify: could not read the attempt:', loadError.message);
    return fail(FAILURE.INTERNAL, 500);
  }

  if (!attempt) {
    return fail(FAILURE.ATTEMPT_NOT_FOUND, 404);
  }

  const record = attempt as Attempt;

  // An expired window is terminal. Marking it keeps the partial-unique indexes
  // from treating it as live, so the same person can start again immediately.
  if (new Date(record.expires_at).getTime() <= Date.now()) {
    await env.admin.from(TABLE).update({ status: 'expired' }).eq('id', record.id).neq('status', 'expired');
    return fail(FAILURE.ATTEMPT_EXPIRED, 410);
  }

  // An attempt with no number has no mobile code, because none was ever sent.
  // Refusing the channel outright -- rather than letting the attempt fall
  // through to GoTrue with a null phone -- means there is no shape of this
  // request that puts an unverified number anywhere near this attempt.
  if (channel === 'mobile' && !hasMobile(record.mobile_e164)) {
    logSafe({ fn: 'registration-verify', event: 'refused', channel, reason: 'no number on this attempt' });
    return fail(FAILURE.BAD_REQUEST, 400);
  }

  const alreadyVerified = channel === 'email' ? record.email_verified_at : record.mobile_verified_at;
  const failures = channel === 'email' ? record.email_verify_failures : record.mobile_verify_failures;
  const sentAt = channel === 'email' ? record.email_otp_sent_at : record.mobile_otp_sent_at;
  const resendCount = channel === 'email' ? record.email_resend_count : record.mobile_resend_count;

  const verifiedAtField = channel === 'email' ? 'email_verified_at' : 'mobile_verified_at';
  const sentAtField = channel === 'email' ? 'email_otp_sent_at' : 'mobile_otp_sent_at';
  const resendCountField = channel === 'email' ? 'email_resend_count' : 'mobile_resend_count';
  const failuresField = channel === 'email' ? 'email_verify_failures' : 'mobile_verify_failures';

  // Checked once, after the guard above, so the two dispatch and verify paths
  // below can pass a plain string to GoTrue without re-deciding this.
  const mobileE164 = record.mobile_e164 as string;

  // Whether this attempt owes a mobile proof at all. Reported so the form does
  // not have to infer it, and because "verified" and "not required" are
  // different states that would otherwise look identical.
  const mobileRequired = hasMobile(record.mobile_e164);

  // `bothVerified` is kept under its old name because it is a field the browser
  // already reads. It means "every proof this attempt requires is in", which for
  // a mobile-less attempt is the email proof alone. The proof just written is
  // passed in rather than re-read, because `record` still holds the values the
  // row had before this call.
  const allRequiredVerified = (justProved = false) => {
    const emailVerified = justProved ? channel === 'email' || Boolean(record.email_verified_at) : Boolean(record.email_verified_at);
    const mobileVerified = justProved && channel === 'mobile' ? true : Boolean(record.mobile_verified_at);

    return emailVerified && (!mobileRequired || mobileVerified);
  };

  const state = (extra: Record<string, unknown> = {}) =>
    json(
      {
        ok: true,
        channel,
        emailVerified: Boolean(record.email_verified_at),
        mobileVerified: Boolean(record.mobile_verified_at),
        bothVerified: allRequiredVerified(),
        mobileRequired,
        resendCooldownSeconds: RESEND_COOLDOWN_SECONDS,
        expiresAt: record.expires_at,
        ...extra,
      },
      200,
    );

  // Verifying a channel that is already proven is a no-op, not an error, so a
  // double-clicked Verify button or a retried request cannot fail a flow that
  // has in fact moved on.
  if (alreadyVerified) {
    return state({ alreadyVerified: true });
  }

  // ---------------------------------------------------------------------------
  // Resend
  // ---------------------------------------------------------------------------
  if (action === 'resend') {
    if (resendCount >= MAX_RESENDS_PER_CHANNEL) {
      return fail(FAILURE.RESEND_LIMIT, 429);
    }

    if (sentAt) {
      const retryAfterSeconds = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - (Date.now() - new Date(sentAt).getTime())) / 1000);

      if (retryAfterSeconds > 0) {
        // The remaining wait is returned so the countdown on screen is the
        // server's, not the browser's arithmetic.
        return fail(FAILURE.RESEND_COOLDOWN, 429, { retryAfterSeconds });
      }
    }

    const dispatch =
      channel === 'email'
        ? await env.publicClient.auth.signInWithOtp({ email: record.email, options: { shouldCreateUser: true } })
        : await env.publicClient.auth.signInWithOtp({
            phone: mobileE164,
            options: { shouldCreateUser: true, channel: 'sms' },
          });

    if (dispatch.error) {
      const classified = classifyAuthError(dispatch.error);
      console.error(`registration-verify: ${channel} resend failed:`, dispatch.error.code, dispatch.error.message);

      if (classified.code === FAILURE.RATE_LIMITED) {
        return fail(FAILURE.RATE_LIMITED, 429, { retryAfterSeconds: RESEND_COOLDOWN_SECONDS });
      }

      return fail(classified.code, classified.status);
    }

    await env.admin
      .from(TABLE)
      .update({ [sentAtField]: new Date().toISOString(), [resendCountField]: resendCount + 1 })
      .eq('id', record.id);

    logSafe({ fn: 'registration-verify', event: 'resent', channel });

    return state({ resent: true });
  }

  // ---------------------------------------------------------------------------
  // Verify
  // ---------------------------------------------------------------------------
  if (failures >= MAX_VERIFY_FAILURES_PER_CHANNEL) {
    // The budget is spent, so the only way forward is a new code. This is a
    // 429 and says so plainly rather than reporting a wrong code forever.
    return fail(FAILURE.OTP_LOCKED, 429);
  }

  if (!isValidOtpToken(body.token)) {
    return fail(FAILURE.INVALID_OTP, 400);
  }

  const token = String(body.token).trim();
  let verifiedUserId: string | null = null;
  let lastClassification: { code: string; status: number } | null = null;

  if (channel === 'mobile') {
    const { data, error } = await env.publicClient.auth.verifyOtp({ phone: mobileE164, token, type: 'sms' });

    if (error) {
      lastClassification = classifyAuthError(error);
      console.error('registration-verify: sms verify failed:', error.code, error.message);
    } else {
      // Read for the id, then discard. See the header comment.
      verifiedUserId = data.session?.user?.id ?? data.user?.id ?? null;
    }
  } else {
    for (const type of EMAIL_OTP_TYPES) {
      const { data, error } = await env.publicClient.auth.verifyOtp({ email: record.email, token, type });

      if (!error) {
        verifiedUserId = data.session?.user?.id ?? data.user?.id ?? null;
        lastClassification = null;
        break;
      }

      const classified = classifyAuthError(error);
      lastClassification = classified;

      // Anything that is not "wrong code" is the real answer, so stop here
      // rather than presenting the applicant with a second, misleading message.
      if (classified.code !== FAILURE.INVALID_OTP) {
        console.error(`registration-verify: email verify failed (${type}):`, error.code, error.message);
        break;
      }
    }
  }

  if (lastClassification || !verifiedUserId) {
    const classification = lastClassification ?? { code: FAILURE.INVALID_OTP, status: 400 };

    await env.admin.from(TABLE).update({ [failuresField]: failures + 1 }).eq('id', record.id);

    logSafe({ fn: 'registration-verify', event: 'rejected', channel, reason: classification.code });

    return fail(classification.code as typeof FAILURE[keyof typeof FAILURE], classification.status, {
      attemptsRemaining: Math.max(MAX_VERIFY_FAILURES_PER_CHANNEL - (failures + 1), 0),
    });
  }

  // The proof. This write is the only way `verified_at` ever becomes non-null.
  const now = new Date().toISOString();

  // 'email_verified' on its own is also the resting state of a mobile-less
  // attempt: there is no second channel to move on to, and the value has to stay
  // inside the check constraint in the schema.
  const nextStatus: string = record.email_verified_at ? 'mobile_verified' : 'email_verified';

  const patch: Record<string, unknown> = {
    [verifiedAtField]: now,
    status: nextStatus,
  };

  // Recorded for the email channel only. The SMS step may have created a
  // separate auth user for the same person; registration-complete resolves that
  // and needs the id of the account that owns the email.
  if (channel === 'email') {
    patch.auth_user_id = verifiedUserId;
  }

  const { error: updateError } = await env.admin.from(TABLE).update(patch).eq('id', record.id);

  if (updateError) {
    console.error('registration-verify: could not record the proof:', updateError.message);
    return fail(FAILURE.INTERNAL, 500);
  }

  logSafe({ fn: 'registration-verify', event: 'verified', channel });

  return state({
    verified: true,
    // Reported so the form can show both channels' state side by side. The
    // server decides; this is only what to draw.
    emailVerified: channel === 'email' ? true : Boolean(record.email_verified_at),
    mobileVerified: channel === 'mobile' ? true : Boolean(record.mobile_verified_at),
    bothVerified: allRequiredVerified(true),
    otpLength: OTP_LENGTH,
  });
});
