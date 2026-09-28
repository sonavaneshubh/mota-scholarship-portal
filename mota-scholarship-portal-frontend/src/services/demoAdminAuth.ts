/**
 * Demo Admin sign-in.
 *
 * The Demo Admin is a real Supabase Auth account whose `profiles.role` is
 * 'demo_admin'. That is the whole mechanism, and it is deliberately small:
 *
 *   - it is NOT the old hardcoded `admin@motademo.in` account, and it is NOT a
 *     real applicant's account;
 *   - it holds no privileged credential. It signs in with the publishable key
 *     the applicant portal already ships, and the service-role key is never
 *     referenced here or anywhere else in the frontend;
 *   - the only rows it can read are the two `demo_admin_*` views, and only
 *     because its role matches the policy on those views. Remove the role and
 *     it sees nothing.
 *
 * Because `public.current_profile_role()` reads the `profiles` table on every
 * query rather than reading a JWT claim, promoting or demoting the account takes
 * effect on the very next request - there is no token to wait for and no re-login
 * to force.
 */
import { supabase } from '../lib/supabase';

export const DEMO_ADMIN_ROLE = 'demo_admin';

const NOT_CONNECTED_MESSAGE =
  'The portal is not connected to its authentication service, so the Demo Admin cannot sign in. Check the Supabase environment variables.';

/**
 * The single message a visitor sees when the one-click broker cannot open a
 * session for them. Deliberately generic: the server-side function's own error
 * text is never shown, because it can describe the deployment's internals (for
 * example that a secret is unset) which is exactly the kind of detail a login
 * screen must not leak. The *behavior* still differentiates - whether the
 * manual credential form is worth offering is carried by `fallbackAvailable`,
 * not by the wording.
 */
const BROKER_FAILURE_MESSAGE = 'Unable to open Demo Admin. Please try again.';

export interface DemoAdminIdentity {
  userId: string;
  email: string;
  signedInAt: string;
}

export type DemoAdminAuthResult =
  | { ok: true; identity: DemoAdminIdentity }
  | {
      ok: false;
      error: string;
      /**
       * Whether offering the manual credential form would help. False when the
       * cause is a misconfigured account rather than an unreachable broker, since
       * typing a password cannot fix that.
       */
      fallbackAvailable?: boolean;
    };

/**
 * Reads the signed-in account's role straight from its own `profiles` row.
 * `profiles_select_own` lets any account read exactly this much of itself, so
 * this is a permission every account already has and grants no new access.
 */
export async function readCurrentRole(): Promise<string | null> {
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

export function isDemoAdminRole(role: string | null | undefined): boolean {
  return role === DEMO_ADMIN_ROLE;
}

/**
 * One-click sign-in. Asks the server-side broker for a session instead of
 * collecting the demo account's password in the browser.
 *
 * `supabase/functions/demo-admin-session` holds the credential as a secret, signs
 * in the one read-only account, checks its role really is `demo_admin`, and
 * returns only that session. Nothing secret is shipped or typed here, which is
 * what makes this safe to put behind a public button.
 *
 * The role is checked again on this side too. The function's own check protects
 * the server; this one protects the operator, because a misconfigured broker
 * should fail loudly here rather than sign the browser in as somebody else.
 */
export async function signInDemoAdminWithSessionBroker(): Promise<DemoAdminAuthResult> {
  if (!supabase) {
    return { ok: false, error: NOT_CONNECTED_MESSAGE, fallbackAvailable: true };
  }

  const { data, error } = await supabase.functions.invoke('demo-admin-session', { method: 'POST' });

  if (error || !data) {
    // Usually the function has not been deployed, or the project has not been
    // given its secrets. The message stays generic, but the login screen can
    // still offer the credential form instead of dead-ending a demonstration.
    return {
      ok: false,
      error: BROKER_FAILURE_MESSAGE,
      fallbackAvailable: true,
    };
  }

  const payload = data as {
    error?: string;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  };

  if (payload.error) {
    // A 503/502 from the function is a configuration problem, not a wrong
    // password. The raw payload is never shown - only the generic message -
    // so nothing about the server's internals reaches the visitor.
    return { ok: false, error: BROKER_FAILURE_MESSAGE, fallbackAvailable: true };
  }

  if (!payload.access_token || !payload.refresh_token || !payload.expires_at) {
    return {
      ok: false,
      error: BROKER_FAILURE_MESSAGE,
      fallbackAvailable: true,
    };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  });

  if (sessionError || !sessionData.user) {
    return { ok: false, error: BROKER_FAILURE_MESSAGE, fallbackAvailable: true };
  }

  const role = await readCurrentRole();

  if (!isDemoAdminRole(role)) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error:
        'The Demo Admin is not provisioned correctly. This is a setup problem, not a sign-in problem.',
      fallbackAvailable: false,
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

/**
 * Signs in and then proves the account is a Demo Admin.
 *
 * The role check is not decoration: `signInWithPassword` succeeds for any valid
 * credential, so without it an applicant who typed their own password here would
 * land in a panel that then shows them an empty, confusing page instead of
 * telling them they are in the wrong place. Signing them out again on the way
 * past matters for the same reason.
 */
export async function signInDemoAdmin(
  email: string,
  password: string,
): Promise<DemoAdminAuthResult> {
  if (!supabase) {
    return { ok: false, error: NOT_CONNECTED_MESSAGE };
  }

  if (!email.trim() || !password) {
    return { ok: false, error: 'Enter the Demo Admin email and password.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user) {
    return {
      ok: false,
      error: 'That Demo Admin email and password were not accepted.',
    };
  }

  const role = await readCurrentRole();

  if (!isDemoAdminRole(role)) {
    await supabase.auth.signOut();
    return {
      ok: false,
      error:
        'That account signed in, but it is not a Demo Admin. A Demo Admin is a separate account with no access to applicant data.',
    };
  }

  return {
    ok: true,
    identity: {
      userId: data.user.id,
      email: data.user.email ?? email.trim(),
      signedInAt: new Date().toISOString(),
    },
  };
}

/**
 * Keeps a Demo Admin signed in across a page refresh.
 *
 * Supabase's own session storage is enough on its own, but the admin shell also
 * keeps its own session record, and a refresh must not be able to drop the user
 * back to the login screen. Reconciling the two on startup is what makes step 13
 * of the acceptance walkthrough ("refresh and the state is still correct") hold.
 */
export async function restoreDemoAdminSession(): Promise<DemoAdminAuthResult> {
  if (!supabase) {
    return { ok: false, error: NOT_CONNECTED_MESSAGE };
  }

  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    return { ok: false, error: 'No Demo Admin session is active.' };
  }

  const role = await readCurrentRole();

  if (!isDemoAdminRole(role)) {
    // The Supabase session outlived the admin shell's own record, or the account
    // was demoted while signed in. Either way it must not be treated as a
    // Demo Admin, so drop it rather than leaving an authenticated non-demo
    // account sitting in storage.
    await supabase.auth.signOut();
    return { ok: false, error: 'That account is not a Demo Admin.' };
  }

  return {
    ok: true,
    identity: {
      userId: data.session.user.id,
      email: data.session.user.email ?? '',
      signedInAt: new Date().toISOString(),
    },
  };
}

export async function signOutDemoAdmin(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
  }
}
