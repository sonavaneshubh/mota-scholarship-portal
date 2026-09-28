// Per-scheme eligibility test for all five live MOTA schemes.
//
// This exercises the real applicant-facing modules — the ones the browser
// imports — rather than a copy of their logic. `lib/schemeEligibilityView.ts` and
// `services/eligibility.ts` are compiled to JavaScript first (tsconfig.eligibility.json),
// because the project has no test runner and `tsc` is the only TypeScript
// compiler already in devDependencies. Both files import their dependencies with
// `import type`, so the compiled output has no runtime dependency on the Supabase
// client and the tests run without a browser or a network call.
//
// Scheme data comes from the live project by default, over an authenticated
// read-only session, so the test runs against the same rows the portal shows. A
// saved snapshot can be passed instead with --data for an offline run:
//
//   node scripts/scheme-eligibility.test.mjs --data C:\path\to\schemes.json
//
// The service-role key is only used to bypass the authenticated-only RLS policies
// on the scheme tables so a snapshot can be captured. It is never written to disk
// and never printed.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(HERE, '..');
const REPO = resolve(FRONTEND, '..');
const OUT = join(FRONTEND, '.eligibility-test-build');

/* ------------------------------------------------------------------ compile */

rmSync(OUT, { recursive: true, force: true });
// TypeScript's CLI is invoked through node rather than through the .cmd shim in
// node_modules/.bin: spawning a .cmd file needs a shell, and execFileSync without
// one fails with EINVAL on Windows.
execFileSync(
  process.execPath,
  [join(FRONTEND, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', 'tsconfig.eligibility.json'],
  { cwd: FRONTEND, stdio: 'inherit' },
);

/** Every file under `dir` whose name matches `pattern`, recursively. */
function collectFiles(dir, pattern) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(full, pattern);
    return pattern.test(entry.name) ? [full] : [];
  });
}

// TypeScript emits relative imports exactly as they are written in the source —
// extensionless, because that is what Vite and the bundler expect. Node's ESM
// resolver requires a full specifier and throws ERR_MODULE_NOT_FOUND on the
// extensionless form, so every emitted module's relative imports are given a .js
// extension here. Nothing is rewritten inside the modules themselves. This walks
// the whole output rather than one file, because adding a second entry point to
// tsconfig.eligibility.json brings its own imports with it.
const addJsExtension = (file) =>
  writeFileSync(
    file,
    readFileSync(file, 'utf8').replace(
      /(from\s+['"])(\.\.?\/[^'"]+?)(['"])/g,
      (match, prefix, specifier, suffix) =>
        specifier.endsWith('.js') ? match : `${prefix}${specifier}.js${suffix}`,
    ),
  );
for (const file of collectFiles(OUT, /\.js$/)) addJsExtension(file);

const eligibilityModule = join(OUT, 'services', 'eligibility.js');
const view = await import(pathToFileURL(join(OUT, 'lib', 'schemeEligibilityView.js')).href);
const svc = await import(pathToFileURL(eligibilityModule).href);
const formView = await import(pathToFileURL(join(OUT, 'lib', 'applicationFormView.js')).href);
const stageView = await import(pathToFileURL(join(OUT, 'lib', 'applicationStage.js')).href);

/* --------------------------------------------------------------------- data */

const CODES = ['A023B', 'ARG45', 'AZKMI', 'BPVGK', 'BVOBC'];

function readEnv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0) out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

