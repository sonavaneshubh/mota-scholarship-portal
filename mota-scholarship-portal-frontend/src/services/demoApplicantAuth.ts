/**
 * Demo Applicant sign-in.
 *
 * The right half of the sign-in row is a one-click button that opens the
 * applicant side as a seeded demo account, so a reviewer can walk the real
 * applicant journey -- dashboard, profile, applications, scheme discovery --
 * without registering or being given a password.
 *
 * It works the same way as the Demo Admin, and for the same reason: the
 * credential lives only in the `demo-applicant-session` Edge Function, and the
 * browser only ever receives a session. Nothing secret is in this bundle, and
 * the service-role key is never referenced here or anywhere else in the
 * frontend.
 *
 * The difference that matters: a `demo_admin` session can only select from two
 * read-only views, whereas an applicant session reaches live personal data.
 * The button is therefore only as safe as the account behind
 * `DEMO_APPLICANT_EMAIL` -- it must be a seeded account carrying fabricated
 * data. Pointing it at a real applicant would publish that applicant's records
 * to every visitor. This module cannot enforce that; the broker and the operator
 * do.
 *
 * Because `public.current_profile_role()` reads the `profiles` table on every
 * query rather than reading a JWT claim, the account's role is reflected on the
 * very next request.
 */
import { supabase } from '../lib/supabase';

export const DEMO_APPLICANT_ROLE = 'applicant';

const NOT_CONNECTED_MESSAGE =
  'The portal is not connected to its authentication service, so the Demo Applicant cannot sign in. Check the Supabase environment variables.';

/**
 * The single message a visitor sees when the one-click broker cannot open a
 * session for them. Deliberately generic: the server-side function's own error
 * text is never shown, because it can describe the deployment's internals (for
 * example that a secret is unset) which is exactly the kind of detail a login
 * screen must not leak.
 */
const BROKER_FAILURE_MESSAGE = 'Unable to open the Demo Applicant. Please try again.';

export interface DemoApplicantIdentity {
  userId: string;
  email: string;
  signedInAt: string;
}

export type DemoApplicantAuthResult =
  | { ok: true; identity: DemoApplicantIdentity }
  | { ok: false; error: string };

/**
 * Reads the signed-in account's role straight from its own `profiles` row.
 *
 * This is the client's half of the same check the broker makes server-side, and
 * it protects the operator rather than the applicant: a misconfigured broker
 * should fail here, loudly, instead of dropping a reviewer into a page that
 * renders as an empty dashboard. The server-side check is the one that matters;
 * this one catches a misconfiguration earlier.
 */
export async function readApplicantRole(): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError) {
    return null;
  }

  return (profile as { role?: string | null } | null)?.role ?? null;
}

/**
 * One-click sign-in for the seeded demo applicant.
 *
 * Asks the server-side broker for a session instead of taking a credential in
 * the browser, then re-checks the role before reporting success. The session is
 * signed out again on the way past a failed check, so a wrong account cannot be
 * left sitting in this browser.
 */
export async function signInDemoApplicant(): Promise<DemoApplicantAuthResult> {
  if (!supabase) {
    return { ok: false, error: NOT_CONNECTED_MESSAGE };
  }

  const { data, error } = await supabase.functions.invoke('demo-applicant-session', { method: 'POST' });

  if (error || !data) {
    // Usually the function has not been deployed, or the project has not been
    // given its secrets. The message stays generic; the operator sees the real
    // reason in the function logs.
    return { ok: false, error: BROKER_FAILURE_MESSAGE };
  }

  const payload = data as {
    error?: string;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  };

  if (payload.error) {
    // A 503/502 from the function is a configuration problem, not a wrong
    // password. The raw payload is never shown - only the generic message - so
    // nothing about the server's internals reaches the visitor.
    return { ok: false, error: BROKER_FAILURE_MESSAGE };
  }

  if (!payload.access_token || !payload.refresh_token || !payload.expires_at) {
    return { ok: false, error: BROKER_FAILURE_MESSAGE };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });

  if (sessionError || !sessionData.user) {
    return { ok: false, error: BROKER_FAILURE_MESSAGE };
  }

  const role = await readApplicantRole();

  if (role !== DEMO_APPLICANT_ROLE) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error: 'The Demo Applicant is not provisioned correctly. This is a setup problem, not a sign-in problem.',
    };
  }

  return {
    ok: true,
    identity: {
      userId: sessionData.user.id,
      email: sessionData.user.email ?? '',
      signedInAt: new Date().toISOString(),
    },
  };
}
