// =============================================================================
// registration-start
// =============================================================================
// Opens an Email OTP registration, with a Mobile OTP when a number was given.
//
//   POST { email, mobile?, fullName, username, password }
//
// Sequence
//   1. Re-validate every field server-side. The browser's checks are for the
//      applicant's benefit and are not trusted.
//   2. Reject the address, and the mobile number if one was given, when either
//      already belongs to a registered applicant, and throttle repeat attempts
//      per address.
//   3. Open a row in public.registration_attempts, which is the only place the
//      flow's state is kept. No OTP and no password are written to it.
//   4. Ask Supabase Auth to send the email code, and the SMS code as well when
//      the applicant gave a number. GoTrue generates both, so neither code ever
//      passes through this repository.
//
// The email is the one proof that is always required. The mobile number is
// optional: `mobile` may be blank, and then `mobile_e164` is stored as NULL, no
// SMS is sent, and no mobile proof is owed before completion. A number that *is*
// given is still verified, because a stored but unverified number is not an
// identity -- so the two channels are dispatched and reported independently here,
// and an SMS provider that is not configured still leaves the email code sent and
// the registration completable, but only for an applicant who never asked for a
// number. An unconfigured provider must not become a way round the requirement
// for someone who did.
//
// The password is accepted here only to be validated. It is used at no point in
// this function, never logged, and is required again by registration-complete.
//
// Required secret: SUPABASE_SERVICE_ROLE_KEY (service_role)
//
// Deploy with: supabase functions deploy registration-start
// =============================================================================

import {
  FAILURE,
  MAX_STARTS_PER_EMAIL_PER_HOUR,
  RESEND_COOLDOWN_SECONDS,
  classifyAuthError,
  fail,
  getEnv,
  hasMobile,
  isValidEmail,
  isValidName,
  isValidPassword,
  isValidUsername,
  json,
  logSafe,
  normalizeEmail,
  normalizeMobile,
  normalizeName,
  normalizeUsername,
  readJsonBody,
  readOptionalMobile,
  CORS_HEADERS,
} from '../_shared/registration.ts';
import type { FunctionEnv } from '../_shared/registration.ts';

