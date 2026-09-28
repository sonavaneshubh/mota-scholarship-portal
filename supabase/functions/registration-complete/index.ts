// =============================================================================
// registration-complete
// =============================================================================
// Finishes a registration, and only a fully proven one.
//
//   POST { attemptId, password }
//
// This is the endpoint a bypass attempt targets, so its first act is to ask the
// database whether the two proofs exist:
//
//   select ... from public.registration_attempts where id = $1
//
// Both `email_verified_at` and `mobile_verified_at` must be non-null. The
// browser's opinion is not consulted, not accepted as a fallback, and there is
// no parameter that can stand in for a proof. Each of those columns was written
// by registration-verify, and only after GoTrue accepted the corresponding
// one-time code, so an unverified or half-verified applicant cannot get an
// account here however the request is shaped.
//
// What it then does, in order:
//   1. Resolves the single auth user for this applicant. GoTrue opened one when
//      it sent the email code, and possibly a second, phone-only one when it
//      sent the SMS; exactly one account survives, either by completing the
//      email-side one and removing the phone-only throwaway, or -- when only the
//      phone-side account was ever opened -- by completing that one in place.
//   2. Sets the password, the phone number, both confirmed flags, and the
//      applicant's name.
//   3. Ensures the `profiles` and `applicant_profiles` rows exist, without ever
//      writing `role`. Role assignment stays where it has always been: the
//      `handle_new_user()` trigger writes the literal 'applicant', and nothing
//      here can change it.
//   4. Deletes the attempt row, so the temporary verification state does not
//      outlive the flow that created it. A replayed call therefore finds
//      nothing and cannot create a second account.
//
// Required secret: SUPABASE_SERVICE_ROLE_KEY (service_role)
//
// Deploy with: supabase functions deploy registration-complete
// =============================================================================

import {
  FAILURE,
  classifyAuthError,
  fail,
  getEnv,
  isValidPassword,
  json,
  logSafe,
  normalizeEmail,
  normalizeMobile,
  readJsonBody,
  CORS_HEADERS,
} from '../_shared/registration.ts';

const TABLE = 'registration_attempts';

