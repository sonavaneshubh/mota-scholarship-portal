// Tests for the Email OTP + Mobile OTP registration flow.
//
//   node scripts/registration-otp.test.mjs
//
// These run without a network, without a database and without a browser, and
// they are the tests that can honestly be run today. What they can prove is
// that the rules are the same on both sides of the wire, that the server's
// error mapping says the right thing for each way the flow can fail, and that
// the enforcement this flow depends on is still present in the source. What
// they cannot prove is that a code actually reaches a handset, and no claim is
// made that they do -- see docs/registration-otp-setup.md for the manual check
// that has to be run against a real project with a real SMS provider.
//
// The two halves of the validation logic are imported from the real modules, not
// reimplemented here. `src/lib/registrationConfig.ts` is compiled with `tsc`; the
// Edge Function's shared module is transpiled by the TypeScript compiler API
// with its remote import removed, because that import is the only line in the
// file that needs a network and none of the functions under test use it.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPO = resolve(FRONTEND, '..');
const OUT = join(FRONTEND, '.registration-test-build');
const require = createRequire(import.meta.url);
const ts = require('typescript');

/* ------------------------------------------------------------------- runner */

let passed = 0;
let failed = 0;
const failures = [];

function check(group, name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push(`${group}: ${name}${detail ? ` - ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ''}`);
  }
}

function section(title) {
  console.log(`\n--- ${title} ---`);
}

/* ------------------------------------------------------------------ compile */

rmSync(OUT, { recursive: true, force: true });

// Invoked through node rather than node_modules/.bin: spawning a .cmd needs a
// shell, and execFileSync without one fails with EINVAL on Windows.
execFileSync(
  process.execPath,
  [join(FRONTEND, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tsconfig.registration.json'],
  { cwd: FRONTEND, stdio: 'inherit' },
);

function collectFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(full);
    return entry.isFile() && full.endsWith('.js') ? [full] : [];
  });
}

// TypeScript emits relative imports exactly as written, which is extensionless.
// Node's ESM resolver needs a full specifier, so each one is given a .js.
for (const file of collectFiles(OUT)) {
  writeFileSync(
    file,
    readFileSync(file, 'utf8').replace(
      /(from\s+['"])(\.\.?\/[^'"]+?)(['"])/g,
      (match, prefix, specifier, suffix) =>
        specifier.endsWith('.js') ? match : `${prefix}${specifier}.js${suffix}`,
    ),
  );
}

// The Edge Function's shared module. Its one import is a bare remote URL, which
// Node would try to fetch over the network; the functions under test are all pure,
// and the erased type annotations leave no runtime reference to createClient.
const sharedSource = readFileSync(join(REPO, 'supabase', 'functions', '_shared', 'registration.ts'), 'utf8')
  .replace(/^import\s+\{[^}]*\}\s+from\s+'https:\/\/[^']+';?\s*$/gm, '');

const transpiled = ts.transpileModule(sharedSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
});

mkdirSync(join(OUT, 'server'), { recursive: true });
const serverPath = join(OUT, 'server', 'registration.mjs');
writeFileSync(serverPath, transpiled.outputText);

const client = await import(pathToFileURL(join(OUT, 'lib', 'registrationConfig.js')).href);
const server = await import(pathToFileURL(serverPath).href);

const read = (relative) => readFileSync(join(FRONTEND, relative), 'utf8');
const readRepo = (relative) => readFileSync(join(REPO, relative), 'utf8');

// Comments are stripped before every "must not appear" check below: these files
// explain in prose exactly which bad patterns they avoid, so naming one in a
// sentence is documentation, not a defect.
const code = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* -------------------------------------------------- limits agree on both sides */

section('The browser and the server are given the same numbers');

check('limits', 'the OTP length is the same in both copies',
  client.OTP_LENGTH === server.OTP_LENGTH, `${client.OTP_LENGTH} vs ${server.OTP_LENGTH}`);
check('limits', 'the resend cooldown is the same in both copies',
  client.RESEND_COOLDOWN_SECONDS === server.RESEND_COOLDOWN_SECONDS,
  `${client.RESEND_COOLDOWN_SECONDS} vs ${server.RESEND_COOLDOWN_SECONDS}`);
check('limits', 'the resend ceiling is the same in both copies',
  client.MAX_RESENDS_PER_CHANNEL === server.MAX_RESENDS_PER_CHANNEL,
  `${client.MAX_RESENDS_PER_CHANNEL} vs ${server.MAX_RESENDS_PER_CHANNEL}`);
check('limits', 'the wrong-code ceiling is the same in both copies',
  client.MAX_VERIFY_FAILURES_PER_CHANNEL === server.MAX_VERIFY_FAILURES_PER_CHANNEL,
  `${client.MAX_VERIFY_FAILURES_PER_CHANNEL} vs ${server.MAX_VERIFY_FAILURES_PER_CHANNEL}`);
check('limits', 'the attempt lifetime is the same in both copies',
  client.ATTEMPT_TTL_MINUTES === server.ATTEMPT_TTL_MINUTES,
  `${client.ATTEMPT_TTL_MINUTES} vs ${server.ATTEMPT_TTL_MINUTES}`);
check('limits', 'the assumed dialling code is the same in both copies',
  client.DEFAULT_COUNTRY_CODE === server.DEFAULT_COUNTRY_CODE,
  `${client.DEFAULT_COUNTRY_CODE} vs ${server.DEFAULT_COUNTRY_CODE}`);
check('limits', 'the minimum password length is the same in both copies',
  client.PASSWORD_MIN_LENGTH === server.PASSWORD_MIN_LENGTH,
  `${client.PASSWORD_MIN_LENGTH} vs ${server.PASSWORD_MIN_LENGTH}`);

// The attempt's 15-minute life and GoTrue's code life have to agree, or GoTrue
// would accept a code that registration-complete then refuses for being on an
// expired attempt. A code that is valid but unusable is the worst of the two
// failures, because the applicant is told to wait for something that will not
// arrive.
const configToml = readRepo('supabase/config.toml');
const otpExpiry = /^\s*otp_expiry\s*=\s*"(\d+)m"\s*$/m.exec(configToml);
check('limits', 'the code lifetime matches the attempt lifetime',
  Boolean(otpExpiry) && Number(otpExpiry[1]) === server.ATTEMPT_TTL_MINUTES,
  otpExpiry ? `${otpExpiry[1]}m vs ${server.ATTEMPT_TTL_MINUTES}m` : 'otp_expiry not set');
check('limits', 'the minimum password length in config matches the rule',
  /^\s*password_min_length\s*=\s*10\s*$/m.test(configToml),
  (/^\s*password_min_length\s*=\s*(\d+)/m.exec(configToml) ?? ['', 'missing'])[1]);

/* -------------------------------------------------------- mobile normalisation */

section('The same number typed six ways is stored once');

for (const [typed, expected] of [
  ['9876543210', '+919876543210'],
  ['+91 98765 43210', '+919876543210'],
  ['(98765) 43210', '+919876543210'],
  ['+91-9876543210', '+919876543210'],
  ['919876543210', '+919876543210'],
  ['  9876543210  ', '+919876543210'],
]) {
  check('mobile', `"${typed}" normalises the same way on both sides`,
    client.normalizeMobile(typed) === server.normalizeMobile(typed) && server.normalizeMobile(typed) === expected,
    `${client.normalizeMobile(typed)} / ${server.normalizeMobile(typed)}, expected ${expected}`);
}

check('mobile', 'a number with letters in it is refused on both sides',
  client.normalizeMobile('98765abc210') === '' && server.normalizeMobile('98765abc210') === '');
check('mobile', 'a nine-digit number is refused on both sides',
  client.normalizeMobile('987654321') === '' && server.normalizeMobile('987654321') === '');
check('mobile', 'a seventeen-digit number is refused on both sides',
  client.normalizeMobile('+91987654321012345') === '' && server.normalizeMobile('+91987654321012345') === '');
check('mobile', 'an international number is kept as typed',
  client.normalizeMobile('+447700900123') === '+447700900123'
    && server.normalizeMobile('+447700900123') === '+447700900123');
check('mobile', 'an empty value is refused on both sides',
  client.normalizeMobile('') === '' && server.normalizeMobile('') === '');
// normalizeMobile is the whole mobile rule: it either yields E.164 or nothing,
// so a value that survives it needs no second check. These are the shapes a
// caller has to be able to store.
check('mobile', 'a number stored as E.164 passes back through unchanged',
  ['+919876543210', '+447700900123', '+14155552671'].every(
    (value) => server.normalizeMobile(value) === value && client.normalizeMobile(value) === value,
  ));
check('mobile', 'the rejected shapes are rejected by the same rule on both sides',
  ['12345', '+0123456789', '+1234567890123456', '++919876543210', '91987654321abc'].every(
    (value) => client.normalizeMobile(value) === '' && server.normalizeMobile(value) === '',
  ));

/* -------------------------------------------------------------- email + rules */

section('Email, password and username rules agree');

for (const value of ['Applicant@Example.COM', 'a.b+tag@sub.example.co.in']) {
  check('rules', `"${value}" is valid on both sides`,
    client.isValidEmail(value) === server.isValidEmail(value) && server.isValidEmail(server.normalizeEmail(value)));
}
for (const value of ['', 'no-at-sign', 'a@b', 'a@.com', 'no domain@', `${'a'.repeat(250)}@example.com`]) {
  check('rules', `"${value || '(empty)'}" is rejected on both sides`,
    client.isValidEmail(value) === server.isValidEmail(value) && server.isValidEmail(value) === false,
    `${client.isValidEmail(value)} / ${server.isValidEmail(value)}`);
}

for (const value of ['StrongPass1!', 'Abcdefgh1@', `${'x'.repeat(196)}A1!`]) {
  check('rules', `"${value.slice(0, 16)}..." passes the password rule on both sides`,
    client.isValidPassword(value) && server.isValidPassword(value));
}
for (const value of ['short1!A', 'alllowercase1!', 'ALLUPPERCASE1!', 'NoDigits!!!!', 'NoSymbols12345', '', `${'x'.repeat(201)}A1!`]) {
  check('rules', `"${value || '(empty)'}" fails the password rule on both sides`,
    client.isValidPassword(value) === server.isValidPassword(value) && server.isValidPassword(value) === false,
    `${client.isValidPassword(value)} / ${server.isValidPassword(value)}`);
}

for (const value of ['ramesh.kumar', 'a', 'A1234', '1ramesh', 'ramesh kumar', 'ramesh!']) {
  check('rules', `username "${value}" is judged the same way on both sides`,
    client.isValidUsername(value) === server.isValidUsername(value),
    `${client.isValidUsername(value)} / ${server.isValidUsername(value)}`);
}
check('rules', 'an empty username is rejected by the shared rule',
  server.isValidUsername('') === false, 'so registration-start can require it');

// Every rule the start endpoint enforces must come from the shared module,
// because that is the only place they are applied server-side.
const startSource = readRepo('supabase/functions/registration-start/index.ts');
const startCode = code(startSource);
check('rules', 'the start endpoint asks the shared module for its validation',
  /isValidUsername/.test(startCode)
    && /isValidEmail/.test(startCode)
    && /isValidName/.test(startCode)
    && /isValidPassword/.test(startCode)
    && /normalizeMobile/.test(startCode),
  'a rule applied inline instead of in the shared module');
check('rules', 'an omitted username is rejected, not treated as optional',
  /if\s*\(\s*!isValidUsername\(/.test(startCode),
  'the field is required on the form and must be required here');
check('rules', 'the mobile number is required, not optional',
  /if\s*\(\s*!mobileE164\s*\)/.test(startCode));

/* ------------------------------------------------------------- form behaviour */

section('What the registration form refuses before a round trip');

const valid = {
  applicantName: 'Ramesh Kumar',
  username: 'ramesh.kumar',
  password: 'StrongPass1!',
  confirmPassword: 'StrongPass1!',
  email: 'ramesh@example.com',
  mobile: '9876543210',
};

check('form', 'a complete, valid form has no errors', Object.keys(client.getRegistrationErrors(valid)).length === 0,
  JSON.stringify(client.getRegistrationErrors(valid)));

check('form', 'a blank mobile number is now an error',
  Boolean(client.getRegistrationErrors({ ...valid, mobile: '' }).mobile),
  'mobile is required because it is what gets verified');
check('form', 'a mobile number of letters is an error',
  Boolean(client.getRegistrationErrors({ ...valid, mobile: 'call me' }).mobile));
check('form', 'a blank email is an error', Boolean(client.getRegistrationErrors({ ...valid, email: '' }).email));
check('form', 'a blank username is an error', Boolean(client.getRegistrationErrors({ ...valid, username: '' }).username));
check('form', 'a blank name is an error', Boolean(client.getRegistrationErrors({ ...valid, applicantName: '' }).applicantName));
check('form', 'a weak password is an error', Boolean(client.getRegistrationErrors({ ...valid, password: 'weak' }).password));
check('form', 'a mismatched confirmation is an error',
  Boolean(client.getRegistrationErrors({ ...valid, confirmPassword: 'Different1!' }).confirmPassword));
check('form', 'a password and its confirmation are compared as typed, not trimmed',
  Boolean(client.getRegistrationErrors({ ...valid, confirmPassword: ' StrongPass1! ' }).confirmPassword));

/* -------------------------------------------------------- provider error cases */

section('Every way the provider can fail is turned into a specific code');

const cases = [
  [{ code: 'otp_expired', message: 'Email link is invalid or has expired' }, 'OTP_EXPIRED', 400],
  [{ code: 'invalid_token', message: 'Token has expired or is invalid' }, 'INVALID_OTP', 400],
  [{ code: 'bad_json', message: 'Unable to parse JSON' }, 'INVALID_OTP', 400],
  [{ message: 'Invalid verification code' }, 'INVALID_OTP', 400],
  [{ code: 'over_email_send_rate_limit', status: 429 }, 'RATE_LIMITED', 429],
  [{ code: 'over_sms_send_rate_limit', status: 429 }, 'RATE_LIMITED', 429],
  [{ code: 'otp_disabled', status: 400 }, 'NOT_CONFIGURED', 503],
  [{ code: 'sms_provider_disabled', status: 400 }, 'NOT_CONFIGURED', 503],
  [{ code: 'phone_login_disabled', status: 400 }, 'NOT_CONFIGURED', 503],
  [{ code: 'sms_send_failed', status: 400 }, 'PROVIDER_UNAVAILABLE', 502],
  [{ code: 'email_not_sent', status: 400 }, 'PROVIDER_UNAVAILABLE', 502],
  [{ code: 'user_already_exists', status: 422 }, 'EMAIL_TAKEN', 409],
  [{ code: 'unexpected_failure', status: 500 }, 'PROVIDER_UNAVAILABLE', 502],
];

for (const [error, expectedCode, expectedStatus] of cases) {
  const classified = server.classifyAuthError(error);
  check('errors', `${error.code ?? error.message} becomes ${expectedCode}`,
    classified.code === expectedCode && classified.status === expectedStatus,
    `got ${classified.code}/${classified.status}`);
}

check('errors', 'an unrecognised provider error still produces a code and a status',
  typeof server.classifyAuthError({ message: 'something new' }).code === 'string'
    && server.classifyAuthError({ message: 'something new' }).status > 0);
check('errors', 'a missing error does not throw',
  server.classifyAuthError(null).code === 'PROVIDER_UNAVAILABLE');

// An applicant must never be shown a provider's own words. GoTrue messages leak
// hostnames, SQL fragments and token internals when they are passed through.
for (const [error] of cases) {
  const classified = server.classifyAuthError(error);
  const message = server.MESSAGES?.[classified.code];
  check('errors', `${classified.code} has applicant-facing wording`,
    typeof message === 'string' && message.length > 0 && !/select |insert into |token=|http/i.test(message),
    typeof message === 'string' ? message : 'no message');
}

check('errors', 'a disabled SMS provider is never treated as a successful send',
  server.classifyAuthError({ code: 'sms_provider_disabled' }).code === 'NOT_CONFIGURED');

/* ------------------------------------------------------------------- masking */

section('The confirmation copy does not spell out the address or the number');

const maskedEmail = client.maskEmail('ramesh.kumar@example.com');
check('masking', 'the email is shortened but still recognisable',
  maskedEmail.startsWith('r') && maskedEmail.endsWith('@example.com') && !maskedEmail.includes('kumar'),
  maskedEmail);
const maskedMobile = client.maskMobile('+919876543210');
check('masking', 'the mobile number is shortened but still recognisable',
  maskedMobile.startsWith('+91') && maskedMobile.endsWith('3210') && !maskedMobile.includes('87654'),
  maskedMobile);

/* ------------------------------------------- what the Edge Functions require */

section('The server refuses to finish a registration it cannot prove');

const start = startSource;
const verify = readRepo('supabase/functions/registration-verify/index.ts');
const complete = readRepo('supabase/functions/registration-complete/index.ts');
const shared = readRepo('supabase/functions/_shared/registration.ts');

check('enforcement', 'completion requires the email proof to be recorded',
  /!\s*attempt\.email_verified_at/.test(code(complete)));
check('enforcement', 'completion requires the mobile proof to be recorded',
  /!\s*attempt\.mobile_verified_at/.test(code(complete)));
check('enforcement', 'both proofs are refused in one check, so neither alone is enough',
  /!\s*attempt\.email_verified_at\s*\|\|\s*!\s*attempt\.mobile_verified_at/.test(code(complete)));
check('enforcement', 'a missing proof is answered with NOT_VERIFIED and 403',
  /FAILURE\.NOT_VERIFIED,\s*403/.test(code(complete)));
check('enforcement', 'the proof columns are read from the database, not from the request',
  /\.from\(TABLE\)[\s\S]*?email_verified_at[\s\S]*?mobile_verified_at/.test(code(complete))
    && !/body\.(emailVerified|mobileVerified|verified|skip)/.test(code(complete)),
  'a body field that could stand in for a proof');
check('enforcement', 'nothing in the request body can set a role',
  !/body\.role|role:\s*body/.test(code(complete) + verify + start));
check('enforcement', 'the role is written once, by the trigger, not by this flow',
  /role:\s*'applicant'/.test(code(complete))
    && /role\b[^\n.]*never\s+(writes|writing|written)/i.test(complete)
    && !/\brole\s*:\s*(body|input|attempt|data)\b/.test(code(complete) + verify + start),
  'the only role write is the trigger default in the repair path');

// Every log and console call in the three functions, as text. Naming the event
// in a message ("email OTP dispatch failed") is fine and useful; passing the
// applicant's code is not. The code never exists as a named value in these
// functions -- it is handed straight to verifyOtp -- so what is checked here is
// that no log call names the variable holding it, and that no six-digit literal
// has been pasted into one.
const logCalls = (source) =>
  [...code(source).matchAll(/(logSafe|console\.\w+)\(([\s\S]*?)\)\s*;/g)].map((match) => `${match[1]}(${match[2]})`);

check('enforcement', 'no one-time code is ever written to the attempt table',
  !/insert\([^)]*(otp|token|code)\s*:/i.test(code(start)) && !/\botp_token\b/.test(code(start + verify)));
check('enforcement', 'no one-time code is ever logged',
  logCalls(start + verify + complete).every((call) => !/\btoken\b/i.test(call) && !/\b\d{6}\b/.test(call)),
  (logCalls(start + verify + complete).find((call) => /\btoken\b/i.test(call) || /\b\d{6}\b/.test(call)) ?? '').slice(0, 140));
// A `code:` field is fine when it holds one of the flow's own failure codes. What
// must never be logged is the value GoTrue sent.
check('enforcement', 'every logged code is a failure code, never a sent one',
  logCalls(start + verify + complete)
    .flatMap((call) => [...call.matchAll(/\bcode\s*:\s*([\w.?.]+)/g)].map((match) => match[1]))
    .every((value) => /classification\.code|classified\.code|dispatch\.error\.code|error\.code/.test(value)),
  'a logged code that is not one of the flow\'s own failure codes');
check('enforcement', 'the password is never persisted or logged',
  !/logSafe\([^)]*password/.test(code(start + verify + complete))
    && !/insert\([^)]*password/i.test(code(start + complete))
    && !/console\.\w+\([^)]*password/i.test(code(start + verify + complete)),
  'the password in a log line or a written row');
check('enforcement', 'the start endpoint uses the password only to validate it',
  /isValidPassword\(password\)/.test(code(start))
    && !/password\s*[,}]/.test((code(start).match(/isValidPassword[\s\S]{0,200}/) ?? [''])[0]),
  'the value is read after validation and used');

// GoTrue hands back a usable session when a code is accepted. It must not reach
// the browser, and it must not be written anywhere: it would sign the applicant
// in before they have a password. Reading the user id out of it is allowed.
const verifyResponseBodies = [...code(verify).matchAll(/json\(([\s\S]*?),\s*\d+\s*\)/g)].map((match) => match[1]);
check('enforcement', 'the verified session is never returned to the browser',
  verifyResponseBodies.every((body) => !/\bsession\b|\baccess_token\b|\brefresh_token\b/.test(body)),
  (verifyResponseBodies.find((body) => /\bsession\b/.test(body)) ?? '').slice(0, 120));
check('enforcement', 'the verified session is read only for the user id',
  [...code(verify).matchAll(/data\.session[\s\S]{0,60}/g)].every((match) => /\?\.\s*user\?\.\s*id/.test(match[0])),
  'the session is used for something other than an id');
check('enforcement', 'the unprivileged client cannot persist a session',
  /persistSession:\s*false/.test(shared));

check('enforcement', 'the start endpoint never deletes an auth user',
  !/admin\.auth\.admin\.deleteUser/.test(code(start)),
  'registration-start has no business deleting an account');
check('enforcement', 'deleting the phone-only account needs every guard to hold',
  /createdDuringThisAttempt/.test(code(complete)) && /neverUsed/.test(code(complete)));
check('enforcement', 'the phone-only account is completed rather than refused when it is this attempt',
  /userId = phoneOwner\.id/.test(code(complete)));
check('enforcement', 'the throwaway account is not deleted while its profile holds data',
  /profileIsPristine/.test(code(complete)));

check('enforcement', 'a wrong code is counted against the applicant',
  /verify_failures/.test(code(verify)) || /failure_count|verify_failure/.test(code(verify)));
check('enforcement', 'a resend inside the cooldown is refused',
  /RESEND_COOLDOWN_SECONDS/.test(code(verify)) && /cooldown/i.test(verify));
check('enforcement', 'an expired attempt is refused',
  /FAILURE\.ATTEMPT_EXPIRED/.test(code(complete)) && /FAILURE\.ATTEMPT_EXPIRED/.test(code(verify)));
check('enforcement', 'a completed attempt is deleted, so it cannot be replayed',
  /\.from\(TABLE\)\s*\.delete\(\)\s*\.eq\('id',\s*attempt\.id\)/.test(code(complete)));
check('enforcement', 'a replayed completion finds nothing',
  /FAILURE\.ATTEMPT_NOT_FOUND/.test(code(complete)));

check('enforcement', 'an unconfigured deployment is refused rather than faked',
  /if\s*\(!env\)\s*\{?\s*return\s+fail\(FAILURE\.NOT_CONFIGURED/.test(code(start + verify + complete)));
check('enforcement', 'the failure path is the only outcome, and there is no demo fallback',
  !/DEMO_MODE|createMockUser|demo-/.test(code(start + verify + complete + shared)));
check('enforcement', 'no application route or session is established by registration itself',
  !/signIn\(|setSession|signInWithPassword/.test(code(start + verify + complete)));

/* --------------------------------------------- the obsolete path is really gone */

section('The old confirmation-link registration is gone from the portal');

const authService = read('src/services/auth/authService.ts');
const context = read('src/context/ApplicantAuthContext.tsx');
const contextValue = read('src/context/ApplicantAuthContextValue.ts');
const loginCard = read('src/components/home/HomeLoginCard.tsx');

for (const [label, source] of [['authService', authService], ['ApplicantAuthContext', context], ['context value', contextValue], ['HomeLoginCard', loginCard]]) {
  check('removal', `${label} no longer calls auth.signUp`, !/signUp\s*\(/.test(code(source)), 'the old path is still here');
  check('removal', `${label} no longer asks for a confirmation link`,
    !/emailRedirectTo|requiresEmailConfirmation/.test(code(source)));
}

check('removal', 'registration is no longer described as needing an email confirmation',
  !/check your email to confirm|confirm your email before/i.test(code(loginCard + authService + context)),
  'the old confirmation copy is still shown to applicants');
check('removal', 'the password-reset callback is untouched',
  /resetPassword/.test(authService) && /ROUTES\.resetPassword/.test(authService),
  'password reset is a separate flow and must keep working');
check('removal', 'applicant sign-in is untouched',
  /export async function signIn/.test(authService) && /signIn:/.test(contextValue));
check('removal', 'the new flow is what the registration form calls',
  /startRegistration/.test(loginCard) && /verifyOtp/.test(loginCard) && /completeRegistration/.test(loginCard));
check('removal', 'both codes are entered on the registration page itself',
  (code(loginCard).match(/<OtpInput/g) ?? []).length === 2,
  'the registration card should render an email box and a mobile box');
check('removal', 'the applicant is sent to the real login route afterwards',
  /ROUTES\.applicant\.login/.test(loginCard));
check('removal', 'the browser sends no session or privileged key to the functions',
  /apikey:\s*supabasePublicKey/.test(read('src/services/auth/registrationOtpService.ts'))
    && !/Authorization|Bearer/.test(read('src/services/auth/registrationOtpService.ts')));
check('removal', 'no service-role key is exported to the browser',
  !/VITE_SUPABASE_SERVICE_ROLE|SUPABASE_SERVICE_ROLE_KEY/.test(
    read('src/lib/supabase.ts') + read('src/services/auth/registrationOtpService.ts')));
check('removal', 'the password is not written to browser storage',
  !/sessionStorage|localStorage/.test(
    (code(loginCard)).replace(/RESUME_KEY[^\n]*/g, ''))
    || !/password/.test(
      (() => {
        const source = code(loginCard);
        const stored = source.match(/(sessionStorage|localStorage)\.setItem\([^;]*/g) ?? [];
        return stored.join(' ');
      })()),
  'the password would be left in storage');

/* -------------------------------------------- the migration is service-only */

section('The temporary verification state is not readable by anyone');

const migration = readRepo('supabase/migrations/20260927000400_registration_otp_attempts.sql');

check('rls', 'row level security is switched on', /enable\s+row\s+level\s+security/i.test(migration));
check('rls', 'no policy grants access to the attempt rows',
  !/create\s+policy/i.test(migration), 'a policy would make the rows readable');
check('rls', 'the roles a browser holds are revoked',
  /revoke\s+all\s+on\s+(table\s+)?public\.registration_attempts[\s\S]*?from\s+anon[\s\S]*?authenticated/i.test(migration));
check('rls', 'the uniqueness rules cover email and mobile separately',
  /unique[\s\S]*?email/i.test(migration) && /unique[\s\S]*?mobile_e164/i.test(migration));
check('rls', 'an expired attempt stops blocking the address and the number',
  /where\s+status\s*<>?\s*'expired'/i.test(migration));

/* --------------------------------------------------------------------- done */

rmSync(OUT, { recursive: true, force: true });

console.log(`\n${'='.repeat(60)}`);
console.log(`${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log('\nFailures:');
  for (const failure of failures) console.log(`  - ${failure}`);
}
console.log(`${'='.repeat(60)}\n`);
console.log('Not covered here, and not claimed: delivery of a real email or SMS,');
console.log('GoTrue acceptance of a real code, and the behaviour of a live project.');
console.log('Those need a configured provider -- see docs/registration-otp-setup.md.\n');

process.exit(failed === 0 ? 0 : 1);
