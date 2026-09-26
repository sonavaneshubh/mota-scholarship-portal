/**
 * What the application form asks, and what it refuses to ask.
 *
 * The rule this file implements, from the brief:
 *
 *     Already in Profile?  ->  YES  ->  use it, show it read-only
 *                                 NO   ->  Required by Scheme?
 *                                                 YES -> ask
 *                                                 NO  -> do not show it
 *
 * Two consequences worth stating plainly, because they are the whole point:
 *
 *  - A question whose answer is already in the profile is still *listed* when the
 *    scheme asks about it, but it renders as a read-only value with a link to
 *    My Profile. It never renders an input. That is what stops the applicant
 *    being asked for their name twice, and it is why `fromProfile` exists as a
 *    first-class flag rather than being inferred at the call site.
 *
 *  - A question the scheme does not ask about is not rendered at all. The
 *    catalogue below is filtered by `applies`, which reads the scheme's own
 *    scheme_eligibility / scheme_benefits rows, so the form is not a fixed
 *    questionnaire wearing a scholarship's name.
 *
 * Nothing here is hardcoded per scholarship. The triggers are the generic
 * columns the schema already has: `max_income` means this scheme has an income
 * cap, `cap_requirement` means it cares how you got in, `hosteller_amount` means
 * it pays differently for hostellers. Add a scheme and it gets the right subset
 * of questions with no change to this file.
 *
 * Two controls exist for facts that must never be typed into an application:
 * 'profile-notice' and the read-only branch. Category, bank account and
 * disability status are administrative facts about the person, not opinions
 * about this particular scholarship. If the profile is missing one, the form
 * says so and links to My Profile instead of collecting a second, conflicting
 * copy — the alternative is two sources of truth for the same fact.
 */

import type { ApplicantDocumentRecord, ProfileData } from '../types/profile';
import type { SchemeDetailResponse } from './supabase';

export type QuestionControl = 'text' | 'number' | 'textarea' | 'yesno' | 'select' | 'profile-notice';

export interface QuestionOption {
  value: string;
  label: string;
}

export interface SchemeQuestion {
  /** Stable key. Also the key in applications.scheme_answers. */
  key: string;
  label: string;
  help?: string;
  control: QuestionControl;
  options?: QuestionOption[];
  /** Formatted value already held in the profile, or null when it is missing. */
  profileValue: string | null;
  /** True when the profile already answers this, so no input may be rendered. */
  fromProfile: boolean;
  /** Blocks Submit when unanswered. Save Draft is never blocked by this. */
  required: boolean;
  /** Plain-language reason this question is on this form at all. */
  because: string;
}

export type AnswerValue = string | number | boolean | null;
export type SchemeAnswers = Record<string, AnswerValue>;

interface RuleContext {
  profile: ProfileData;
  detail: SchemeDetailResponse;
}

interface QuestionRule {
  key: string;
  label: string;
  control: QuestionControl;
  options?: QuestionOption[];
  help?: string;
  /** Is this question relevant to THIS scheme? */
  applies: (ctx: RuleContext) => boolean;
  /** What the profile already says, formatted. null = not answered yet. */
  read: (ctx: RuleContext) => string | null;
  /** Defaults to "required when unanswered". */
  required?: (ctx: RuleContext) => boolean;
  because: (ctx: RuleContext) => string;
}

/* -------------------------------------------------------------------------- */
/* Small readers over the profile                                              */
/* -------------------------------------------------------------------------- */

const trimmed = (value: string | null | undefined): string | null => {
  const text = (value ?? '').trim();
  return text === '' ? null : text;
};

const rupees = (value: number | null | undefined): string | null =>
  typeof value === 'number' && Number.isFinite(value)
    ? `₹${Math.trunc(value).toLocaleString('en-IN')}`
    : null;

const percent = (value: number | null | undefined): string | null =>
  typeof value === 'number' && Number.isFinite(value) ? `${value}%` : null;

const yesNo = (value: boolean | null | undefined): string | null =>
  value === true ? 'Yes' : value === false ? 'No' : null;

/** The most recent qualification that actually recorded a percentage. */
function latestPercentage(ctx: RuleContext): string | null {
  // loadProfile orders qualifications by passing_year desc, so the head of the
  // list is the most recent. The filter matters: a 10th row with no percentage
  // must not shadow a 12th row that has one.
  for (const record of ctx.profile.qualifications) {
    const value = percent(record.percentage);
    if (value) return value;
  }
  return null;
}

/** True when the scheme pays out money, and therefore needs somewhere to pay it. */
function schemePaysMoney(detail: SchemeDetailResponse): boolean {
  return detail.benefits.some(
    (benefit) =>
      benefit.amount != null ||
      benefit.hosteller_amount != null ||
      benefit.day_scholar_amount != null ||
      Boolean(benefit.coverage && benefit.coverage.trim() !== ''),
  );
}

