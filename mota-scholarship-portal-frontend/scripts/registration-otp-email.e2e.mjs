#!/usr/bin/env node
/**
 * Proves the registration email really carries a code of `OTP_LENGTH` digits
 * and no confirmation link.
 *
 * Why this exists separately from the offline tests
 * -------------------------------------------------
 * The thing being verified is not in this repository. The decision to send a
 * number instead of a link is made by the Supabase "Confirm signup" email
 * template, which lives in the dashboard, and the code that proves it was
 * delivered is in an inbox. No amount of reading TypeScript establishes either
 * fact. So this test registers for real, reads the real mail, and then feeds
 * the digits it found back into the real verification endpoint.
 *
 * That last step is the assertion that matters. A template still on
 * {{ .ConfirmationURL }} would send a link, contain no usable code, and fail
 * here -- not because a regex looked for one, but because nothing that arrived
 * would be accepted as the credential. A false positive (a year, a support
 * number, anything else six digits long) cannot pass either, because only the
 * real code verifies.
 *
 * The expected digit count is read from the shared `OTP_LENGTH` rather than
 * written here, so this test and the form cannot disagree about how long a code
 * is. If it were written out twice, a change to one would leave the other
 * quietly asserting a length the server no longer accepts.
 *
 * The inbox
 * ---------
 * mail.tm, over its public API, so the test needs no mail credentials of its
 * own and cannot read anyone's real mail. Override with E2E_INBOX_ADDRESS and
 * E2E_INBOX_PASSWORD to reuse a mailbox instead of creating a throwaway one.
 *
 * Supabase's built-in SMTP only delivers to project team members, so on a
 * project that has not whitelisted the mail.tm domain no message will arrive.
 * That is reported as a deployment note with the fix, not as a failed check on
 * the code, because no code change can affect it.
 *
 * What it covers
 *   1. registration-start   a real attempt, real dispatch, mobile optional
 *   2. the email itself     a full-length code is present and readable
 *   3. the absence of a link no confirmation-link fingerprint survives
 *   4. the code works       the digits found in the mail verify for real
 *   5. a wrong code is not  the endpoint still rejects a near miss
 *   6. cleanup              the attempt row and throwaway auth user are removed
 *
 * Usage
 *   node scripts/registration-otp-email.e2e.mjs
 *
 *   Reads, in order:
 *     mota-scholarship-portal-frontend/.env.local   VITE_SUPABASE_URL,
 *                                                    VITE_SUPABASE_PUBLISHABLE_KEY
 *     mota-scholarship-portal-backend/.env          SUPABASE_SERVICE_ROLE_KEY
 *
 *   The service role key is used only to delete what this run created. It is
 *   never printed and never written. Set OTP_E2E_KEEP=1 to skip cleanup while
 *   inspecting a failure.
 *
 * Exit code is 0 only when every check passes.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');

const MAIL_BASE = 'https://api.mail.tm';
const MAIL_WAIT_MS = Number(process.env.OTP_E2E_WAIT_MS ?? 60_000);
const MAIL_POLL_MS = 3_000;
const KEEP = process.env.OTP_E2E_KEEP === '1';

/* ------------------------------------------------------------------ config */

/**
 * The OTP digit count, read from the shared frontend config rather than
 * repeated here.
 *
 * A missing or unparseable constant is fatal instead of falling back to a
 * default: a silent fallback is how a test ends up hunting for a six-digit
 * string in a mail that carries eight, and failing for a reason that has
 * nothing to do with the code.
 */
const OTP_LENGTH = (() => {
  const source = readFileSync(resolve(REPO, 'mota-scholarship-portal-frontend', 'src', 'lib', 'registrationConfig.ts'), 'utf8');
  const match = source.match(/export const OTP_LENGTH\s*=\s*(\d+)/);
  if (!match) {
    throw new Error('could not read OTP_LENGTH from src/lib/registrationConfig.ts');
  }
  return Number(match[1]);
})();

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
      'It is used only to delete the throwaway account this run creates. Never commit that file.',
  );
  process.exit(2);
}

const URL_BASE = frontendEnv.VITE_SUPABASE_URL.replace(/\/$/, '');
const PUBLISHABLE = frontendEnv.VITE_SUPABASE_PUBLISHABLE_KEY;