async function fetchLiveData() {
  const fe = readEnv(join(FRONTEND, '.env.local'));
  const be = readEnv(join(REPO, 'mota-scholarship-portal-backend', '.env'));
  const url = (fe.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
  const publishable = fe.VITE_SUPABASE_PUBLISHABLE_KEY;
  const serviceRole = be.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    throw new Error(
      'Cannot read live scheme data: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are needed. ' +
        'Pass --data <snapshot.json> to run offline instead.',
    );
  }

  const call = async (path, method = 'GET') => {
    const r = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` },
    });
    const text = await r.text();
    if (!r.ok) throw new Error(`${path} -> ${r.status} ${text.slice(0, 200)}`);
    return text ? JSON.parse(text) : [];
  };

  const schemes = await call('schemes?select=*&order=scheme_code');
  const ids = schemes.map((s) => s.id).join(',');
  const [eligibility, criteria, documents, benefits, processSteps, sources] = await Promise.all([
    call(`scheme_eligibility?scheme_id=in.(${ids})`),
    call(`scheme_criteria?scheme_id=in.(${ids})&order=criteria_type`),
    call(`scheme_documents?scheme_id=in.(${ids})`),
    call(`scheme_benefits?scheme_id=in.(${ids})`),
    call(`scheme_process_steps?scheme_id=in.(${ids})&order=step_order`),
    // Fetched so a check can prove the source rows are still on record even
    // though the applicant-facing form no longer counts them. Never rendered.
    call(`scheme_sources?scheme_id=in.(${ids})`),
  ]);

  const byScheme = new Map(schemes.map((s) => [s.id, { scheme: s, eligibility: null, criteria: [], documents: [], benefits: [], processSteps: [], sources: [] }]));
  const attach = (rows, key) => {
    for (const row of rows) byScheme.get(row.scheme_id)?.[key].push(row);
  };
  attach(criteria, 'criteria');
  attach(documents, 'documents');
  attach(benefits, 'benefits');
  attach(processSteps, 'processSteps');
  attach(sources, 'sources');
  for (const row of eligibility) {
    const entry = byScheme.get(row.scheme_id);
    if (entry) entry.eligibility = row;
  }

  return { fetchedAt: new Date().toISOString(), publishable, schemes: [...byScheme.values()] };
}

const dataFlag = process.argv.indexOf('--data');
const data =
  dataFlag > -1
    ? JSON.parse(readFileSync(process.argv[dataFlag + 1], 'utf8'))
    : await fetchLiveData();

const saveFlag = process.argv.indexOf('--save');
if (saveFlag > -1) {
  writeFileSync(process.argv[saveFlag + 1], JSON.stringify(data, null, 2));
  console.log(`snapshot written to ${process.argv[saveFlag + 1]}`);
}

/* ----------------------------------------------------------------- harness */

let passed = 0;
let failed = 0;
const failures = [];

function check(schemeCode, name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    failures.push(`${schemeCode}: ${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

/**
 * Every string the applicant can see for a scheme, joined for substring checks.
 *
 * The free-text columns are passed through the same sanitiser the components use.
 * Reading the raw column instead would fail on every scheme, because the raw
 * column is where the citations live — the point of the check is that the
 * sanitiser runs on the way to the screen, not that the database is clean.
 */
function visibleText(entry) {
  const { eligibility } = entry;
  const buckets = view.applicantRules(eligibility?.other_rules ?? null);
  const rows = eligibility
    ? view.buildEligibilityRows({ eligibility, criteria: entry.criteria, otherRules: eligibility.other_rules })
    : [];
  const clean = (value) => view.stripInternalProvenance(value) ?? '';
  const parts = [
    ...rows.map((r) => `${r.label}: ${r.value}`),
    ...Object.values(buckets).flatMap((list) => list.flatMap((e) => [e.label, ...e.lines])),
    ...entry.criteria.map((c) =>
      [c.title, clean(c.description), clean(c.text_value), clean(c.applies_to)].filter(Boolean).join(' '),
    ),
    ...entry.documents.map((d) => [d.document_name, clean(d.description)].filter(Boolean).join(' ')),
    ...entry.benefits.map((b) =>
      [b.benefit_type, clean(b.description), clean(b.conditions)].filter(Boolean).join(' '),
    ),
    // The verification pipeline is applicant-facing too, and its `title`,
    // `description`, `actor` and `sla_or_timeline` are all free text.
    ...entry.processSteps.flatMap((s) =>
      [s.title, clean(s.description), clean(s.actor), clean(s.sla_or_timeline)].filter(Boolean).join(' '),
    ),
  ];
  return parts.join('\n');
}

/**
 * Strings that must never reach the applicant.
 *
 * Two entries are deliberately absent, and a check further down proves it:
 *
 *   '§'            The section symbol is how every guideline citation is written
 *                  ("p.7 §2.6"), so it is forbidden as a *citation* — `§` plus a
 *                  digit run ending in a dot. It is not forbidden on its own,
 *                  because the fellowship and post-matric schemes both define
 *                  the recognised institutions as those recognised "under
 *                  §2(f)/12(B) of the UGC Act", where § means *section* and is the
 *                  one thing in that sentence an applicant needs.
 *
 *   'not specified official'  The Aadhaar Card rows honestly say "Accepted file
 *                  formats and maximum file size are not specified officially for
 *                  this scheme". That is the applicant being told there is no
 *                  format restriction, not audit metadata. The machine-shaped
 *                  `not_specified` key stays forbidden; the English does not.
 */
const FORBIDDEN = [
  'source_ref',
  'source:',
  'open_conflict',
  'open conflict',
  'not_specified',
  'removed_unsupported',
  'removed unsupported',
  'fabricat',
  'report 7.',
  'report 2.',
  'slot_cascade',
  'never use income',
  'intentionally null',
  '[object object]',
  'p.3-4',
];

/** Guideline section references, as distinct from UGC Act section references. */
const GUIDELINE_CITATION = /p{1,2}\.\s*\d|§\s*\d+\.\d/;

const entryFor = (code) => data.schemes.find((s) => s.scheme.scheme_code === code);

console.log(`\nScheme eligibility test — ${data.schemes.length} schemes, ${new Date().toISOString()}\n`);

for (const code of CODES) {
  const entry = entryFor(code);
  console.log(`--- ${code} ${entry?.scheme?.name ?? '(not found)'} ---`);

  if (!entry) {
    check(code, 'scheme exists', false, 'not returned by the query');
    continue;
  }
  if (!entry.eligibility) {
    check(code, 'has an eligibility row', false);
    continue;
  }

  const { eligibility, criteria } = entry;
  check(code, 'scheme is published, verified and active',
    entry.scheme.status === 'published' && entry.scheme.verification_status === 'verified' && entry.scheme.is_active === true,
    `status=${entry.scheme.status} verified=${entry.scheme.verification_status} active=${entry.scheme.is_active}`);

  const text = visibleText(entry);
  const leaks = FORBIDDEN.filter((needle) => text.toLowerCase().includes(needle.toLowerCase()));
  check(code, 'no internal metadata or source references leak to the applicant', leaks.length === 0, leaks.join(', '));
  check(code, 'no guideline page or section citation survives', !GUIDELINE_CITATION.test(text),
    (text.match(GUIDELINE_CITATION) ?? []).slice(0, 3).join(' | '));

  const buckets = view.applicantRules(eligibility.other_rules);
  const internalKeys = view.classifyOtherRules(eligibility.other_rules).internal.map((e) => e.key);
  check(code, 'provenance and audit notes are classified as internal, not dropped',
    internalKeys.includes('source_ref') && internalKeys.includes('open_conflict'),
    `internal: ${internalKeys.join(', ')}`);
  check(code, 'the internal bucket never reaches applicantRules()',
    buckets.internal === undefined || buckets.internal.length === 0);

  // Nested jsonb must be flattened, not stringified.
  const nested = [];
  for (const list of Object.values(buckets)) {
    for (const entryRule of list) nested.push(...entryRule.lines);
  }
  check(code, 'no [object Object] from a nested jsonb rule', !nested.some((l) => l.includes('[object')));

  // A missing profile value must never be reported as a failure.
  const emptyProfile = {
    category: '', annual_income: null, course: null, gender: null, age: null,
    state: null, district: null, previous_percentage: null,
    admission_mode: null, institution_type: null, is_hosteller: null,
  };
  const blank = svc.evaluateEligibility(eligibility, emptyProfile, criteria);
  check(code, 'an empty profile is NEEDS_REVIEW, never NOT_ELIGIBLE', blank.result === 'NEEDS_REVIEW', blank.result);

  // A fully compliant profile must be able to reach ELIGIBLE.
  const good = {
    category: 'ST', annual_income: 1, course: 'x', gender: 'Female', age: 22,
    state: 'x', district: 'x', previous_percentage: 90,
    admission_mode: null, institution_type: null, is_hosteller: null,
  };
  const passing = svc.evaluateEligibility(eligibility, good, criteria);
  check(code, 'a compliant profile can reach ELIGIBLE', passing.result === 'ELIGIBLE',
    `${passing.result} / ${passing.missing.join('; ')}`);

  // A profile that breaks a numeric limit must be NOT_ELIGIBLE.
  if (typeof eligibility.maximum_family_income === 'number') {
    const rich = svc.evaluateEligibility(eligibility, { ...good, annual_income: eligibility.maximum_family_income + 1 }, criteria);
    check(code, 'exceeding the income ceiling is NOT_ELIGIBLE', rich.result === 'NOT_ELIGIBLE', rich.result);
  }
  if (typeof eligibility.maximum_age === 'number') {
    const old = svc.evaluateEligibility(eligibility, { ...good, age: eligibility.maximum_age + 1 }, criteria);
    check(code, 'exceeding the maximum age is NOT_ELIGIBLE', old.result === 'NOT_ELIGIBLE', old.result);
  }
  if (typeof eligibility.minimum_percentage === 'number') {
    const low = svc.evaluateEligibility(eligibility, { ...good, previous_percentage: eligibility.minimum_percentage - 1 }, criteria);
    check(code, 'falling short of the minimum percentage is NOT_ELIGIBLE', low.result === 'NOT_ELIGIBLE', low.result);
  }

  // Every documented requirement must appear somewhere the applicant can read.
  const rows = view.buildEligibilityRows({ eligibility, criteria, otherRules: eligibility.other_rules });
  const shown = Object.values(view.applicantRules(eligibility.other_rules))
    .flat()
    .flatMap((e) => e.lines)
    .join(' ');
  const gates = [];
  if (typeof eligibility.maximum_age === 'number') gates.push('age');
  if (typeof eligibility.minimum_age === 'number') gates.push('age');
  if (typeof eligibility.maximum_family_income === 'number') gates.push('income');
  if (typeof eligibility.minimum_percentage === 'number') gates.push('percentage');
  if (view.courseDependentAges(criteria).length > 0) gates.push('age');
  for (const gate of gates) {
    check(code, `the ${gate} requirement is stated to the applicant`,
      rows.some((r) => r.label.toLowerCase().includes(gate)) || shown.toLowerCase().includes(gate));
  }

  console.log('');
}

/* ------------------------------------------- cross-scheme: ARG45 must be free */

const arg45 = entryFor('ARG45');
if (arg45?.eligibility) {
  console.log('--- ARG45: no income criterion (guideline is explicit) ---');
  check('ARG45', 'maximum_family_income is not set', arg45.eligibility.maximum_family_income === null);
  check('ARG45', 'the scheme note records that there is no income criterion',
    view.isIncomeFree(arg45.eligibility.other_rules));
  const rich = svc.evaluateEligibility(
    arg45.eligibility,
    { category: 'ST', annual_income: 99_000_000, course: 'Ph.D', gender: 'Female', age: 30, state: 'x', district: 'x', previous_percentage: 80, admission_mode: null, institution_type: null, is_hosteller: null },
    arg45.criteria,
  );
  check('ARG45', 'a very high income is not a reason for rejection', rich.result !== 'NOT_ELIGIBLE', rich.result);
  const arg45Text = visibleText(arg45);
  check('ARG45', 'the Income Certificate is not presented as mandatory',
    !/income certificate[^.]*mandatory|mandatory[^.]*income certificate/i.test(arg45Text));
  console.log('');
}

/* ------------------------------------ cross-scheme: conditional docs per scheme */

console.log('--- Conditional documents are not shown as mandatory ---');
for (const code of CODES) {
  const entry = entryFor(code);
  if (!entry) continue;
  const mandatoryNames = entry.documents
    .filter((d) => d.is_mandatory === true)
    .map((d) => String(d.document_name).toLowerCase());
  const optional = entry.documents.filter((d) => d.is_mandatory !== true);
  for (const doc of optional) {
    const name = String(doc.document_name).toLowerCase();
    const clash = mandatoryNames.some((m) => m.includes(name.split(' ')[0]) && name.includes(m.split(' ')[0]) && m === name);
    check(code, `"${doc.document_name}" is not also listed as mandatory`, !clash);
  }
  // ARG45's Divyangjan certificate and offer of admission are conditional.
  if (code === 'ARG45') {
    const divy = entry.documents.find((d) => /divyangjan|disab/i.test(d.document_name ?? ''));
    const offer = entry.documents.find((d) => /offer of admission/i.test(d.document_name ?? ''));
    check(code, 'the Divyangjan certificate is conditional, not mandatory', divy && divy.is_mandatory !== true,
      divy ? `is_mandatory=${divy.is_mandatory}` : 'document not found');
    check(code, 'the offer of admission is conditional, not mandatory', offer && offer.is_mandatory !== true,
      offer ? `is_mandatory=${offer.is_mandatory}` : 'document not found');
    const income = entry.documents.find((d) => /income/i.test(d.document_name ?? ''));
    check(code, 'the Income Certificate is not a fresh or renewal requirement for the fellowship',
      !income || (income.is_required_fresh !== true && income.is_required_renewal !== true),
      income ? `fresh=${income.is_required_fresh} renewal=${income.is_required_renewal}` : 'not present');
  }
  if (code === 'BPVGK' || code === 'BVOBC') {
    const prev = entry.documents.find((d) => /previous|last year/i.test(d.document_name ?? ''));
    check(code, 'the previous-marksheet requirement starts from course year 2',
      prev ? prev.required_from_course_year === 2 : true,
      prev ? `required_from_course_year=${prev.required_from_course_year}` : 'document not present');
  }
}
console.log('');

/* ------------------------------------------- cross-scheme: HRA is not a gate */

console.log('--- HRA is benefits information, not an eligibility condition ---');
for (const code of CODES) {
  const entry = entryFor(code);
  if (!entry?.eligibility) continue;
  const buckets = view.applicantRules(entry.eligibility.other_rules);
  const asGate = buckets.eligibility.some((e) => /hra|hostel/i.test(e.key) || /hra|hostel/i.test(e.lines.join(' ')));
  check(code, 'HRA/hostel notes are not in the eligibility-condition bucket', !asGate);
  const hraBenefit = entry.benefits.some((b) => /hra|hostel|maintenance/i.test(`${b.benefit_type} ${b.description ?? ''}`));
  if (hraBenefit) {
    check(code, 'HRA/hostel amounts are described under benefits', true);
  }
}
console.log('');

/* --------------------------------------- cross-scheme: the form is readable text */

console.log('--- The application form shows labels and values, not scaffolding ---');
for (const code of CODES) {
  const entry = entryFor(code);
  if (!entry) continue;

  
  // benefit_type is a storage key. The form used to print it as the title of
  // every benefit, which put "course fee private engineering ceiling" in front
  // of the applicant, then printed the real description again underneath.
  const keyish = entry.benefits.filter((b) =>
    /\b[a-z]+_[a-z_]+\b/.test(b.benefit_type ?? '') &&
    (view.stripInternalProvenance(b.description ?? '') ?? '') === '');
  check(code, 'a benefit with a description is never titled by its storage key', keyish.length === 0,
    keyish.map((b) => b.benefit_type).join(', '));

  const dupes = entry.benefits.filter((b) => {
    const description = view.stripInternalProvenance(b.description ?? '');
    return description && description === view.stripInternalProvenance(b.conditions ?? '');
  });
  check(code, 'no benefit repeats its description as its condition', dupes.length === 0,
    dupes.map((b) => b.benefit_type).join(', '));
}

// A bracketed course label is only a duration when it reads like one. BVOBC's
// "Class XI to Post Graduation (studies in India)" is a qualifier, and it used
// to render as a "Course duration: studies in India" row.
for (const code of CODES) {
  const entry = entryFor(code);
  if (!entry?.eligibility) continue;
  const rows = view.buildEligibilityRows({
    eligibility: entry.eligibility,
    criteria: entry.criteria,
    otherRules: entry.eligibility.other_rules,
  });
  const bogus = rows.filter((r) => /^course duration/i.test(r.label) && !/\d|year|month|semester|term/i.test(r.value));
  check(code, 'every Course duration row states a real length of time', bogus.length === 0,
    bogus.map((r) => `${r.label}: ${r.value}`).join(' | '));
}
console.log('');

/* ------------------------------------------- cross-scheme: no shared rules */

console.log('--- Schemes state their own rules, not a copied template ---');
const ruleSets = new Map();
for (const code of CODES) {
  const entry = entryFor(code);
  if (!entry?.eligibility) continue;
  ruleSets.set(code, Object.keys(view.classifyOtherRules(entry.eligibility.other_rules).eligibility).sort().join(','));
}
const distinctRuleSets = new Set(ruleSets.values());
console.log(`        distinct eligibility rule sets across the five schemes: ${distinctRuleSets.size}`);
check('all', 'schemes do not all share one identical rule set', distinctRuleSets.size >= 3, [...ruleSets].map(([c, r]) => `${c}=[${r}]`).join(' '));

/* ------------------------------------------------------------------ report */

console.log('\n--- The sanitiser must not eat real rules ---');
const SANITISER_CASES = [
  {
    name: 'drops a trailing citation and keeps the rule',
    input: 'Rs. 5,000 per annum per student, without bills or vouchers. Component I, released to the student. Source: national-fellowship-scholarship.pdf Part-B p.19 §2.5, p.21 §4.1.',
    expect: 'Rs. 5,000 per annum per student, without bills or vouchers. Component I, released to the student.',
  },
  {
    name: 'drops an internal note but keeps the instruction that follows it',
    input: 'FAQ-SOURCED, NON-GATEKEEPING. The National Fellowship guideline states there is no income criterion for eligibility.',
    expect: 'The National Fellowship guideline states there is no income criterion for eligibility.',
  },
  {
    name: 'drops an open-conflict note and keeps the allocation rule',
    input: 'Separate merit list is drawn per field of study. Open conflict (report 7.6): the MoTA FAQ does not list Fine Arts as a separate covered field.',
    expect: 'Separate merit list is drawn per field of study.',
  },
  {
    name: 'leaves an ordinary sentence untouched',
    input: 'Valid account in a Scheduled Bank, linked with Aadhaar and mobile number.',
    expect: 'Valid account in a Scheduled Bank, linked with Aadhaar and mobile number.',
  },
  {
    name: 'does not split on the full stop in an amount',
    input: 'Rs. 5,000 per annum.',
    expect: 'Rs. 5,000 per annum.',
  },
  {
    name: 'leaves a short label alone',
    input: 'Per annum',
    expect: 'Per annum',
  },
];
for (const testCase of SANITISER_CASES) {
  check('sanitiser', testCase.name, view.stripInternalProvenance(testCase.input) === testCase.expect,
    `got: ${JSON.stringify(view.stripInternalProvenance(testCase.input))}`);
}
check('sanitiser', 'a value that is only a citation disappears entirely',
  view.stripInternalProvenance('Source: post-matric-scholarship.pdf p.8 §3.3. See report 2.4 for detail.') === null,
  JSON.stringify(view.stripInternalProvenance('Source: post-matric-scholarship.pdf p.8 §3.3. See report 2.4 for detail.')));
check('sanitiser', 'null and empty input are handled', view.stripInternalProvenance(null) === null && view.stripInternalProvenance('') === null);

console.log('\n--- A section symbol is a citation or a legal reference, and the two differ ---');
{
  // These four strings are the whole reason '§' cannot simply be banned.
  const ACT_SENTENCE =
    'Universities/Institutes/Colleges under §2(f)/12(B) of the UGC Act, Deemed Universities under Section 3 of the UGC Act, 1956, eligible for UGC grant-in-aid.';
  const CITED_SENTENCE = 'Rs. 5,000 per annum per student, without bills or vouchers. Source: fellowship.pdf Part-B p.19 §2.5, p.21 §4.1.';

  check('sanitiser', 'a UGC Act section reference is applicant information, not provenance',
    view.stripInternalProvenance(ACT_SENTENCE) === ACT_SENTENCE,
    JSON.stringify(view.stripInternalProvenance(ACT_SENTENCE)).slice(0, 160));
  check('sanitiser', 'a guideline section reference in the same shape is still removed',
    view.stripInternalProvenance(CITED_SENTENCE) === 'Rs. 5,000 per annum per student, without bills or vouchers.',
    JSON.stringify(view.stripInternalProvenance(CITED_SENTENCE)));
  check('sanitiser', 'the recognised-institution rule survives classification',
    view.classifyOtherRules({ institution_type: ACT_SENTENCE }).internal.length === 0 &&
      Object.values(view.classifyOtherRules({ institution_type: ACT_SENTENCE }))
        .flat().some((e) => e.lines.some((l) => l.includes('§2(f)'))),
    JSON.stringify(view.classifyOtherRules({ institution_type: ACT_SENTENCE }).internal));
  check('sanitiser', 'a value carrying a guideline citation is withheld even with an Act reference',
    view.classifyOtherRules({ institution_type: `${ACT_SENTENCE} Source: x.pdf p.7 §2.6.` }).internal.length === 1,
    JSON.stringify(view.classifyOtherRules({ institution_type: `${ACT_SENTENCE} Source: x.pdf p.7 §2.6.` }).internal.map((e) => e.key)));
  check('sanitiser', 'the Aadhaar "not specified officially" note is kept for the applicant',
    (view.stripInternalProvenance('Accepted file formats and maximum file size are not specified officially for this scheme.') ?? '').includes('not specified officially'));
  check('sanitiser', 'a sentence pointing at our own schema is dropped on its own',
    view.stripInternalProvenance('The fee component is decided by the State Level Fee Fixation Committee, so no single central amount exists. Course Groups I-IV are defined in scheme_criteria. States may pay more.') ===
      'The fee component is decided by the State Level Fee Fixation Committee, so no single central amount exists. States may pay more.',
    JSON.stringify(view.stripInternalProvenance('The fee component is decided by the State Level Fee Fixation Committee, so no single central amount exists. Course Groups I-IV are defined in scheme_criteria. States may pay more.')));
}

console.log('\n--- The database is not modified by any of this ---');
{
  let rawCitations = 0;
  let rawConflictKeys = 0;
  for (const entry of data.schemes) {
    for (const benefit of entry.benefits ?? []) {
      if (/Source:/i.test(`${benefit.conditions ?? ''}${benefit.description ?? ''}`)) rawCitations++;
    }
    if (entry.eligibility?.other_rules?.open_conflict) rawConflictKeys++;
    if (entry.eligibility?.other_rules?.source_ref) rawConflictKeys++;
  }
  check('database', 'the guideline citations are still in scheme_benefits', rawCitations > 0, `${rawCitations} rows`);
  check('database', 'open_conflict and source_ref are still in other_rules', rawConflictKeys === 10, `${rawConflictKeys} keys across 5 schemes`);
  check('database', 'removed_unsupported_rule is still recorded on the fellowship',
    entryFor('ARG45')?.eligibility?.other_rules?.removed_unsupported_rule !== undefined);
  check('database', 'not_specified_officialy is still recorded on every scheme',
    CODES.every((code) => Array.isArray(entryFor(code)?.eligibility?.other_rules?.not_specified_officialy)));
  const withSources = CODES.filter((code) => (entryFor(code)?.sources?.length ?? 0) > 0);
  check('database', 'scheme_sources still holds a source for every scheme',
    withSources.length === CODES.length,
    CODES.map((code) => `${code}=${entryFor(code)?.sources?.length ?? 0}`).join(' '));
}

console.log('\n--- The application form never narrates our own provenance ---');
{
  /*
   * The form used to close with "Verified against N official source(s), last
   * checked <date>", counting rows in scheme_sources. Those rows stay in the
   * database; this asserts the form does not read them, so the internal
   * bookkeeping cannot creep back into the applicant's view.
   */
  const form = readFileSync(
    new URL('../src/components/applicant/ApplicantFormSchemeSections.tsx', import.meta.url), 'utf8');
  check('form', 'the form does not read scheme_sources', !/\bsources\b/.test(form),
    (form.match(/.*\bsources\b.*/) ?? [''])[0].trim());
  check('form', 'the form shows no source count or retrieval date',
    !/verified against|last checked|retrieved_at/i.test(form));
}

console.log('\n--- Two steps: Additional Information, then the Application Form ---');
{
  /*
   * The flow used to be form -> review -> submit, with a Review stage that
   * repeated the applicant's own answers as a read-back and, before an earlier
   * fix, also re-rendered the scheme's own description, benefits, eligibility
   * and conditions. The review stage is gone: Step 2 is the read-back, and
   * Submit sits directly under it.
   *
   * These are source-level assertions because this project has no component test
   * runner. They assert the code the browser runs, not the prose: comments are
   * stripped first, and wording in user-facing strings is deliberately not
   * asserted on, because the wiring is the part that must not regress.
   */
  const page = readFileSync(
    new URL('../src/pages/ApplicantApplicationPage.tsx', import.meta.url), 'utf8');
  const pageCode = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  check('flow', 'there is no review stage in the stage sequence',
    !/review/.test(stageView.STAGE_SEQUENCE.join(' ')));
  check('flow', 'the progress strip offers exactly two steps',
    /number:\s*1/.test(pageCode) && /number:\s*2/.test(pageCode) && !/number:\s*3/.test(pageCode));
  check('flow', 'Step 2 is labelled Application Form',
    stageView.STAGE_LABEL.full_application === 'Application Form');
  check('flow', 'the confirmation is an outcome, not a third numbered step',
    stageView.stageNumber('confirmation') === 2);

  check('flow', 'the applicant page has no isReviewing branch at all',
    !/isReviewing/.test(page) && !/'review'/.test(page));
  check('flow', 'the applicant page renders no scheme-only section',
    !/SchemeDetailsSection/.test(page));
  check('flow', 'the answers are read back once, not once per stage',
    pageCode.split('<AnswerReviewList').length - 1 === 1);
  check('flow', 'the applicant can open a document they attached',
    /createViewUrl/.test(page) && /open\(result\.data, '_blank'/.test(page));
  check('flow', 'the declaration is tickable where it is confirmed',
    /isDraft \? \(\s*<CheckboxField[\s\S]{0,300}declaration/.test(pageCode));
  check('flow', 'Submit is reachable without passing through a review stage',
    /isFormStage \? \(\s*submitArmed/.test(pageCode) && !/Review before submitting/.test(page));

  // Section eyebrows are plain and fixed again, because nothing is withheld from
  // the middle of the form any more. A computed or skipped number here would be
  // the leftover of the gating that used to hide the scheme card.
  check('flow', 'the sections are numbered straight through',
    !/sectionNo/.test(page)
      && ['1', '2', '3', '4', '5', '6', '7'].every((n) => pageCode.includes(`Section ${n}\u003c/`)),
    (pageCode.match(/>Section \d+[^<]*/g) ?? []).join(' '));

  // Withholding the scheme card must not have withheld the data with it: the
  // document list, including which documents are conditional, still comes from
  // the scheme row.
  check('flow', 'the scheme is still loaded, because questions and documents derive from it',
    /SchemeDetailResponse|loadSchemeDetail|scheme\s*=/.test(page) && /requirements/.test(page));

  // The form-only scheme renderer is now unreferenced, so it should be gone. The
  // Scheme Details page has always had its own rendering, so the applicant's view
  // of the scheme is untouched.
  const detail = readFileSync(
    new URL('../src/pages/ApplicantSchemeDetailPage.tsx', import.meta.url), 'utf8');
  check('flow', 'the Scheme Details page still shows scheme information',
    /SchemeBenefitsTable/.test(detail) && /Eligibility criteria/i.test(detail));
  check('flow', 'the Scheme Details page does not use the removed form-only section',
    !/SchemeDetailsSection/.test(detail));
  const sections = readFileSync(
    new URL('../src/components/applicant/ApplicantFormSchemeSections.tsx', import.meta.url), 'utf8');
  // Comments are stripped first: the file explains in prose that this renderer was
  // removed, and naming it there is the point, not dead code.
  const sectionsCode = sections.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  check('flow', 'the removed renderer is not left behind as dead code',
    !/SchemeDetailsSection/.test(sectionsCode)
      && !/Scholarship benefits|Eligibility requirements/.test(sectionsCode),
    (sectionsCode.match(/.*(?:SchemeDetailsSection|Scholarship benefits|Eligibility requirements).*/) ?? [''])[0].trim());
}

console.log('\n--- Each scheme still supplies what Step 2 needs ---');
{
  /*
   * Step 2 no longer shows the scheme, but it still depends on the scheme row for
   * one thing: the document list, including which documents are conditional. This
   * is the dependency that must survive, so it is exercised per scheme with the
   * same arguments the read-back uses - no links and no uploaded documents, which
   * is what a draft looks like before anything is attached.
   */
  for (const code of CODES) {
    const entry = entryFor(code);
    if (!entry) continue;
    const empty = [];
    const requirements = formView.buildDocumentRequirements(entry.documents, empty, empty, null, {});
    check(code, 'the document requirements Step 2 reads back still build', requirements.length > 0,
      `${requirements.length} requirements`);

    // No document is attached, so every requirement must read as not attached
    // rather than throwing on a missing link. Step 2 renders exactly this state.
    check(code, 'an unattached requirement renders without a document', requirements.every((r) => r.attached === null),
      requirements.filter((r) => r.attached !== null).map((r) => r.requirement.document_name).join(', '));

    // Conditional documents are filtered by course year, so both ends of each
    // range must still resolve for every scheme.
    for (const year of [1, 2, null]) {
      const filtered = formView.buildDocumentRequirements(entry.documents, empty, empty, null, {}, year);
      check(code, `the document list resolves for course year ${year ?? 'unset'}`,
        filtered.length > 0 && filtered.every((r) => r.requirement.document_name),
        `${filtered.length} requirements`);
    }
  }
}

rmSync(OUT, { recursive: true, force: true });

console.log(`\n${'='.repeat(60)}`);
console.log(`${passed} passed, ${failed} failed`);
if (failures.length) {
  console.log('\nFailures:');
  for (const f of failures) console.log(`  - ${f}`);
}
console.log(`${'='.repeat(60)}\n`);
process.exit(failed === 0 ? 0 : 1);
