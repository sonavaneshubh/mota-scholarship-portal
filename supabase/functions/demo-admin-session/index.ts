// =============================================================================
// Demo Admin session broker
// =============================================================================
// Purpose
//   Makes "View Demo Admin" a genuine one-click button. The browser asks this
//   function for a session; the function signs in the one dedicated read-only
//   account and returns that session. No credential, key or token of any kind is
//   present in the frontend bundle or on the login screen.
//
// Why a function at all
//   The alternative is collecting the demo account's password in a form on
//   /admin/login, which means the credential is typed, shoulder-surfed, stored by
//   the browser's password manager and in the page's own history - for an account
//   that is public by design. Holding the password server-side means the browser
//   never sees it. The security does not rest on hiding the password, though; it
//   rests on the account's read-only role, which is enforced per query by the
//   RLS policies on the two views created in
//   20260927000270_demo_admin_readonly_submitted_access.sql. Even a leaked
//   session token grants only select on submitted applications.
//
// Required secrets (set with: supabase secrets set DEMO_ADMIN_EMAIL=... DEMO_ADMIN_PASSWORD=...)
//   DEMO_ADMIN_EMAIL      the promoted demo_admin account's email
//   DEMO_ADMIN_PASSWORD   that account's password
//
// SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY) are injected by
// the platform. The service-role key is deliberately NOT used: a password grant
// needs nothing more than the public key, so this function has no privileged
// credential of its own to leak.
//
// Deploy with: supabase functions deploy demo-admin-session
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
  const email = Deno.env.get('DEMO_ADMIN_EMAIL');
  const password = Deno.env.get('DEMO_ADMIN_PASSWORD');

  // Never echo a secret name that has not been set into an error the browser
  // renders. The message is generic; the operator sees this in the function logs.
  if (!supabaseUrl || !publicKey || !email || !password) {
    console.error('demo-admin-session is not configured: set DEMO_ADMIN_EMAIL and DEMO_ADMIN_PASSWORD.');
    return json({ error: 'The Demo Admin is not available right now. Please contact the portal administrator.' }, 503);
  }

  // Sign in as the demo account. A plain password grant with the public key: the
  // point of the function is to keep the password off the client, not to gain
  // privileges.
  const broker = createClient(supabaseUrl, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data, error } = await broker.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    console.error('demo-admin-session: sign-in failed:', error?.message ?? 'no session returned');
    return json({ error: 'The Demo Admin could not be signed in right now. Please try again.' }, 502);
  }

  // Confirm the configured account really is the read-only one. Without this a
  // misconfiguration could hand the public button a session for an applicant or
  // an officer's account, and the operator would find out from a data leak
  // rather than from a log line.
  const asDemo = createClient(supabaseUrl, publicKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });

  const { data: profile, error: profileError } = await asDemo
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError || profile?.role !== 'demo_admin') {
    console.error(
      'demo-admin-session: refusing to hand out a session, role is',
      profile?.role ?? `(unreadable: ${profileError?.message})`,
    );
    return json({ error: 'The Demo Admin is not provisioned correctly. Please contact the portal administrator.' }, 503);
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