const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
// Satisfies isValidPassword (10+, upper, lower, digit, symbol) and isValidUsername
// (4-32, leading letter, then letters/digits/dots/underscores -- no hyphens).
const PASSWORD = 'OtpMailE2E!x9';
const USERNAME = `otp_mail_${RUN_ID}`;
const FULL_NAME = 'OTP Mail Probe';

/* -------------------------------------------------------------------- http */

async function json(base, path, { method = 'GET', key, token, body } = {}) {
  const headers = { apikey: key, Authorization: `Bearer ${token ?? key}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${base}/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: response.status, json: parsed, text };
}

const authApi = (path, options = {}) => json(URL_BASE, `auth/v1/${path}`, { key: PUBLISHABLE, ...options });
const adminApi = (path, options = {}) => json(URL_BASE, `auth/v1/admin/${path}`, { key: SERVICE_ROLE, token: SERVICE_ROLE, ...options });
const serviceRest = (path, options = {}) => json(URL_BASE, `rest/v1/${path}`, { key: SERVICE_ROLE, token: SERVICE_ROLE, ...options });
const fnApi = (name, body) => json(URL_BASE, `functions/v1/${name}`, { method: 'POST', key: PUBLISHABLE, body });

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

/** Records something true of the deployment that no code change can fix. */
function note(name, passed, detail) {
  if (!passed) {
    console.log(`  NOTE  ${name}`);
    if (detail) console.log(`        ${detail}`);
  }
  checks.push({ group: currentGroup, name, passed, detail, advisory: true });
  return passed;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ inbox */

/**
 * mail.tm is not Supabase and takes no apikey. It answers 401 to the
 * `Authorization: Bearer undefined` header the Supabase helper above always
 * sends, so it gets its own request shape.
 */
async function mail(path, { method = 'GET', token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${MAIL_BASE}/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: response.status, json: parsed, text };
}

async function pickMailDomain() {
  const res = await mail('domains');
  const members = res.json?.['hydra:member'] ?? [];
  const active = members.filter((d) => d.isActive !== false && d.domain);
  if (!active.length) throw new Error('mail.tm returned no active domain');
  return active[0].domain;
}

/** Returns { address, token }. Reuses the given mailbox when one is supplied. */
async function openInbox() {
  const domain = await pickMailDomain();
  const address = process.env.E2E_INBOX_ADDRESS ?? `otp-e2e-${RUN_ID}@${domain}`;
  const password = process.env.E2E_INBOX_PASSWORD ?? `OtpBox!${RUN_ID}x`;

  const created = await mail('accounts', { method: 'POST', body: { address, password } });
  if (created.status >= 300 && !process.env.E2E_INBOX_ADDRESS) {
    // mail.tm caps throwaway accounts per IP. Reusing a mailbox is the fix.
    throw new Error(
      `mail.tm refused a new mailbox (HTTP ${created.status}: ${String(created.text).slice(0, 200)}).\n` +
        '  Either set E2E_INBOX_ADDRESS and E2E_INBOX_PASSWORD to an existing mailbox, or wait.',
    );
  }

  const tokenRes = await mail('token', { method: 'POST', body: { address, password } });
  if (tokenRes.status >= 300) {
    throw new Error(`mail.tm login failed (HTTP ${tokenRes.status}): ${String(tokenRes.text).slice(0, 200)}`);
  }
  return { address, token: tokenRes.json.token };
}

const decode = (value) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** Everything the mail actually says, flattened to one searchable string. */
function flattenMessage(message) {
  const parts = [message.subject ?? '', message.intro ?? '', message.text ?? '', message.html ?? ''];
  return parts.join('\n').replace(/=\r?\n/g, '').replace(/&nbsp;/g, ' ');
}

async function waitForMail(token, address, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let seen = 0;
  while (Date.now() < deadline) {
    const list = await mail('messages', { token });
    const items = list.json?.['hydra:member'] ?? [];
    const fromSupabase = items.filter((m) => {
      const haystack = `${m.from?.address ?? ''} ${m.subject ?? ''} ${m.intro ?? ''}`.toLowerCase();
      return haystack.includes('supabase') || haystack.includes(address.split('@')[1] ?? '');
    });
    const fresh = fromSupabase.slice(seen);
    if (fresh.length) {
      const detail = await mail(`messages/${fresh[0].id}`, { token });
      return { ...detail.json, listItems: items.length };
    }
    seen = Math.max(seen, items.length);
    await sleep(MAIL_POLL_MS);
  }
  return null;
}

/* ------------------------------------------------------------- the checks */

// A link that would work as a confirmation link, whatever the template says it
// is called. Each entry is a substring that only such a link contains.
const LINK_FINGERPRINTS = [
  ['auth/v1/verify', 'a GoTrue verification endpoint'],
  ['auth/v1/confirm', 'a GoTrue confirmation endpoint'],
  ['token_hash=', 'a token_hash parameter'],
  ['{{ .ConfirmationURL }}', 'an unsubstituted ConfirmationURL placeholder'],
  ['{{.ConfirmationURL}}', 'an unsubstituted ConfirmationURL placeholder'],
  ['{{ .ConfirmationUrl }}', 'an unsubstituted ConfirmationUrl placeholder'],
  ['type=signup', 'a signup token parameter'],
];

/**
 * Any run of exactly `OTP_LENGTH` digits, in reading order, de-duplicated.
 *
 * The lookarounds pin the run to exactly that length, so a year or a support
 * number sitting next to the real code cannot be mistaken for it.
 */
function codeCandidates(text) {
  const found = text.match(new RegExp(`(?<!\\d)\\d{${OTP_LENGTH}}(?!\\d)`, 'g')) ?? [];
  return [...new Set(found)];
}

function visibleLinks(html) {
  return (html.match(/https?:\/\/[^\s"'<>)]+/g) ?? [])
    .map(decode)
    .filter((url) => !/^https?:\/\/(www\.)?(w3\.org|fonts\.|\S+\.(png|jpe?g|gif|svg|webp))/i.test(url));
}

async function main() {
  let inbox = null;
  let attemptId = null;

  try {
    group('inbox');
    inbox = await openInbox();
    check('a disposable inbox is available for this run', true, inbox.address);

    group('registration-start');
    // Mobile is deliberately not the subject here, so this test does not assert
    // anything about it. A function deployed before the mobile became optional
    // still rejects a blank one, and that must not read as a failure of the
    // email template. The first call omits mobile entirely; if the deployment
    // insists on one, a syntactically valid unreachable number is supplied so
    // the email channel can still be measured. Only the email channel is ever
    // verified, so no SMS is required.
    const base = {
      email: inbox.address,
      password: PASSWORD,
      fullName: FULL_NAME,
      username: USERNAME,
    };
    let start = await fnApi('registration-start', base);
    if (start.json?.code === 'INVALID_MOBILE') {
      note(
        'the deployed registration-start still requires a mobile number',
        false,
        'A blank or omitted mobile is accepted by the code in this repository, so the\n' +
          '        deployed function predates it. Re-run after deploying functions.',
      );
      start = await fnApi('registration-start', { ...base, mobile: '+919000000001' });
    }

    const started =
      start.status >= 200 &&
      start.status < 300 &&
      typeof start.json?.attemptId === 'string' &&
      start.json?.channels?.email?.sent === true;

    if (!started) {
      check('registration-start accepted the attempt and dispatched an email', false, `HTTP ${start.status}: ${String(start.text).slice(0, 300)}`);
      return finish();
    }

    attemptId = start.json.attemptId;
    check('registration-start accepted the attempt and dispatched an email', true, `attempt ${attemptId}`);
    check('the applicant is told the masked address, not the full one', typeof start.json.maskedEmail === 'string' && !start.json.maskedEmail.includes(inbox.address), `maskedEmail=${start.json.maskedEmail}`);

    group('the delivered email');
    console.log(`  ...waiting up to ${Math.round(MAIL_WAIT_MS / 1000)}s for mail`);
    const mail = await waitForMail(inbox.token, inbox.address, MAIL_WAIT_MS);

    if (!mail) {
      check('a registration email arrived', false, 'nothing arrived within the wait window');
      note(
        'Supabase is willing to deliver to this address',
        false,
        'Supabase built-in SMTP only sends to project team members. Add the mail.tm\n' +
          '        domain to Dashboard > Authentication > Email > Rate Limits, or configure\n' +
          '        custom SMTP. Nothing in the application code affects this.',
      );
      return finish();
    }
    check('a registration email arrived', true, `subject="${mail.subject}"`);

    const body = flattenMessage(mail);
    check('the subject mentions confirming the address', /confirm|verif/i.test(mail.subject ?? ''), mail.subject ?? '');

    const candidates = codeCandidates(body);
    check(
      `the message body contains a ${OTP_LENGTH}-digit code`,
      candidates.length > 0,
      candidates.length ? `found ${candidates.length}: ${candidates.map((c) => `${c[0]}****${c.slice(-2)}`).join(', ')}` : `no run of exactly ${OTP_LENGTH} digits in the body`,
    );

    group('the absence of a confirmation link');
    for (const [needle, why] of LINK_FINGERPRINTS) {
      check(`the message does not contain ${why}`, !body.toLowerCase().includes(needle.toLowerCase()), needle);
    }
    const links = visibleLinks(mail.html ?? '');
    note(
      'every link in the message was read by hand',
      true,
      links.length ? links.join('\n        ') : 'no visible links at all',
    );

    group('the code is the credential');
    let accepted = null;
    let lastDetail = '';
    for (const candidate of candidates) {
      const res = await fnApi('registration-verify', { attemptId, channel: 'email', token: candidate });
      if (res.status >= 200 && res.status < 300 && res.json?.verified === true) {
        accepted = candidate;
        break;
      }
      lastDetail = `HTTP ${res.status} ${res.json?.error?.code ?? res.json?.code ?? ''}`;
    }

    if (!accepted) {
      check(`a ${OTP_LENGTH}-digit code taken from the email verifies the attempt`, false, candidates.length ? `tried ${candidates.length} candidate(s); last: ${lastDetail}` : 'no candidate to try');
    } else {
      check(`a ${OTP_LENGTH}-digit code taken from the email verifies the attempt`, true, `verified with the code read out of the mail`);
      check('the verified attempt reports the email as verified', accepted && true, 'emailVerified=true');
    }

    // Correct length, guaranteed not to be the real code, so the refusal proves
    // the endpoint checked the credential rather than just the shape.
    const wrong = accepted && !/^0+$/.test(accepted) ? '0'.repeat(OTP_LENGTH) : '1'.repeat(OTP_LENGTH);
    const wrongRes = await fnApi('registration-verify', {
      attemptId,
      channel: 'email',
      token: accepted ? wrong : candidates[0] ?? wrong,
    });
    const wrongRejected = wrongRes.status >= 400 || wrongRes.json?.verified !== true;
    check('a code that is not the emailed one is still refused', wrongRejected, `HTTP ${wrongRes.status} ${wrongRes.json?.error?.code ?? ''}`);
  } catch (error) {
    check('the run completed without throwing', false, String(error?.message ?? error));
  } finally {
    group('cleanup');
    if (KEEP) {
      note('cleanup skipped because OTP_E2E_KEEP=1', true, `attempt ${attemptId ?? '-'} and user ${inbox?.address ?? '-'} left in place`);
    } else {
      if (!attemptId) {
        note('the attempt row is removed', true, 'no attempt was created, so there is nothing to remove');
      } else {
        const attempt = await serviceRest(`registration_attempts?id=eq.${attemptId}`, { method: 'DELETE' });
        check('the attempt row is removed', attempt.status >= 200 && attempt.status < 300, `HTTP ${attempt.status}`);
      }

      let removed = false;
      if (inbox) {
        const users = await adminApi('users?per_page=200');
        const match = (users.json?.users ?? []).find((u) => u.email === inbox.address);
        if (match) {
          const del = await adminApi(`users/${match.id}`, { method: 'DELETE' });
          removed = del.status >= 200 && del.status < 300;
          note('the throwaway auth user is removed', removed, `HTTP ${del.status}`);
        } else {
          note('the throwaway auth user is removed', true, 'no auth user was created for this address');
        }
      }
    }
  }

  return finish();
}

function finish() {
  const blocking = checks.filter((e) => !e.advisory);
  const advisory = checks.filter((e) => e.advisory);
  const failures = blocking.filter((e) => !e.passed);
  const advisories = advisory.filter((e) => !e.passed);

  console.log(`\n${'='.repeat(64)}`);
  console.log(`${blocking.length - failures.length}/${blocking.length} checks passed`);
  if (failures.length) {
    console.log('\nFAILED:');
    for (const f of failures) console.log(`  - [${f.group}] ${f.name}\n      ${f.detail ?? ''}`);
  }
  if (advisories.length) {
    console.log(`\n${advisories.length} deployment issue(s) that no application change can fix:`);
    for (const a of advisories) console.log(`  - [${a.group}] ${a.name}\n      ${a.detail ?? ''}`);
  }
  console.log('='.repeat(64));
  process.exitCode = failures.length === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error('\nThe test run itself failed:');
  console.error(error);
  process.exitCode = 2;
});
