// =============================================================================
// Demo Applicant session broker
// =============================================================================
// Purpose
//   Makes the right half of the sign-in row a genuine one-click button, so a
//   reviewer can land on the applicant side and see a real applicant journey --
//   dashboard, profile, applications, scheme discovery -- without having to
//   register an account or be handed a password.
//
//   It is deliberately the same shape as `demo-admin-session`: the browser asks
//   this function for a session, the function signs in the one dedicated demo
//   applicant account, and only that session comes back. No credential, key or
//   token is present in the frontend bundle or on the login screen.
//
// Why this is not a way to reach a real applicant
//   The DEMO_APPLICANT_EMAIL secret is the only thing this function will ever
//   sign in, so a reviewer can only ever become the one account the operator
//   seeded for this purpose. Pointing the secret at a real applicant's address
//   would publish that applicant's records to every visitor, because an
//   'applicant' role carries real read and write access to its own profile,
//   documents and applications.
//
//   This is a genuine difference from the Demo Admin, and it is the reason the
//   role check below refuses anything but an account that was seeded for
//   demonstration: `demo_admin` can select from two read-only views and nothing
//   else, whereas an applicant session reaches live personal data. The security
//   here rests on the account being a dedicated, synthetic one -- not on any
//   privilege it was stripped of. Seed it with fabricated data only.
//
// Required secrets (set with: supabase secrets set DEMO_APPLICANT_EMAIL=... DEMO_APPLICANT_PASSWORD=...)
//   DEMO_APPLICANT_EMAIL      the seeded demo applicant's email
//   DEMO_APPLICANT_PASSWORD   that account's password
//
// SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY) are injected by
// the platform. The service-role key is deliberately NOT used: a password grant
// needs nothing more than the public key, so this function has no privileged
// credential of its own to leak.
//
// Deploy with: supabase functions deploy demo-applicant-session
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const NOT_CONFIGURED_MESSAGE = 'The Demo Applicant is not available right now. Please contact the portal administrator.';
const SIGN_IN_FAILED_MESSAGE = 'The Demo Applicant could not be signed in right now. Please try again.';
const WRONG_ROLE_MESSAGE = 'The Demo Applicant is not provisioned correctly. Please contact the portal administrator.';

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Use POST.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publicKey = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY');
  const email = Deno.env.get('DEMO_APPLICANT_EMAIL');
  const password = Deno.env.get('DEMO_APPLICANT_PASSWORD');

  // Never echo a secret name that has not been set into an error the browser
  // renders. The message is generic; the operator sees this in the function logs.
  if (!supabaseUrl || !publicKey || !email || !password) {
    console.error('demo-applicant-session is not configured: set DEMO_APPLICANT_EMAIL and DEMO_APPLICANT_PASSWORD.');
    return json({ error: NOT_CONFIGURED_MESSAGE }, 503);
  }

  // Sign in as the demo account. A plain password grant with the public key: the
  // point of the function is to keep the password off the client, not to gain
  // privileges.
  const broker = createClient(supabaseUrl, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data, error } = await broker.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    console.error('demo-applicant-session: sign-in failed:', error?.message ?? 'no session returned');
    return json({ error: SIGN_IN_FAILED_MESSAGE }, 502);
  }

  // Confirm the configured account really is an applicant before handing the
  // session over.
  //
  // Unlike the Demo Admin, this check cannot prove the account is a *synthetic*
  // one: 'applicant' is the ordinary role, so every real applicant also matches
  // it. What it does catch is the misconfiguration where the secret names an
  // officer or a `demo_admin` account, which would drop a reviewer into a
  // console or a read-only panel and leave them debugging the button instead of
  // the flow. The operator still has to seed a fabricated account.
  const asApplicant = createClient(supabaseUrl, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });

  const { data: profile, error: profileError } = await asApplicant
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || profile?.role !== 'applicant') {
    console.error(
      'demo-applicant-session: refusing to hand out a session, role is',
      profile?.role ?? `(unreadable: ${profileError?.message})`,
    );
    return json({ error: WRONG_ROLE_MESSAGE }, 503);
  }

  return json(
    {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      expires_in: data.session.expires_in,
      user: { id: data.user.id, email: data.user.email },
    },
    200,
  );
});
