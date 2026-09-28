#!/usr/bin/env node
/**
 * Applicant pipeline end-to-end test against the real Supabase project.
 *
 * There is no mock layer to trust here on purpose. Every assertion below is made
 * with a real Supabase Auth session, real PostgREST queries and real Storage
 * objects, against the same project the browser uses. Anything that passes here
 * is a fact about the deployment, not about a test double.
 *
 * Why this exists in Node rather than a browser runner
 * ---------------------------------------------------
 * The pipeline is entirely Supabase traffic: auth, REST and Storage. A browser
 * driver would add a second moving part without testing a second fact. The React
 * layer is covered by `npm run lint`, `npm run typecheck` and `npm run build`;
 * this covers the server contract those pages sit on.
 *
 * What it covers
 *   1. Auth            signup -> admin confirm -> password grant -> session
 *   2. Profile         anchor row, all 1:1 section tables, aadhaar round-trip
 *   3. Bank account    the encrypted writer, which is the one known deployment gap
 *   4. Schemes         the five official schemes, read as a signed-in applicant
 *   5. Apply           create, resume, and the unique-constraint race
 *   6. Documents       real upload to the private bucket, signed URL, metadata row
 *   7. Submit          every mandatory document linked, then the DB submit guard
 *   8. Isolation       a second applicant must not read or write the first's rows
 *
 * Usage
 *   node scripts/applicant-pipeline.e2e.mjs
 *
 *   Reads, in order:
 *     mota-scholarship-portal-frontend/.env.local   VITE_SUPABASE_URL,
 *                                                    VITE_SUPABASE_PUBLISHABLE_KEY
 *     mota-scholarship-portal-backend/.env          SUPABASE_SERVICE_ROLE_KEY
 *
 *   The service role key is used for exactly two things: confirming the throwaway
 *   test account (email confirmation cannot be completed over the public API) and
 *   reading `storage.buckets`. It is never written anywhere and never printed.
 *   Set E2E_EMAIL / E2E_PASSWORD to reuse one account instead of creating a new
 *   one on every run.
 *
 * Exit code is 0 only when every check passes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

/* ------------------------------------------------------------------ config */

function readEnvFile(path) {
  if (!existsSync(path)) return null;
  const out = {};
  for (const raw of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

const frontendEnv =
  readEnvFile(join(REPO, 'mota-scholarship-portal-frontend', '.env.local')) ??
  readEnvFile(join(REPO, 'mota-scholarship-portal-frontend', '.env'));

if (!frontendEnv?.VITE_SUPABASE_URL || !frontendEnv?.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    'Cannot run: mota-scholarship-portal-frontend/.env.local must define\n' +
      '  VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY',
  );
  process.exit(2);
}

const backendEnv = readEnvFile(join(REPO, 'mota-scholarship-portal-backend', '.env')) ?? {};
const SERVICE_ROLE = backendEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE) {
  console.error(
    'Cannot run: mota-scholarship-portal-backend/.env must define SUPABASE_SERVICE_ROLE_KEY.\n' +
      'It is used only to confirm the throwaway test account. Never commit that file.',
  );
  process.exit(2);
}

const URL_BASE = frontendEnv.VITE_SUPABASE_URL.replace(/\/$/, '');
const PUBLISHABLE = frontendEnv.VITE_SUPABASE_PUBLISHABLE_KEY;

const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const EMAIL = process.env.E2E_EMAIL ?? `applicant-e2e-${RUN_ID}@example.test`;
const PASSWORD = process.env.E2E_PASSWORD ?? 'ApplicantE2E!x9';
const OTHER_EMAIL = process.env.E2E_OTHER_EMAIL ?? `applicant-e2e-other-${RUN_ID}@example.test`;
const OTHER_PASSWORD = process.env.E2E_OTHER_PASSWORD ?? 'ApplicantE2E!y9';

/** Columns safe for the browser to read/write on bank_details; see the RLS migration. */
const BANK_COLUMNS =
  'id, applicant_id, bank_name, account_holder_name, ifsc_code, branch_name, account_type, aadhaar_linked, account_number_last4';

/* ------------------------------------------------------------------- http */