function schemeMentionsHostel(detail: SchemeDetailResponse): boolean {
  if (detail.benefits.some((benefit) => benefit.hosteller_amount != null)) return true;
  const haystack = [detail.scheme.scheme_type, detail.scheme.name, detail.scheme.overview]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes('hostel');
}

/* -------------------------------------------------------------------------- */
/* The catalogue                                                               */
/* -------------------------------------------------------------------------- */

const SCHEME_QUESTION_RULES: QuestionRule[] = [
  {
    key: 'category',
    label: 'Category',
    control: 'profile-notice',
    applies: (ctx) => Boolean(ctx.detail.eligibility?.category_requirement),
    read: (ctx) => trimmed(ctx.profile.caste?.category),
    required: (ctx) => !trimmed(ctx.profile.caste?.category),
    because: (ctx) =>
      `This scheme is restricted by category: ${ctx.detail.eligibility?.category_requirement}`,
  },
  {
    key: 'annual_income',
    label: 'Annual family income',
    control: 'number',
    help: 'Enter a whole number in rupees, for example 250000.',
    applies: (ctx) => ctx.detail.eligibility?.max_income != null,
    read: (ctx) => rupees(ctx.profile.income?.annual_income),
    required: (ctx) => ctx.profile.income?.annual_income == null,
    because: (ctx) => {
      const cap = rupees(ctx.detail.eligibility?.max_income);
      return cap ? `This scheme caps annual family income at ${cap}.` : 'This scheme has an income limit.';
    },
  },
  {
    key: 'income_certificate',
    label: 'Income certificate number',
    control: 'text',
    help: 'As printed on the income certificate. If you do not have one, upload it as a document below instead.',
    applies: (ctx) =>
      ctx.detail.eligibility?.max_income != null && ctx.profile.income?.has_income_certificate !== true,
    read: (ctx) => trimmed(ctx.profile.income?.certificate_number),
    required: (ctx) => !trimmed(ctx.profile.income?.certificate_number),
    because: () => 'This scheme has an income limit, so it needs evidence of your family income.',
  },
  {
    key: 'is_hosteller',
    label: 'Are you staying in a hostel?',
    control: 'yesno',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
    applies: (ctx) => schemePaysMoney(ctx.detail) || schemeMentionsHostel(ctx.detail),
    read: (ctx) => {
      const mode = ctx.profile.course?.mode_of_study ?? '';
      if (/hostel/i.test(mode)) return 'Yes';
      if (trimmed(ctx.profile.hostel?.hostel_name)) return 'Yes';
      return null;
    },
    required: (ctx) => {
      const mode = ctx.profile.course?.mode_of_study ?? '';
      return !/hostel/i.test(mode) && !trimmed(ctx.profile.hostel?.hostel_name);
    },
    because: () => 'This scheme pays hostellers and day scholars differently, so we need to know which you are.',
  },
  {
    key: 'current_course',
    label: 'Current course',
    control: 'text',
    applies: (ctx) => Boolean(ctx.detail.eligibility?.course_requirement),
    read: (ctx) => {
      const named = trimmed(ctx.profile.course?.course_name);
      if (named) return named;
      // Fall back to degree — branch, but only when both are actually present.
      // [undefined].join() yields '' and `'' ?? x` is '', not x, so the guard
      // has to be explicit rather than leaning on the nullish coalescer.
      const parts = [ctx.profile.course?.degree, ctx.profile.course?.branch]
        .map((part) => trimmed(part))
        .filter((part): part is string => part !== null);
      return parts.length > 0 ? parts.join(' — ') : null;
    },
    required: (ctx) => !trimmed(ctx.profile.course?.course_name) && !trimmed(ctx.profile.course?.degree),
    because: (ctx) => `This scheme is open to specific courses: ${ctx.detail.eligibility?.course_requirement}`,
  },
  {
    key: 'institution',
    label: 'Institution you are studying at',
    control: 'text',
    applies: (ctx) => Boolean(ctx.detail.eligibility?.institution_requirement),
    read: (ctx) => trimmed(ctx.profile.course?.institution_name),
    required: (ctx) => !trimmed(ctx.profile.course?.institution_name),
    because: (ctx) => `This scheme restricts institutions: ${ctx.detail.eligibility?.institution_requirement}`,
  },
  {
    key: 'admission_mode',
    label: 'How did you get admission?',
    control: 'select',
    options: [
      { value: 'cap', label: 'CAP (centralised admission)' },
      { value: 'merit', label: 'Merit' },
      { value: 'management', label: 'Management quota' },
      { value: 'other', label: 'Other' },
    ],
    applies: (ctx) =>
      Boolean(ctx.detail.eligibility?.cap_requirement) || Boolean(ctx.detail.eligibility?.admission_requirement),
    read: (ctx) => {
      if (ctx.profile.course?.cap_admission === true) return 'cap';
      return trimmed(ctx.profile.course?.admission_type);
    },
    required: (ctx) => ctx.profile.course?.cap_admission == null && !trimmed(ctx.profile.course?.admission_type),
    because: (ctx) =>
      ctx.detail.eligibility?.cap_requirement ??
      ctx.detail.eligibility?.admission_requirement ??
      'This scheme has an admission requirement.',
  },
  {
    key: 'last_percentage',
    label: 'Percentage in your last qualifying examination',
    control: 'number',
    help: 'For example 78.5. Leave blank if you have not appeared yet.',
    applies: (ctx) => ctx.detail.eligibility?.min_percentage != null,
    read: latestPercentage,
    required: (ctx) => !latestPercentage(ctx),
    because: (ctx) => {
      const min = percent(ctx.detail.eligibility?.min_percentage);
      return min ? `This scheme requires at least ${min} in your last examination.` : 'This scheme has a minimum mark requirement.';
    },
  },
  {
    key: 'disability_details',
    label: 'Disability details',
    control: 'textarea',
    help: 'Describe your disability and the UDID number, if you have one.',
    applies: (ctx) => Boolean(ctx.detail.eligibility?.disability_requirement),
    read: (ctx) => {
      const stated = yesNo(ctx.profile.eligibility?.is_disabled);
      if (stated === 'No') return 'Not applicable';
      if (stated === 'Yes') return trimmed(ctx.profile.eligibility?.disability_type) ?? 'Yes — recorded in My Profile';
      return null;
    },
    required: (ctx) => ctx.profile.eligibility?.is_disabled == null,
    because: (ctx) => `This scheme has a provision for persons with disabilities: ${ctx.detail.eligibility?.disability_requirement}`,
  },
  {
    key: 'parent_guardian',
    label: 'Parent or guardian name',
    control: 'text',
    help: 'The person responsible for you, with their relationship.',
    applies: (ctx) => {
      const maxAge = ctx.detail.eligibility?.max_age;
      return typeof maxAge === 'number' && maxAge < 18;
    },
    read: (ctx) =>
      trimmed(ctx.profile.parents?.guardian_name) ??
      trimmed(ctx.profile.parents?.father_name) ??
      trimmed(ctx.profile.parents?.mother_name),
    required: (ctx) =>
      !trimmed(ctx.profile.parents?.guardian_name) &&
      !trimmed(ctx.profile.parents?.father_name) &&
      !trimmed(ctx.profile.parents?.mother_name),
    because: (ctx) => `This scheme is for applicants up to ${ctx.detail.eligibility?.max_age} years old.`,
  },
  {
    key: 'bank_account',
    label: 'Bank account for the scholarship amount',
    control: 'profile-notice',
    applies: (ctx) => schemePaysMoney(ctx.detail),
    read: (ctx) => {
      const bank = ctx.profile.bank;
      if (!bank || !trimmed(bank.bank_name)) return null;
      const tail = trimmed(bank.account_number_last4);
      return tail ? `${bank.bank_name} · A/C ending ${tail}` : bank.bank_name;
    },
    required: (ctx) => !trimmed(ctx.profile.bank?.bank_name),
    because: () => 'The scholarship amount is paid into a bank account, so the account must be on your profile.',
  },
  {
    key: 'other_conditions',
    label: 'Other conditions for this scheme',
    control: 'textarea',
    help: 'Type I agree, then add anything the applicant should confirm.',
    applies: (ctx) => Boolean(trimmed(ctx.detail.eligibility?.other_conditions)),
    read: () => null,
    required: () => true,
    because: (ctx) => `This scheme carries an extra condition you must accept: ${ctx.detail.eligibility?.other_conditions}`,
  },
];

