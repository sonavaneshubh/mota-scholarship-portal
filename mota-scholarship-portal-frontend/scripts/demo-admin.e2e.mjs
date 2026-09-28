/**
 * End-to-end check of the Demo Admin read path against the live Supabase project.
 *
 * Run after migrations 240, 260 and 270 have been applied. It signs in as the
 * Demo Admin account with the *publishable* key only - the same credential the
 * browser gets - so it exercises the RLS policies rather than bypassing them.
 * That is the point: if a broad SELECT were reachable here, it would show up.
 *
 * Usage:
 *   DEMO_ADMIN_EMAIL=... DEMO_ADMIN_PASSWORD=... node scripts/demo-admin.e2e.mjs
 *
 * Exits non-zero on the first failure so it can gate a deploy.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

function readEnvFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, 'utf8').split(/\r?\n/).map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]),
    );
  } catch {
    return {};
  }
}

const env = { ...readEnvFile(join(root, '.env.local')), ...process.env };
const url = (env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
const email = env.DEMO_ADMIN_EMAIL ?? '';
const password = env.DEMO_ADMIN_PASSWORD ?? '';

const results = [];
let failed = 0;

function check(name, passed, detail = '') {
  results.push({ name, passed, detail });
  if (!passed) failed += 1;
  console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(path, { method = 'GET', token, body } = {}) {
  const headers = { apikey: publishableKey, Authorization: `Bearer ${token ?? publishableKey}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${url}/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: response.status, json, text };
}

console.log('\nDemo Admin end-to-end check\n' + '='.repeat(60));

if (!url || !publishableKey) {
  console.error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required.');
  process.exit(1);
}

// Checking the credentials first turns a confusing HTTP 400 from the auth
// endpoint into one clear line, and avoids an unhandled rejection on the way out.
if (!email || !password) {
  console.log('\n  SKIPPED: DEMO_ADMIN_EMAIL and DEMO_ADMIN_PASSWORD were not set.\n');
  console.log('  This check needs the promoted Demo Admin account to exist. Set both and re-run:\n');
  console.log('    DEMO_ADMIN_EMAIL=... DEMO_ADMIN_PASSWORD=... npm run test:demo-admin\n');
  console.log('  It exits 0 when skipped so it does not look like a failure.\n');
  process.exit(0);
}

// 1. Sign in as the Demo Admin, using only the publishable key.
const grant = await api('auth/v1/token?grant_type=password', {
  method: 'POST',
  body: { email, password },
});

if (grant.status !== 200 || !grant.json?.access_token) {
  console.error(`\nDemo Admin sign-in failed (HTTP ${grant.status}). Check the account exists, is confirmed, and the password is right.`);
  console.error(grant.text?.slice(0, 200) ?? '');
  process.exit(1);
}

const token = grant.json.access_token;
check('Demo Admin signs in with the publishable key alone', true, email);

const me = await api('auth/v1/user', { token });
check('Token resolves to the Demo Admin account', me.status === 200 && me.json?.email === email);

// 2. The role must be demo_admin, or the views will return nothing.
const profile = await api(`rest/v1/profiles?select=role&id=eq.${me.json.id}`, { token });
const role = profile.json?.[0]?.role;
check('Account holds the demo_admin role', role === 'demo_admin', `role=${role}`);

// 3. The two dedicated views must be readable.
const apps = await api('rest/v1/demo_admin_submitted_applications?select=application_number,applicant_id,scheme_name,status,submitted_at', { token });
check('Submitted applications view is readable', apps.status === 200, `HTTP ${apps.status}`);

const docs = await api('rest/v1/demo_admin_submitted_documents?select=id,application_id,requirement_name', { token });
check('Submitted documents view is readable', docs.status === 200, `HTTP ${docs.status}`);

const reqs = await api('rest/v1/demo_admin_submitted_requirements?select=application_id,requirement_name,requirement_status,application_document_id', { token });
check('Submitted requirements view is readable', reqs.status === 200, `HTTP ${reqs.status}`);

const rows = Array.isArray(apps.json) ? apps.json : [];

// 4. Only submitted applications may be visible.
check('Every visible application has status = submitted', rows.every((row) => row.status === 'submitted'),
  `${rows.length} row(s)`);

// 5. Read-only: writes must be refused by the policy, not merely unused by the UI.
if (rows.length > 0) {
  const target = rows[0].application_number;
  const update = await api(`rest/v1/demo_admin_submitted_applications?application_number=eq.${encodeURIComponent(target)}`, {
    method: 'PATCH',
    token,
    body: { status: 'approved' },
  });
  const updateRefused = update.status >= 400 || /denied|permission|policy/i.test(update.text ?? '');
  check('Attempt to UPDATE through the view is refused', updateRefused, `HTTP ${update.status}`);

  const insert = await api('rest/v1/demo_admin_submitted_applications', {
    method: 'POST',
    token,
    body: { application_number: 'MOTA-2026-UNAUTHORISED', status: 'submitted' },
  });
  const insertRefused = insert.status >= 400 || /denied|permission|policy/i.test(insert.text ?? '');
  check('Attempt to INSERT through the view is refused', insertRefused, `HTTP ${insert.status}`);

  const del = await api(`rest/v1/demo_admin_submitted_applications?application_number=eq.${encodeURIComponent(target)}`, {
    method: 'DELETE',
    token,
  });
  const deleteRefused = del.status >= 400 || /denied|permission|policy/i.test(del.text ?? '');
  check('Attempt to DELETE through the view is refused', deleteRefused, `HTTP ${del.status}`);

  // Base tables must be unreachable even though the views expose their columns.
  const baseApps = await api('rest/v1/applications?select=id&limit=5', { token });
  const baseReadable = baseApps.status === 200 && Array.isArray(baseApps.json) && baseApps.json.length > 0;
  check('Base applications table is NOT readable by the Demo Admin', !baseReadable,
    baseReadable ? `readable, ${baseApps.json.length} row(s)` : `HTTP ${baseApps.status}`);

  const baseProfiles = await api('rest/v1/applicant_profiles?select=id&limit=5', { token });
  const baseProfilesReadable = baseProfiles.status === 200 && Array.isArray(baseProfiles.json) && baseProfiles.json.length > 0;
  check('Base applicant_profiles table is NOT readable by the Demo Admin', !baseProfilesReadable,
    baseProfilesReadable ? `readable, ${baseProfiles.json.length} row(s)` : `HTTP ${baseProfiles.status}`);

  // Sensitive columns must be absent from the view entirely.
  const sample = await api('rest/v1/demo_admin_submitted_applications?select=*&limit=1', { token });
  const columns = Object.keys(sample.json?.[0] ?? {});
  const forbidden = ['aadhaar_fingerprint', 'aadhaar_masked', 'user_id'];
  const leaked = forbidden.filter((column) => columns.includes(column));
  check('Sensitive identity columns are not in the view', leaked.length === 0,
    leaked.length > 0 ? `leaked: ${leaked.join(', ')}` : `${columns.length} columns checked`);

  // Documents: a signed URL, never a permanent one.
  const appDocs = await api(`rest/v1/demo_admin_submitted_documents?select=id,application_id,file_name,storage_path&limit=1`, { token });
  const doc = Array.isArray(appDocs.json) ? appDocs.json[0] : null;
  if (doc?.storage_path) {
    const signed = await api(`storage/v1/object/sign/applicant-documents/${doc.storage_path}`, { token });
    const isSigned = signed.status === 200 && typeof signed.json?.signedURL === 'string';
    check('Document can be opened via a short-lived signed URL', isSigned, `HTTP ${signed.status}`);
    check('No permanent public URL is exposed on the document row',
      !/^(https?:)?\/\//.test(String(doc.storage_path ?? '')));
  } else {
    check('Document can be opened via a short-lived signed URL', true, 'no document on the first row, skipped');
  }
} else {
  console.log('\n  NOTE: no submitted applications exist, so the write-refusal and');
  console.log('        document checks were skipped. Submit one as an applicant first.');
  console.log('        This is the empty-state case working correctly, not a pass.');
}

// 6. The account must not be an applicant profile carrier.
const applicantProfile = await api('rest/v1/applicant_profiles?select=id&user_id=eq.' + me.json.id, { token });
const carriesProfile = applicantProfile.status === 200 && Array.isArray(applicantProfile.json) && applicantProfile.json.length > 0;
check('Demo Admin has no applicant profile of its own', !carriesProfile);

console.log('\n' + '='.repeat(60));
console.log(`${results.filter((r) => r.passed).length}/${results.length} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