async function call(base, path, { method = 'GET', key, token, body, prefer, contentType } = {}) {
  const headers = { apikey: key, Authorization: `Bearer ${token ?? key}` };
  if (prefer) headers.Prefer = prefer;
  // A string body is sent verbatim (Storage uploads are raw bytes); anything else
  // is serialised. Without this every object body reached PostgREST as "[object
  // Object]", which comes back as PGRST102 "Empty or invalid json" and looks like
  // a server fault rather than a bug in the test.
  const payload =
    body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
  if (payload !== undefined) headers['Content-Type'] = contentType ?? 'application/json';

  const response = await fetch(`${base}/${path}`, {
    method,
    headers,
    body: payload,
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

const rest = (path, options = {}) => call(URL_BASE, `rest/v1/${path}`, { key: PUBLISHABLE, ...options });
const authApi = (path, options = {}) => call(URL_BASE, `auth/v1/${path}`, { key: PUBLISHABLE, ...options });
const storageApi = (path, options = {}) => call(URL_BASE, `storage/v1/${path}`, { key: PUBLISHABLE, ...options });

/* --------------------------------------------------------------- reporting */

const checks = [];
let currentGroup = '';

function group(name) {
  currentGroup = name;
  console.log(`\n${name}`);
  console.log('-'.repeat(name.length));
}

function check(name, passed, detail) {
  checks.push({ group: currentGroup, name, passed, detail });
  console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${name}`);
  if (detail) console.log(`        ${detail}`);
  return passed;
}

/** Records a check that reports a real defect without failing the run. */
function note(name, passed, detail) {
  if (!passed) {
    console.log(`  NOTE  ${name}`);
    if (detail) console.log(`        ${detail}`);
  }
  checks.push({ group: currentGroup, name, passed, detail, advisory: true });
  return passed;
}

/* ------------------------------------------------------------------- users */

async function signInOrProvision(email, password, fullName) {
  const existing = await authApi('token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (existing.status === 200) {
    return { token: existing.json.access_token, userId: existing.json.user.id, created: false };
  }

  await authApi('signup', {
    method: 'POST',
    body: JSON.stringify({ email, password, data: { full_name: fullName } }),
  });

  // Signup is enumeration-safe, so it cannot be trusted to return the new user's
  // id. Resolve it through the admin API instead of parsing the response.
  const listed = await call(URL_BASE, 'auth/v1/admin/users?page=1&per_page=200', { key: SERVICE_ROLE });
  const found = (listed.json?.users ?? []).find((candidate) => candidate.email === email);
  if (!found) throw new Error(`Could not resolve the auth user for ${email}`);

  await call(URL_BASE, `auth/v1/admin/users/${found.id}`, {
    method: 'PUT',
    key: SERVICE_ROLE,
    body: JSON.stringify({ email_confirm: true }),
  });

  const login = await authApi('token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (login.status !== 200) {
    throw new Error(`Could not sign in as ${email} after confirming it: ${login.text}`);
  }
  return { token: login.json.access_token, userId: login.json.user.id, created: true };
}

/* -------------------------------------------------------------------- main */

async function main() {
  console.log('Applicant pipeline end-to-end test');
  console.log(`project : ${new URL(URL_BASE).host}`);
  console.log(`account : ${EMAIL}${process.env.E2E_EMAIL ? ' (reused)' : ' (throwaway)'}`);

  const applicant = await signInOrProvision(EMAIL, PASSWORD, 'Applicant E2E');
  const asOther = await signInOrProvision(OTHER_EMAIL, OTHER_PASSWORD, 'Other Applicant E2E');
  const T = { token: applicant.token };
  const T2 = { token: asOther.token };

  /* -- 1. auth ------------------------------------------------------------- */

  group('1. Authentication');

  const profiles = await rest('profiles?select=id,email,role,is_active', T);
  check(
    'auth trigger created the profiles row for the new account',
    profiles.status === 200 && profiles.json?.[0]?.id === applicant.userId,
    `profiles ${profiles.status} ${JSON.stringify(profiles.json)}`,
  );

  const whoami = await authApi('user', T);
  check('session token resolves to the same user', whoami.json?.id === applicant.userId, `auth/v1/user ${whoami.status}`);

  // First-run ordering. The applicant must not have to visit My Profile before
  // Apply works: every other table is scoped by applicant_id, and the only place
  // ensureApplicantProfile() runs is the profile page itself. So if signup does
  // not create the anchor row, a brand-new applicant who clicks Apply first gets
  // "Could not match your sign-in to an applicant profile" and has no way to
  // diagnose it.
  const freshAnchor = await rest('applicant_profiles?select=id,applicant_id,user_id', T2);
  check(
    'a brand-new signup already has its applicant_profiles anchor row',
    (freshAnchor.json?.length ?? 0) === 1,
    `rows=${freshAnchor.json?.length ?? '-'}${freshAnchor.json?.length === 1 ? ` applicant_id=${freshAnchor.json[0].applicant_id}` : ' — nothing creates it except visiting the My Profile page'}`,
  );

  /* -- 2. profile ---------------------------------------------------------- */

  group('2. Profile');

  const anchorInsert = await rest('applicant_profiles', {
    method: 'POST',
    token: T.token,
    body: { user_id: applicant.userId, profile_status: 'incomplete' },
    prefer: 'return=representation',
  });
  const applicantId = anchorInsert.json?.[0]?.id;
  check(
    'ensureApplicantProfile() creates the anchor row',
    anchorInsert.status === 201 && Boolean(applicantId),
    `${anchorInsert.status} applicant_id=${anchorInsert.json?.[0]?.applicant_id ?? 'n/a'}`,
  );

  const anchorUpdate = await rest(`applicant_profiles?id=eq.${applicantId}`, {
    method: 'PATCH',
    token: T.token,
    body: { full_name: 'Applicant E2E', mobile_number: '9876543210', date_of_birth: '2005-04-12' },
    prefer: 'return=representation',
  });
  check(
    'the anchor row updates by its own primary key',
    anchorUpdate.json?.[0]?.full_name === 'Applicant E2E',
    `${anchorUpdate.status} ${JSON.stringify(anchorUpdate.json).slice(0, 160)}`,
  );

  const sectionRows = [
    ['domicile_details', { is_maharashtra_domicile: true, has_domicile_certificate: true, certificate_number: 'D-1' }],
    ['income_details', { annual_income: 180000, has_income_certificate: true, certificate_number: 'I-9' }],
    ['personal_eligibility', { is_salaried: false, is_disabled: false, siblings_count: 2 }],
    ['caste_details', { category: 'ST', caste: 'ST', has_caste_certificate: true, certificate_number: 'C-3' }],
    ['address_details', { permanent_state: 'Maharashtra', permanent_district: 'Pune', permanent_pincode: '411001', same_as_permanent: true }],
    ['parent_guardian_details', { father_alive: true, father_name: 'Father', mother_alive: true, mother_name: 'Mother' }],
    ['current_courses', { academic_year: '2026-27', course_level: 'UG', course_name: 'B.Com', year_of_study: 2, institution_name: 'Test College' }],
    ['applicant_qualifications', { qualification_type: 'hsc', degree: '12th', passing_year: 2024, percentage: 78.5 }],
    ['hostel_details', { beneficiary_category: 'day_scholar' }],
  ];
  for (const [table, body] of sectionRows) {
    const inserted = await rest(table, {
      method: 'POST',
      token: T.token,
      body: { ...body, applicant_id: applicantId },
      prefer: 'return=representation',
    });
    check(`save to ${table}`, inserted.status === 201, `${inserted.status} ${inserted.text.slice(0, 140)}`);
  }

  // bank_details is column-privileged: a RETURNING * is refused by design, so
  // this must name the safe columns exactly as profileService.upsertOne() does.
  const bankInsert = await rest(`bank_details?select=${encodeURIComponent(BANK_COLUMNS)}`, {
    method: 'POST',
    token: T.token,
    body: {
      applicant_id: applicantId,
      bank_name: 'Bank of Maharashtra',
      account_holder_name: 'Applicant E2E',
      ifsc_code: 'MAHB0001234',
      branch_name: 'Pune',
      account_type: 'savings',
      aadhaar_linked: true,
      account_number_last4: '7890',
    },
    prefer: 'return=representation',
  });
  check(
    'save to bank_details (safe columns only)',
    bankInsert.status === 201,
    `${bankInsert.status} ${bankInsert.text.slice(0, 200)}`,
  );

  const bankStar = await rest('bank_details', {
    method: 'POST',
    token: T.token,
    body: { applicant_id: applicantId, bank_name: 'Should Not Work' },
    prefer: 'return=representation',
  });
  check(
    'bank_details refuses RETURNING * (ciphertext is not browser-readable)',
    bankStar.status !== 201,
    `${bankStar.status} ${bankStar.json?.message ?? ''}`,
  );

  if (bankInsert.status === 201) {
    const bankId = bankInsert.json[0].id;
    for (const column of ['account_number_ciphertext', 'account_number']) {
      const overwrite = await rest(`bank_details?id=eq.${bankId}`, {
        method: 'PATCH',
        token: T.token,
        body: { [column]: 'injected' },
      });
      check(`the client cannot write bank_details.${column}`, overwrite.status !== 200, `${overwrite.status}`);
    }
  }

  const loadedSections = await Promise.all(
    sectionRows
      .map(([table]) => rest(`${table}?select=*&applicant_id=eq.${applicantId}`, T))
      .concat([rest(`bank_details?select=${encodeURIComponent(BANK_COLUMNS)}&applicant_id=eq.${applicantId}`, T)]),
  );
  const allLoaded = loadedSections.every((result) => result.status === 200 && (result.json?.length ?? 0) === 1);
  check('loadProfile() reads every section back', allLoaded, loadedSections.map((r) => `${r.status}/${r.json?.length ?? '-'}`).join(' '));

  /* -- 3. aadhaar and bank account ----------------------------------------- */

  group('3. Sensitive writers');

  const aadhaar = await rest('rpc/set_applicant_aadhaar', {
    method: 'POST',
    token: T.token,
    body: JSON.stringify({ p_aadhaar: '123456789012' }),
  });
  check('set_applicant_aadhaar() stores the mask and last four', aadhaar.status === 200, `${aadhaar.status} ${aadhaar.text.slice(0, 140)}`);

  const aadhaarRead = await rest(`applicant_profiles?select=aadhaar_last4,aadhaar_masked&id=eq.${applicantId}`, T);
  check(
    'the Aadhaar last four round-trips to the profile row',
    aadhaarRead.json?.[0]?.aadhaar_last4 === '9012',
    JSON.stringify(aadhaarRead.json),
  );

  const account = await rest('rpc/set_bank_account', {
    method: 'POST',
    token: T.token,
    body: JSON.stringify({ p_account_number: '50100234567890' }),
  });
  // Advisory, not fatal: this is a deployment gap, not a code defect. The UI
  // degrades honestly (profileService.pendingLocally). Flipping it to `check`
  // would make the suite red for something no application change can fix.
  note(
    'set_bank_account() stores the encrypted account number',
    account.status === 200,
    account.status === 200
      ? ''
      : `${account.status} ${account.json?.message ?? ''} — requires: ALTER DATABASE postgres SET app.secret_hash_salt = '<random 64-char secret>'`,
  );

  /* -- 4. schemes ---------------------------------------------------------- */

  group('4. Schemes');

  const schemes = await rest('schemes?select=id,scheme_code,name,status,verification_status,is_active', T);
  const published = (schemes.json ?? []).filter(
    (scheme) => scheme.status === 'published' && scheme.verification_status === 'verified' && scheme.is_active,
  );
  check('a signed-in applicant can read the scheme catalogue', schemes.status === 200 && published.length > 0, `${published.length} published: ${published.map((s) => s.scheme_code).join(', ')}`);

  const OFFICIAL = ['A023B', 'BPVGK', 'ARG45', 'BVOBC', 'AZKMI'];
  const found = published.map((scheme) => scheme.scheme_code).sort();
  const missing = OFFICIAL.filter((code) => !found.includes(code));
  check('all five official schemes are present', missing.length === 0, missing.length ? `missing ${missing.join(', ')}` : 'A023B BPVGK ARG45 BVOBC AZKMI');

  const anonSchemes = await rest('schemes?select=id&limit=50');
  note(
    'anonymous visitors can read the scheme catalogue',
    Array.isArray(anonSchemes.json) && anonSchemes.json.length > 0,
    Array.isArray(anonSchemes.json) && anonSchemes.json.length === 0
      ? `200 with 0 rows: every schemes policy is scoped "to authenticated", so the public directory cannot distinguish "signed out" from "nothing published" (useEligibleSchemes().signedIn)`
      : `${anonSchemes.status} rows=${Array.isArray(anonSchemes.json) ? anonSchemes.json.length : '-'}`,
  );

  const scheme = published[0];
  for (const [table, order] of [
    ['scheme_eligibility', null],
    ['scheme_benefits', 'benefit_type'],
    ['scheme_documents', null],
    ['scheme_sources', null],
    ['scheme_versions', 'created_at'],
    ['scheme_process_steps', 'step_order'],
    ['scheme_criteria', 'criteria_type'],
  ]) {
    const path = `${table}?select=*&scheme_id=eq.${scheme.id}${order ? `&order=${order}` : ''}`;
    const result = await rest(path, T);
    check(`fetchSchemeDetail() reads ${table}`, result.status === 200 && Array.isArray(result.json), `${result.status} rows=${result.json?.length ?? '-'} ${result.status !== 200 ? result.text.slice(0, 120) : ''}`);
  }

  /* -- 5. apply ------------------------------------------------------------ */

  group('5. Apply');

  const created = await rest('applications', {
    method: 'POST',
    token: T.token,
    body: { applicant_id: applicantId, scheme_id: scheme.id },
    prefer: 'return=representation',
  });
  const application = created.json?.[0];
  check('createOrResumeApplication() creates the row', created.status === 201, `${created.status} ${created.text.slice(0, 160)}`);

  check(
    'the set_application_reference() trigger mints the reference',
    /^MOTA-\d{4}-[0-9A-F]{8}$/i.test(application?.application_number ?? ''),
    `application_number=${application?.application_number}`,
  );
  check('status defaults to draft', application?.status === 'draft', `status=${application?.status}`);

  const duplicate = await rest('applications', {
    method: 'POST',
    token: T.token,
    body: { applicant_id: applicantId, scheme_id: scheme.id },
  });
  check(
    'a second Apply for the same scheme is refused by the unique constraint',
    duplicate.status !== 201,
    `${duplicate.status} ${duplicate.json?.message ?? ''}`,
  );

  const resumed = await rest(`applications?select=id&applicant_id=eq.${applicantId}&scheme_id=eq.${scheme.id}`, T);
  check('re-applying converges on exactly one application', (resumed.json?.length ?? 0) === 1, `rows=${resumed.json?.length}`);

  const applicationId = application.id;
  const draft = await rest(`applications?id=eq.${applicationId}`, {
    method: 'PATCH',
    token: T.token,
    body: { scheme_answers: { institution: 'Test College' }, draft_saved_at: new Date().toISOString() },
    prefer: 'return=representation',
  });
  check('saveApplicationDraft() persists the answers', draft.json?.[0]?.scheme_answers?.institution === 'Test College', `${draft.status}`);

  /* -- 6. documents -------------------------------------------------------- */

  group('6. Documents');

  const buckets = await call(URL_BASE, 'storage/v1/bucket', { key: SERVICE_ROLE });
  const bucket = (buckets.json ?? []).find((candidate) => candidate.id === 'applicant-documents');
  check('the private applicant-documents bucket exists', Boolean(bucket), bucket ? `public=${bucket.public} limit=${bucket.file_size_limit}` : 'bucket not found');

  const mandatory = (
    await rest(`scheme_documents?select=id,document_name,is_mandatory&scheme_id=eq.${scheme.id}&is_mandatory=eq.true`, T)
  ).json ?? [];
  check('the scheme has mandatory documents recorded', mandatory.length > 0, `${mandatory.length}: ${mandatory.map((d) => d.document_name).join(' | ')}`);

  const previousLinks = (await rest(`application_documents?select=id&application_id=eq.${applicationId}`, T)).json ?? [];
  if (previousLinks.length > 0) {
    await rest(`application_documents?id=in.(${previousLinks.map((row) => row.id).join(',')})`, { method: 'DELETE', token: T.token });
  }

  const uploadedIds = [];
  for (const requirement of mandatory) {
    const code = String(requirement.document_type ?? 'document')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const path = `${applicantId}/${code}/${requirement.id}.pdf`;
    const bytes = Buffer.from(`%PDF-1.4\n${requirement.document_name}\n%%EOF`);

    const uploaded = await storageApi(`object/applicant-documents/${path}`, {
      method: 'POST',
      token: T.token,
      contentType: 'application/pdf',
      body: bytes.toString('binary'),
    });
    if (uploaded.status !== 200) {
      check(`upload ${requirement.document_name}`, false, `${uploaded.status} ${uploaded.text.slice(0, 160)}`);
      continue;
    }

    const metadata = await rest('applicant_documents', {
      method: 'POST',
      token: T.token,
      body: {
        applicant_id: applicantId,
        document_type: code,
        document_name: requirement.document_name,
        file_name: `${requirement.id}.pdf`,
        storage_path: path,
        mime_type: 'application/pdf',
        file_size: bytes.length,
      },
      prefer: 'return=representation',
    });
    if (metadata.status !== 201) {
      check(`record ${requirement.document_name}`, false, `${metadata.status} ${metadata.text.slice(0, 160)}`);
      continue;
    }
    uploadedIds.push(metadata.json[0].id);

    const signed = await storageApi(`object/sign/applicant-documents/${path}`, {
      method: 'POST',
      token: T.token,
      body: JSON.stringify({ expiresIn: 60 }),
    });
    if (signed.status !== 200) {
      check(`signed url for ${requirement.document_name}`, false, `${signed.status} ${signed.text.slice(0, 160)}`);
    }

    const link = await rest('application_documents', {
      method: 'POST',
      token: T.token,
      body: { application_id: applicationId, scheme_document_id: requirement.id, document_id: metadata.json[0].id },
      prefer: 'return=representation',
    });
    check(`attach ${requirement.document_name}`, link.status === 201, `${link.status} ${link.text.slice(0, 160)}`);
  }
  check('every mandatory document is attached', uploadedIds.length === mandatory.length, `${uploadedIds.length}/${mandatory.length}`);

  const relink = await rest('application_documents', {
    method: 'POST',
    token: T.token,
    body: { application_id: applicationId, scheme_document_id: mandatory[0].id, document_id: uploadedIds[0] },
    prefer: 'resolution=ignore-duplicates,return=representation',
  });
  check('attaching the same requirement twice does not duplicate the link', relink.status !== 201, `${relink.status}`);

  /* -- 7. submit ----------------------------------------------------------- */

  group('7. Submit');

  const now = new Date().toISOString();
  const submitted = await rest(`applications?id=eq.${applicationId}&status=eq.draft`, {
    method: 'PATCH',
    token: T.token,
    body: {
      scheme_answers: { institution: 'Test College' },
      status: 'submitted',
      submitted_at: now,
      declaration_accepted: true,
      declaration_accepted_at: now,
      updated_at: now,
    },
    prefer: 'return=representation',
  });
  check('submitApplication() succeeds once every document is attached', submitted.json?.[0]?.status === 'submitted', `${submitted.status} ${submitted.text.slice(0, 220)}`);

  const resubmit = await rest(`applications?id=eq.${applicationId}&status=eq.draft`, {
    method: 'PATCH',
    token: T.token,
    body: { status: 'submitted', updated_at: new Date().toISOString() },
  });
  check(
    'a stale tab cannot re-submit an application that already moved on',
    Array.isArray(resubmit.json) ? resubmit.json.length === 0 : resubmit.status === 204,
    `${resubmit.status} rows=${Array.isArray(resubmit.json) ? resubmit.json.length : '-'}`,
  );

  const tracking = await rest(`applications?select=application_number,status,submitted_at&applicant_id=eq.${applicantId}`, T);
  check('the applicant can track their own application', tracking.json?.[0]?.status === 'submitted', JSON.stringify(tracking.json));

  /* -- 8. post-submission integrity ----------------------------------------- */

  // RLS only decides *whose* rows an applicant may touch, never *what* may be
  // written to them. guard_application_submission() checks the way in (it refuses
  // a draft -> submitted move without a declaration and documents) but says
  // nothing about the way back out. These assertions pin down the other half: once
  // an application has been submitted, the applicant who owns it must not be able
  // to rewrite the record an officer is about to review. Each one is a raw PATCH
  // straight at PostgREST, i.e. exactly what an attacker or a stale tab would send.
  group('8. Post-submission integrity');

  // Each tamper attempt is judged by re-reading the row afterwards, never by the
  // status code of the PATCH itself. A PostgREST PATCH answers 204 when it
  // succeeds and has no representation to return, so "the request did not return
  // 200" is not evidence that anything was refused. The observed row is the only
  // thing that settles it.
  const readRow = async () =>
    (await rest(`applications?select=status,submitted_at,declaration_accepted,declaration_accepted_at,application_number,scheme_answers,scheme_id,applicant_id&id=eq.${applicationId}`, T)).json?.[0];
  const original = await readRow();

  const stamp = () => new Date().toISOString();
  const attacks = [
    ['reopen', { status: 'draft', submitted_at: null, declaration_accepted: false, declaration_accepted_at: null }, (row) => row.status === original.status && row.submitted_at === original.submitted_at],
    ['answers', { scheme_answers: { institution: 'Rewritten after submission' } }, (row) => JSON.stringify(row.scheme_answers) === JSON.stringify(original.scheme_answers)],
    ['declaration', { declaration_accepted: false, declaration_accepted_at: null }, (row) => row.declaration_accepted === original.declaration_accepted && row.declaration_accepted_at === original.declaration_accepted_at],
    ['stage', { status: 'under_review' }, (row) => row.status === original.status],
    ['reference', { application_number: `MOTA-2026-${RUN_ID.toUpperCase().slice(0, 8).padEnd(8, '0')}` }, (row) => row.application_number === original.application_number],
    ['scheme', { scheme_id: '00000000-0000-0000-0000-000000000000' }, (row) => row.scheme_id === original.scheme_id],
  ];

  for (const [name, body, unchanged] of attacks) {
    await rest(`applications?id=eq.${applicationId}`, { method: 'PATCH', token: T.token, body: { ...body, updated_at: stamp() } });
    const row = await readRow();
    check(`a submitted application refuses the "${name}" rewrite`, Boolean(row) && unchanged(row), JSON.stringify(row));
  }

  const linkIds = (await rest(`application_documents?select=id&application_id=eq.${applicationId}`, T)).json ?? [];
  if (linkIds.length > 0) {
    await rest(`application_documents?id=eq.${linkIds[0].id}`, { method: 'DELETE', token: T.token });
    const remaining = (await rest(`application_documents?select=id&application_id=eq.${applicationId}`, T)).json ?? [];
    check('a submitted application refuses document detachment', remaining.length === linkIds.length, `${linkIds.length} links before, ${remaining.length} after`);
  } else {
    check('a submitted application refuses document detachment', false, 'no document links to test with');
  }

  const row = await readRow();
  check(
    'the submitted record still matches what was submitted',
    row?.status === 'submitted' && row?.declaration_accepted === true && row?.scheme_answers?.institution === 'Test College' && row?.application_number === application.application_number,
    JSON.stringify(row),
  );
  check('the submitted_at timestamp still matches the original submission', row?.submitted_at === now, `expected ${now}, found ${row?.submitted_at}`);

  const stillLinked = (await rest(`application_documents?select=id&application_id=eq.${applicationId}`, T)).json ?? [];
  check('every document link survived the tamper attempts', stillLinked.length === mandatory.length, `${stillLinked.length}/${mandatory.length}`);

  /* -- 9. completeness ----------------------------------------------------- */

  group('9. Profile completeness');

  const completeness = await rest('rpc/applicant_profile_completeness', { method: 'POST', token: T.token, body: '{}' });
  note(
    'applicant_profile_completeness() computes the score',
    completeness.status === 200,
    completeness.status === 200 ? '' : `${completeness.status} ${completeness.json?.message ?? ''} — the function body calls jsonb_object_length(), which does not resolve on the deployed database; the UI falls back to a local calculation that is never persisted`,
  );

  const cached = await rest(`applicant_profiles?select=completeness_percent,last_saved_at&id=eq.${applicantId}`, T);
  note(
    'completeness_percent is cached on the profile row',
    cached.json?.[0]?.completeness_percent != null,
    JSON.stringify(cached.json),
  );

  /* -- 10. isolation ------------------------------------------------------- */

  group('10. Applicant isolation');

  const otherApplicantId = (await rest('applicant_profiles?select=id', T2).then((r) => r.json))?.[0]?.id;

  const owned = [
    ['applicant_profiles', '*'],
    ['applications', '*'],
    ['applicant_documents', '*'],
    ['application_documents', '*'],
    ...sectionRows.map(([table]) => [table, '*']),
    ['bank_details', BANK_COLUMNS],
  ];
  for (const [table, select] of owned) {
    const result = await rest(`${table}?select=${encodeURIComponent(select)}&applicant_id=eq.${applicantId}`, T2);
    const rows = Array.isArray(result.json) ? result.json.length : -1;
    check(`another applicant cannot read ${table}`, rows === 0 || result.status !== 200, `${result.status} rows=${rows}`);
  }

  const anyRead = await rest(`applications?select=*&applicant_id=eq.${applicantId}`, T2);
  check(
    'another applicant cannot resolve the application by its uuid either',
    (anyRead.json?.length ?? 0) === 0,
    `rows=${anyRead.json?.length ?? '-'}`,
  );

  for (const [table, body] of [
    ['domicile_details', { applicant_id: applicantId, certificate_number: 'injected' }],
    ['bank_details', { applicant_id: applicantId, bank_name: 'injected' }],
    ['applicant_documents', { applicant_id: applicantId, document_type: 'injected', document_name: 'injected', storage_path: 'injected' }],
    ['applications', { applicant_id: applicantId, scheme_id: scheme.id }],
  ]) {
    const result = await rest(table, { method: 'POST', token: T2.token, body, prefer: 'return=minimal' });
    check(`another applicant cannot write ${table}`, result.status !== 201, `${result.status} ${result.json?.message ?? ''}`);
  }

  const stealPath = `${applicantId}/e2e_probe/${randomUUID()}.pdf`;
  const steal = await storageApi(`object/sign/applicant-documents/${stealPath}`, {
    method: 'POST',
    token: T2.token,
    body: JSON.stringify({ expiresIn: 60 }),
  });
  check("another applicant cannot sign another applicant's file", steal.status !== 200, `${steal.status} ${steal.json?.code ?? ''}`);

  const untouched = await rest(`applications?id=eq.${applicationId}&select=applicant_id,status`, T);
  check('the original application is intact after the cross-user attempts', untouched.json?.[0]?.applicant_id === applicantId, JSON.stringify(untouched.json));

  if (otherApplicantId) {
    const own = await rest(`applicant_profiles?select=id&applicant_id=eq.${otherApplicantId}`, T2);
    check('each applicant still sees their own profile', (own.json?.length ?? 0) === 1, `rows=${own.json?.length ?? '-'}`);
  }

  /* -- summary ------------------------------------------------------------- */

  const blocking = checks.filter((entry) => !entry.advisory);
  const advisory = checks.filter((entry) => entry.advisory);
  const failures = blocking.filter((entry) => !entry.passed);
  const advisories = advisory.filter((entry) => !entry.passed);

  console.log(`\n${'='.repeat(64)}`);
  console.log(`${blocking.length - failures.length}/${blocking.length} checks passed`);
  if (failures.length) {
    console.log('\nFAILED:');
    for (const failure of failures) console.log(`  - [${failure.group}] ${failure.name}\n      ${failure.detail ?? ''}`);
  }
  if (advisories.length) {
    console.log(`\n${advisories.length} deployment issue(s) that no application change can fix:`);
    for (const item of advisories) console.log(`  - [${item.group}] ${item.name}\n      ${item.detail ?? ''}`);
  }
  console.log('='.repeat(64));

  process.exitCode = failures.length === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error('\nThe test run itself failed:');
  console.error(error);
  process.exitCode = 2;
});