type Attempt = {
  id: string;
  email: string;
  mobile_e164: string;
  full_name: string;
  username: string | null;
  auth_user_id: string | null;
  status: string;
  email_verified_at: string | null;
  mobile_verified_at: string | null;
  created_at: string;
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
  const password = body.password;

  if (!attemptId) {
    return fail(FAILURE.BAD_REQUEST, 400);
  }

  const { data: loaded, error: loadError } = await env.admin
    .from(TABLE)
    .select('id,email,mobile_e164,full_name,username,auth_user_id,status,email_verified_at,mobile_verified_at,created_at,expires_at')
    .eq('id', attemptId)
    .maybeSingle();

  if (loadError) {
    console.error('registration-complete: could not read the attempt:', loadError.message);
    return fail(FAILURE.INTERNAL, 500);
  }

  if (!loaded) {
    // Either it never existed, or it was completed and removed. Both mean there
    // is nothing here to complete, and neither is an error worth explaining to
    // an applicant who is probably mid-navigation.
    return fail(FAILURE.ATTEMPT_NOT_FOUND, 404);
  }

  const attempt = loaded as Attempt;

  if (new Date(attempt.expires_at).getTime() <= Date.now()) {
    await env.admin.from(TABLE).update({ status: 'expired' }).eq('id', attempt.id).neq('status', 'expired');
    return fail(FAILURE.ATTEMPT_EXPIRED, 410);
  }

  // ---------------------------------------------------------------------------
  // The gate. Both proofs, read from the database, right now.
  // ---------------------------------------------------------------------------
  if (!attempt.email_verified_at || !attempt.mobile_verified_at) {
    logSafe({
      fn: 'registration-complete',
      event: 'refused',
      reason: 'proof missing',
      emailVerified: Boolean(attempt.email_verified_at),
      mobileVerified: Boolean(attempt.mobile_verified_at),
    });

    return fail(FAILURE.NOT_VERIFIED, 403, {
      emailVerified: Boolean(attempt.email_verified_at),
      mobileVerified: Boolean(attempt.mobile_verified_at),
    });
  }

  if (!isValidPassword(password)) {
    return fail(FAILURE.WEAK_PASSWORD, 400);
  }

  // ---------------------------------------------------------------------------
  // Resolve the auth user. Exactly one account may end up holding this email.
  // ---------------------------------------------------------------------------
  const { data: authUsers, error: listError } = await env.admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (listError) {
    console.error('registration-complete: could not read the auth directory:', listError.message);
    return fail(FAILURE.INTERNAL, 500);
  }

  const users = authUsers?.users ?? [];
  const emailOwner = users.find((user) => normalizeEmail(user.email) === attempt.email) ?? null;
  const phoneOwner = users.find((user) => normalizeMobile(user.phone ?? '') === attempt.mobile_e164) ?? null;

  // The email side is the account: it is the identifier the applicant signs in
  // with. A second, phone-only user can exist because GoTrue's phone sign-up
  // looks the number up on its own and does not know about the email.
  let userId = emailOwner?.id ?? null;

  // Set only in the case where two accounts exist and the email one is kept.
  let throwawayPhoneOwner: (typeof users)[number] | null = null;

  if (phoneOwner && phoneOwner.id !== userId) {
    const createdAt = new Date(phoneOwner.created_at).getTime();
    const attemptStartedAt = new Date(attempt.created_at).getTime();
    const createdDuringThisAttempt = createdAt >= attemptStartedAt - 5 * 60 * 1000;
    const neverUsed = !phoneOwner.last_sign_in_at && !phoneOwner.email_confirmed_at;

    /*
     * Every condition for "this is the throwaway the SMS step just created" has
     * to hold before the account is touched at all. If any of them does not,
     * the account belongs to somebody and is left completely alone.
     */
    if (!createdDuringThisAttempt || !neverUsed) {
      console.error(
        'registration-complete: the mobile number is already held by an account that is not part of this attempt; refusing to touch it.',
      );
      return fail(FAILURE.MOBILE_TAKEN, 409);
    }

    if (userId) {
      throwawayPhoneOwner = phoneOwner;
    } else {
      /*
       * No email account: the number is already an account of its own, opened by
       * the SMS step. That account is the applicant's -- it holds the handset
       * they just proved they have -- so it is completed in place rather than
       * merged into a new one. Treating this as "number taken" here would make
       * the flow impossible to finish, because the account being complained
       * about is the one that was created for this very attempt.
       */
      userId = phoneOwner.id;
    }
  }

  if (throwawayPhoneOwner) {
    /*
     * GoTrue will not let the same number be held by two accounts, so the
     * throwaway has to go before the number is written onto the account that
     * is being kept. Its profile rows are removed only after a second check
     * that nothing has been written to them: an account created seconds ago by
     * the SMS step has an untouched 'incomplete' profile and no completion, and
     * a real applicant's would not.
     */
    const { data: throwawayProfile } = await env.admin
      .from('applicant_profiles')
      .select('profile_status, created_at')
      .eq('id', throwawayPhoneOwner.id)
      .maybeSingle();

    const profileIsPristine =
      !throwawayProfile ||
      (throwawayProfile.profile_status === 'incomplete' &&
        new Date(throwawayProfile.created_at ?? 0).getTime() >= new Date(attempt.created_at).getTime() - 5 * 60 * 1000);

    if (!profileIsPristine) {
      console.error(
        'registration-complete: refusing to remove the throwaway account because its profile holds applicant data.',
      );
      return fail(FAILURE.INTERNAL, 500);
    }

    logSafe({ fn: 'registration-complete', event: 'merging throwaway phone auth user' });

    await env.admin.from('applicant_profiles').delete().eq('id', throwawayPhoneOwner.id);
    await env.admin.from('profiles').delete().eq('id', throwawayPhoneOwner.id);

    const { error: deleteError } = await env.admin.auth.admin.deleteUser(throwawayPhoneOwner.id, true);

    if (deleteError) {
      console.error('registration-complete: could not remove the throwaway auth user:', deleteError.message);
      return fail(FAILURE.INTERNAL, 500);
    }
  }

  const metadata: Record<string, string> = {
    full_name: attempt.full_name,
    mobile: attempt.mobile_e164,
  };

  if (attempt.username) {
    metadata.username = attempt.username;
  }

  if (userId) {
    // Reusing the account GoTrue opened at the email step. It has no password
    // yet, which is why nobody could have signed into it in the meantime.
    const { error: updateError } = await env.admin.auth.admin.updateUserById(userId, {
      password,
      phone: attempt.mobile_e164,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: metadata,
    });

    if (updateError) {
      const classified = classifyAuthError(updateError);
      console.error('registration-complete: could not activate the account:', updateError.code, updateError.message);
      return fail(classified.code === FAILURE.EMAIL_TAKEN ? FAILURE.CONFLICT : classified.code, classified.status);
    }
  } else {
    // No email owner: the address was never turned into an account, which
    // happens when the email code was verified on a phone-first flow. This
    // creates it now, confirmed, so no confirmation email is sent and no link
    // has to be clicked.
    const { data: created, error: createError } = await env.admin.auth.admin.createUser({
      email: attempt.email,
      phone: attempt.mobile_e164,
      password,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: metadata,
    });

    if (createError || !created?.user) {
      const classified = classifyAuthError(createError ?? null);
      console.error('registration-complete: could not create the account:', createError?.message);
      return fail(classified.code === FAILURE.EMAIL_TAKEN ? FAILURE.CONFLICT : classified.code, classified.status);
    }

    userId = created.user.id;
  }

  // ---------------------------------------------------------------------------
  // The applicant records. The trigger has normally created both already; these
  // writes are idempotent repairs for the case where it did not run.
  //
  // `role` is never written here. It is assigned once, by the trigger, as the
  // literal 'applicant', and an applicant must not be able to influence it --
  // which is also why nothing in the request body can set it.
  // ---------------------------------------------------------------------------
  const { data: existingProfile } = await env.admin
    .from('profiles')
    .select('id,role')
    .eq('id', userId)
    .maybeSingle();

  if (existingProfile) {
    await env.admin
      .from('profiles')
      .update({ email: attempt.email, full_name: attempt.full_name, updated_at: new Date().toISOString() })
      .eq('id', userId);
  } else {
    await env.admin.from('profiles').insert({
      id: userId,
      email: attempt.email,
      full_name: attempt.full_name,
      role: 'applicant',
    });
  }

  const { data: existingApplicant } = await env.admin
    .from('applicant_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (existingApplicant) {
    await env.admin.from('applicant_profiles').update({ mobile_number: attempt.mobile_e164 }).eq('id', userId);
  } else {
    await env.admin.from('applicant_profiles').insert({
      id: userId,
      profile_status: 'incomplete',
      mobile_number: attempt.mobile_e164,
    });
  }

  // ---------------------------------------------------------------------------
  // Clear the temporary state. Inside the same call as the final write, so a
  // replayed request cannot produce a second account.
  // ---------------------------------------------------------------------------
  await env.admin.from(TABLE).delete().eq('id', attempt.id);

  logSafe({ fn: 'registration-complete', event: 'completed', role: existingProfile?.role ?? 'applicant' });

  return json({ ok: true, email: attempt.email }, 200);
});