const TABLE = 'registration_attempts';

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

  const email = normalizeEmail(body.email);
  const { given: mobileGiven, e164: mobileE164 } = readOptionalMobile(body.mobile);
  const fullName = normalizeName(body.fullName);
  const username = normalizeUsername(body.username);
  const password = body.password;

  // 1. Validation. Ordered so the applicant is told about the first field that
  //    needs attention, matching the order of the form.
  if (!isValidEmail(email)) {
    return fail(FAILURE.INVALID_EMAIL, 400);
  }

  // A blank mobile field is accepted, because the field is optional. A field
  // with something in it that is not a usable number is not: that is a
  // mistyped number, and quietly registering without it would leave the
  // applicant believing a number was attached to their account when none was.
  if (mobileGiven && !mobileE164) {
    return fail(FAILURE.INVALID_MOBILE, 400);
  }

  if (!isValidName(fullName)) {
    return fail(FAILURE.INVALID_NAME, 400);
  }

  // The username is required, as it has always been on this form. isValidUsername
  // is false for an empty string, so this rejects a request that simply omits it
  // rather than accepting an account with no username.
  if (!isValidUsername(username)) {
    return fail(FAILURE.INVALID_USERNAME, 400);
  }

  // The policy is checked here even though nothing consumes the password yet, so
  // an applicant who cannot possibly complete registration is told now rather
  // than after two verification codes have been spent. The value is not logged
  // and does not leave this function.
  if (!isValidPassword(password)) {
    return fail(FAILURE.WEAK_PASSWORD, 400);
  }

  // The applicant is not holding anything yet. Recording that a registration
  // was started from here, and nothing that identifies them, is the point of
  // this log line. `hasMobile` rather than the value, so no number is logged.
  logSafe({ fn: 'registration-start', event: 'received', hasMobile: hasMobile(mobileE164), hasUsername: Boolean(username) });

  // Every "this address, or this number" filter below is built from this, so a
  // mobile-less registration narrows to the address instead of matching a row
  // whose number happens to be null.
  const emailOrMobile = (column: string) =>
    hasMobile(mobileE164) ? `email.eq.${email},${column}.eq.${mobileE164}` : `email.eq.${email}`;

  // 2. Clear out anything stale for this address or number, so an abandoned
  //    attempt neither blocks a fresh one nor keeps dead rows around.
  //
  //    Keyed on `expires_at` rather than on `status`, because an attempt that was
  //    simply walked away from is still marked 'pending'. Matching on the status
  //    would leave those rows in place, where the partial unique index below
  //    would make every later attempt for the same applicant fail with a
  //    conflict they cannot clear.
  await env.admin
    .from(TABLE)
    .delete()
    .lte('expires_at', new Date().toISOString())
    .or(emailOrMobile('mobile_e164'));


  // 3. Throttle. Counted from rows rather than a counter. Expired rows for this
  //    address were just removed, so an applicant who abandoned an attempt and
  //    comes back gets a fresh allowance; with a five-per-hour ceiling that is
  //    still five verification codes an hour at worst.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentStarts } = await env.admin
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', oneHourAgo);

  if ((recentStarts ?? 0) >= MAX_STARTS_PER_EMAIL_PER_HOUR) {
    return fail(FAILURE.TOO_MANY_ATTEMPTS, 429);
  }

  // 4. Read the auth directory once and sort every account into one of two
  //    groups, because the two groups need opposite treatment.
  //
  //    A *registered* applicant is one that has proved control of an inbox or a
  //    handset: email_confirmed_at, phone_confirmed_at, or any sign-in. Those
  //    block the address or the number, full stop.
  //
  //    An *abandoned* account is the residue of a registration that was started
  //    and never finished. GoTrue creates the auth user -- and the
  //    `on_auth_user_created` trigger writes its `profiles` row -- at the moment
  //    the first code is sent, so somebody who abandons a registration is left
  //    with a user and a profile row they never completed. Those must NOT block
  //    the applicant from trying again, or one abandoned attempt would lock the
  //    address out of registration permanently.
  //
  //    Abandoned accounts are deliberately not deleted here. Deleting an auth
  //    user is destructive, and doing it because somebody typed an address into
  //    a public form is how a real account gets destroyed by a stranger. They
  //    are left in place, and registration-complete reuses whichever one holds
  //    the address the applicant is registering with.
  const { data: authUsers, error: listError } = await env.admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (listError) {
    console.error('registration-start: could not read the auth directory:', listError.message);
    return fail(FAILURE.INTERNAL, 500);
  }

  const isRegistered = (user: { email_confirmed_at?: string | null; phone_confirmed_at?: string | null; last_sign_in_at?: string | null }) =>
    Boolean(user.email_confirmed_at || user.phone_confirmed_at || user.last_sign_in_at);

  const abandonedIds: string[] = [];

  for (const user of authUsers?.users ?? []) {
    const sameEmail = normalizeEmail(user.email) === email;
    // Only a real, non-null number can match. With no number given there is
    // nothing to compare, and an applicant must never be told their number is
    // taken on the strength of somebody else's empty phone column.
    const sameMobile = hasMobile(mobileE164) && normalizeMobile(user.phone ?? '') === mobileE164;

    if (!sameEmail && !sameMobile) {
      continue;
    }

    if (isRegistered(user)) {
      // Told apart, so an applicant is not told their number is taken when it is
      // their address that is, or the other way round.
      return sameEmail ? fail(FAILURE.EMAIL_TAKEN, 409) : fail(FAILURE.MOBILE_TAKEN, 409);
    }

    abandonedIds.push(user.id);
  }

  // 5. Duplicate address and number in the portal's own tables.
  //
  //    `profiles` and `applicant_profiles` are written by the trigger for every
  //    auth user, so they contain the abandoned accounts as well. Both queries
  //    exclude those ids; without this an abandoned first attempt would report
  //    the applicant's own address as already registered.
  const excludingAbandoned = (query: ReturnType<FunctionEnv['admin']['from']>) =>
    abandonedIds.length ? query.not('id', 'in', `(${abandonedIds.join(',')})`) : query;

  // The stored address is compared again here rather than trusting the SQL
  // match, because the case-insensitive operator is the one place a stray
  // wildcard character in a typed address could produce a false hit.
  //
  // The number lookup is skipped entirely when none was given. Querying
  // `eq('mobile_number', '')` would match rows holding an empty string rather
  // than null, and would report another applicant's number as taken for an
  // applicant who never asked for a number.
  const mobileLookup = hasMobile(mobileE164)
    ? excludingAbandoned(env.admin.from('applicant_profiles').select('id').eq('mobile_number', mobileE164)).maybeSingle()
    : // Typed as the same shape the query resolves to, so the destructuring
      // below does not depend on which branch ran.
      Promise.resolve({ data: null, error: null, count: null, status: 200, statusText: '' });

  const [{ data: profileEmails }, { data: profileByMobile }, { data: activeAttempt }] = await Promise.all([
    excludingAbandoned(env.admin.from('profiles').select('id, email')).ilike('email', email),
    mobileLookup,
    env.admin
      .from(TABLE)
      .select('id')
      .or(emailOrMobile('mobile_e164'))
      .neq('status', 'expired')
      .limit(1)
      .maybeSingle(),
  ]);

  if ((profileEmails ?? []).some((row) => normalizeEmail(row.email) === email)) {
    return fail(FAILURE.EMAIL_TAKEN, 409);
  }

  if (profileByMobile) {
    return fail(FAILURE.MOBILE_TAKEN, 409);
  }

  if (activeAttempt) {
    return fail(FAILURE.CONFLICT, 409, {
      error:
        'A registration for this email or mobile number is already in progress. Finish it, or wait for it to expire before starting again.',
    });
  }

  if (abandonedIds.length) {
    // Not an identifier, so nothing here can be read back as "this person
    // started a registration".
    logSafe({ fn: 'registration-start', event: 'reusing abandoned auth account', count: abandonedIds.length });
  }

  // 6. Open the attempt. The window is short on purpose: an applicant who
  //    walks away should not leave a slot on the address or the number for long.
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { data: attempt, error: insertError } = await env.admin
    .from(TABLE)
    .insert({
      email,
      // NULL, not an empty string, for an applicant who gave no number. The
      // column is nullable for exactly this, and `hasMobile` reads the
      // difference. The E.164 check constraint is satisfied by a NULL, so it
      // does not reject the row.
      mobile_e164: mobileE164 || null,
      full_name: fullName,
      username: username || null,
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (insertError || !attempt) {
    // 23505 is the partial unique index: another in-flight attempt won the
    // race between the check above and this insert.
    if (insertError?.code === '23505') {
      return fail(FAILURE.CONFLICT, 409, {
        error:
          'A registration for this email or mobile number is already in progress. Finish it, or wait for it to expire before starting again.',
      });
    }

    console.error('registration-start: could not open the attempt:', insertError?.message);
    return fail(FAILURE.INTERNAL, 500);
  }

  // 7. Dispatch the codes. The email always goes; the SMS only when a number was
  //    given. Independent outcomes, reported independently.
  const channels: { email: { sent: boolean; code: string | null }; mobile: { sent: boolean; code: string | null } | null } = {
    email: { sent: false, code: null },
    mobile: null,
  };

  const { error: emailError } = await env.publicClient.auth.signInWithOtp({
    email,
    // GoTrue creates the auth user at this point, which is what triggers
    // `handle_new_user()` and therefore the applicant's `profiles` row with
    // role 'applicant'. It has no password yet, so it cannot be signed into.
    options: { shouldCreateUser: true },
  });

  if (emailError) {
    const classified = classifyAuthError(emailError);
    console.error('registration-start: email OTP dispatch failed:', emailError.code, emailError.message);

    // Nothing can be verified, so the attempt is not left behind holding the
    // address and the number for fifteen minutes.
    await env.admin.from(TABLE).delete().eq('id', attempt.id);

    if (classified.code === FAILURE.RATE_LIMITED) {
      return fail(FAILURE.RATE_LIMITED, 429, { retryAfterSeconds: RESEND_COOLDOWN_SECONDS });
    }

    return fail(classified.code, classified.status);
  }

  channels.email = { sent: true, code: null };

  if (hasMobile(mobileE164)) {
    const { error: smsError } = await env.publicClient.auth.signInWithOtp({
      phone: mobileE164,
      options: { shouldCreateUser: true, channel: 'sms' },
    });

    if (smsError) {
      const classified = classifyAuthError(smsError);
      console.error('registration-start: SMS OTP dispatch failed:', smsError.code, smsError.message);
      channels.mobile = { sent: false, code: classified.code };
    } else {
      channels.mobile = { sent: true, code: null };
    }
  }

  const now = new Date().toISOString();

  await env.admin
    .from(TABLE)
    .update({
      email_otp_sent_at: channels.email.sent ? now : null,
      mobile_otp_sent_at: channels.mobile?.sent ? now : null,
    })
    .eq('id', attempt.id);

  logSafe({
    fn: 'registration-start',
    event: 'dispatched',
    emailSent: channels.email.sent,
    // Whether a number was given at all, not merely whether the SMS went out:
    // `null` here means no number was asked for and none is owed.
    smsSent: channels.mobile?.sent ?? false,
    mobileRequested: hasMobile(mobileE164),
  });

  return json(
    {
      ok: true,
      attemptId: attempt.id,
      channels,
      // The countdown the browser starts from. Sent as data rather than trusted
      // from the client so a tampered clock cannot shorten the wait.
      resendCooldownSeconds: RESEND_COOLDOWN_SECONDS,
      expiresAt,
      // Whether this attempt owes a mobile proof. Sent as data so the form never
      // has to infer it from whether a number happens to be on screen, and
      // never from the shape of a masked string.
      mobileRequired: hasMobile(mobileE164),
      // Enough to render "we sent a code to u***@example.com" and the masked
      // number. The unmasked values are already known to this browser, which
      // typed them, so nothing new is exposed. Both masks are empty rather than
      // absent when they have nothing to mask, so the response shape does not
      // change with the shape of the form.
      maskedEmail: maskEmail(email),
      maskedMobile: hasMobile(mobileE164) ? maskMobile(mobileE164) : '',
    },
    200,
  );
});

function maskEmail(email: string) {
  const [local = '', domain = ''] = email.split('@');

  if (!domain) {
    return email;
  }

  const visible = local.slice(0, 1);
  return `${visible}${'*'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
}

function maskMobile(mobileE164: string) {
  return `${mobileE164.slice(0, 3)}${'*'.repeat(Math.max(mobileE164.length - 7, 1))}${mobileE164.slice(-4)}`;
}