/**
 * The questions this applicant is actually shown for this scheme.
 *
 * `detail` may be null, and that is a real state rather than a type error: when
 * the scheme rows cannot be loaded the form still renders, with no scheme-specific
 * questions at all, instead of failing to load. Returning [] keeps that page
 * working and, importantly, keeps the submit blockers empty for those questions
 * rather than reporting questions the applicant cannot see or answer.
 *
 * Order is the catalogue order, which is roughly "identity, then money, then
 * course, then paperwork" — the sequence an officer reads them in.
 */
export function buildSchemeQuestions(profile: ProfileData, detail: SchemeDetailResponse | null): SchemeQuestion[] {
  if (!detail) return [];

  const ctx: RuleContext = { profile, detail };

  return SCHEME_QUESTION_RULES.filter((rule) => rule.applies(ctx)).map((rule) => {
    const profileValue = rule.read(ctx);
    return {
      key: rule.key,
      label: rule.label,
      help: rule.help,
      control: rule.control,
      options: rule.options,
      profileValue,
      fromProfile: profileValue !== null && profileValue !== '',
      required: rule.required ? rule.required(ctx) : true,
      because: rule.because(ctx),
    };
  });
}

/** Questions that still need an answer from the applicant. */
export function unansweredQuestions(questions: SchemeQuestion[], answers: SchemeAnswers): SchemeQuestion[] {
  return questions.filter((question) => !question.fromProfile && !isAnswered(question, answers));
}

export function isAnswered(question: SchemeQuestion, answers: SchemeAnswers): boolean {
  const value = answers[question.key];
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

/**
 * Coerces a stored JSONB answer into the string a text-ish control binds to.
 *
 * Answers are stored as JSON primitives, and jsonb round-trips a number as a
 * number, so a control that binds `String(value)` directly would render "0" for
 * a legitimately blank numeric field. Unknown keys are ignored rather than
 * trusted, so a hand-edited bag cannot inject a field the form never asked for.
 */
export function readAnswer(answers: SchemeAnswers, key: string): string {
  const value = answers[key];
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'string') return value;
  return '';
}

/* -------------------------------------------------------------------------- */
/* Matching a scheme's document requirement to something already uploaded     */
/* -------------------------------------------------------------------------- */

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * scheme_documents.document_name is free text written by the data importer
 * ("Aadhaar Card", "Income Certificate", "Previous Marksheet"), while
 * applicant_documents.document_code is a controlled code
 * ("aadhaar", "income_certificate"). This table bridges the two.
 *
 * It is a keyword list rather than an equality map on purpose: the requirement
 * names are prose and vary between schemes, so matching has to be tolerant. The
 * codes on the right are the ones the profile's own certificate slots already
 * use (see CERTIFICATE_CODES in profileFormMappers), which is what makes an
 * already-uploaded certificate reusable instead of a duplicate upload.
 */
const DOCUMENT_ALIASES: Array<{ keywords: string[]; codes: string[] }> = [
  { keywords: ['aadhaar', 'aadhar'], codes: ['aadhaar', 'aadhaar_card'] },
  { keywords: ['income'], codes: ['income_certificate'] },
  { keywords: ['caste', 'category certificate'], codes: ['caste_certificate'] },
  { keywords: ['domicile'], codes: ['domicile_certificate'] },
  { keywords: ['disability', 'udid'], codes: ['disability_certificate'] },
  { keywords: ['hostel'], codes: ['hostel_certificate'] },
  { keywords: ['previous'], codes: ['previous_marksheet', 'marksheet'] },
  { keywords: ['marksheet', 'mark sheet', 'marks'], codes: ['marksheet', 'previous_marksheet'] },
  { keywords: ['bank', 'passbook', 'account'], codes: ['bank_passbook', 'bank'] },
  { keywords: ['admission', 'bonafide', 'college', 'institution'], codes: ['admission_proof', 'admission'] },
  { keywords: ['birth'], codes: ['birth_certificate'] },
  { keywords: ['photo', 'photograph'], codes: ['photo'] },
  { keywords: ['signature'], codes: ['signature'] },
];

/**
 * The controlled `document_code` to store for a scheme requirement's upload.
 *
 * Needed because uploadDocument() writes its argument into both
 * `applicant_documents.document_code` and `.document_type`. Handing it a scheme's
 * free-text `document_name` ("Previous Marksheet") would put prose into a column
 * the profile's certificate slots and the completeness engine both match on
 * exactly — so the upload would not fill the slot it was meant to fill.
 *
 * Alias hits return a code the profile already understands, which is what makes
 * "upload it here" and "already on your profile" converge on one row instead of
 * two. When no alias matches, the requirement name is slugged rather than dropped:
 * an unmapped scheme still gets a stable, readable code instead of every upload
 * for it colliding on one literal 'document'.
 */
export function resolveDocumentCode(requirementName: string): string {
  const name = normalise(requirementName);
  if (!name) return 'document';

  for (const alias of DOCUMENT_ALIASES) {
    if (alias.keywords.some((keyword) => name.includes(keyword))) return alias.codes[0];
  }

  return name.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'document';
}

/**
 * The applicant's own document that already satisfies a requirement, if any.
 *
 * `documents` arrives ordered by uploaded_at desc (loadProfile sorts it), so the
 * first match is the most recent version — which is the one an applicant means
 * by "I already sent this".
 */
export function matchExistingDocument(
  requirementName: string,
  documents: ApplicantDocumentRecord[],
): ApplicantDocumentRecord | null {
  const name = normalise(requirementName);

  for (const alias of DOCUMENT_ALIASES) {
    if (!alias.keywords.some((keyword) => name.includes(keyword))) continue;
    const match = documents.find((document) => {
      const code = (document.document_code ?? document.document_type ?? '').toLowerCase();
      return alias.codes.includes(code);
    });
    if (match) return match;
  }

  return null;
}
