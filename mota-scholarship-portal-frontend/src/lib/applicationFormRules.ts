/**
 * What the Additional Information stage asks.
 *
 * The stage collects exactly one thing, and nothing else:
 *
 *   Is this a renewal application?   yes / no
 *
 * The other thing the stage shows is the scheme's own document list, which is
 * not a question at all — it comes from scheme_documents and is rendered by
 * ApplicantFormSchemeSections.
 *
 * Why this lives in `applications.scheme_answers`
 * ----------------------------------------------
 * The live `applications` table has no renewal column, so where does it go? Into
 * `scheme_answers`, the jsonb bag the table already carries, rather than into a
 * new column.
 *
 * That is not a workaround, it is the field's actual purpose. The column
 * comment on it (20260927000003_application_form_data.sql) says it holds "the
 * small set of extra questions a particular scholarship asks that the profile
 * does not already answer". Renewal status is not in the profile, it is a
 * per-application fact about this application for this scheme, and it is asked
 * on this form. So it belongs here.
 *
 * The practical consequence is that this needs no migration, which matters more
 * than it sounds: the project has no SQL administration channel, so a new column
 * would be code that could not be deployed or tested. Reusing the existing
 * column ships working code today.
 *
 * It also keeps every existing guarantee intact. RLS on `applications` is
 * unchanged, `set_application_document_owner()` is unchanged, and
 * `guard_application_submission()` is unchanged — none of them look at
 * scheme_answers, so nothing about ownership or the submit gate is weakened.
 *
 * What was removed, and why it is not coming back
 * ----------------------------------------------
 * This file used to derive a catalogue of questions per scheme from that
 * scheme's scheme_eligibility and scheme_benefits columns: category, annual
 * income, income certificate number, hostel status, current course, last
 * percentage, parent/guardian, institution, admission mode, bank account and
 * other conditions. A count of boys/sons sat alongside them.
 *
 * Every one of those was either already in the profile — so the form rendered it
 * read-only and asked nothing — or was inferred from a column that does not
 * exist in the deployed schema, or was a guess about how a scholarship works.
 * The brief for this stage is the renewal question and the document list, so
 * the catalogue is now the single question above.
 * `buildSchemeQuestions` therefore needs no arguments: there is no longer a
 * per-scheme condition to evaluate.
 *
 * `readStoredAnswers` is called with the keys of the questions this file
 * declares, so any answer left behind under a removed key — including
 * `number_of_sons` — is dropped on read rather than written back on the next
 * save. That is the intended behaviour, not an accident.
 */

import type { ApplicantDocumentRecord } from '../types/profile';

/**
 * The controls a question can be rendered with. Kept as a union rather than
 * hardcoded per question so adding a field later is a data change, not a
 * component change.
 */
export type QuestionControl = 'number' | 'textarea' | 'yesno';

export interface SchemeQuestion {
  /** Stable key. Also the key in applications.scheme_answers. */
  key: string;
  label: string;
  help?: string;
  control: QuestionControl;
  /**
   * Mobile keyboard hint. 'numeric' drops the decimal key, which is the point
   * for a field that must be a whole number.
   */
  inputMode?: 'text' | 'numeric' | 'decimal';
  /** Blocks Continue and Submit when unanswered or unusable. Save draft never blocked. */
  required: boolean;
  /**
   * Returns the message to show when a stored answer cannot be accepted, or
   * null when it is fine. Omitted for fields with nothing to check beyond
   * "not blank".
   */
  validate?: (raw: string) => string | null;
}

export type AnswerValue = string | number | boolean | null;
export type SchemeAnswers = Record<string, AnswerValue>;

/* -------------------------------------------------------------------------- */
/* Validators                                                                  */
/* -------------------------------------------------------------------------- */

/** The only two tokens the renewal control can produce. */
const YES_NO = new Set(['yes', 'no']);

/* -------------------------------------------------------------------------- */
/* The catalogue                                                               */
/* -------------------------------------------------------------------------- */

const ADDITIONAL_INFORMATION_QUESTIONS: SchemeQuestion[] = [
  {
    key: 'is_renewal_application',
    label: 'Is this a renewal application?',
    help: 'Choose Yes if you were already awarded this scholarship last year and are applying to continue it.',
    control: 'yesno',
    required: true,
    // A hand-edited answer bag could hold anything. Requiring one of the two
    // tokens the control produces means a corrupt value reads as unanswered
    // rather than as a renewal nobody chose.
    validate: (raw) => (YES_NO.has(raw.trim().toLowerCase()) ? null : 'Choose Yes or No.'),
  },
];

/**
 * The questions the Additional Information stage shows.
 *
 * A fresh array each call, so a caller that mutates the result cannot corrupt
 * the catalogue for the next render. The keys are what `readStoredAnswers`
 * filters the stored jsonb against, so they double as the contract for what may
 * persist in `scheme_answers`.
 */
export function buildSchemeQuestions(): SchemeQuestion[] {
  return ADDITIONAL_INFORMATION_QUESTIONS.map((question) => ({ ...question }));
}

/**
 * Whether a question has an answer the form is willing to accept.
 *
 * "Non-empty" is the default, and the stricter per-question validator takes over
 * when the question has one. This is the single definition used by every gate —
 * the Continue button, the Submit blockers and the derived stage check — so a
 * field cannot be passable on one screen and blocking on another.
 */
export function isAnswered(question: SchemeQuestion, answers: SchemeAnswers): boolean {
  const raw = readAnswer(answers, question.key).trim();
  if (raw === '') return false;
  return question.validate ? question.validate(raw) === null : true;
}

/** Every question that still needs a usable answer, for the blocker list. */
export function unansweredQuestions(questions: SchemeQuestion[], answers: SchemeAnswers): SchemeQuestion[] {
  return questions.filter((question) => question.required && !isAnswered(question, answers));
}

/**
 * Coerces a stored JSONB answer into the string a control binds to.
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
 * scheme_documents.document_type is a controlled vocabulary written by
 * 20260927000160_official_scheme_data_documents.sql (Category Certificate,
 * Income Certificate, Marksheet, Bank Proof, ...), and document_name is the
 * guideline's own wording. applicant_documents.document_type is the controlled
 * code ("aadhaar", "income_certificate", ...). This table bridges them.
 *
 * `byType` is keyed on the controlled scheme document_type and is tried first,
 * because that column is a fixed vocabulary. `keywords` is a tolerant fallback
 * matched against the free-text name, for the case where a scheme's guideline
 * names a document the vocabulary does not cover.
 *
 * The codes on the right are the ones the profile's own certificate slots already
 * use (see CERTIFICATE_CODES in profileFormMappers), which is what makes an
 * already-uploaded certificate reusable instead of a duplicate upload.
 */
const DOCUMENT_ALIASES: Array<{ keywords: string[]; codes: string[] }> = [
  { keywords: ['aadhaar', 'aadhar'], codes: ['aadhaar', 'aadhaar_card'] },
  { keywords: ['income'], codes: ['income_certificate'] },
  { keywords: ['st certificate', 'pvtg', 'st / pvtg', 'caste', 'category certificate'], codes: ['caste_certificate'] },
  { keywords: ['domicile', 'residence proof'], codes: ['domicile_certificate'] },
  { keywords: ['disab', 'divyangjan', 'udid'], codes: ['disability_certificate'] },
  { keywords: ['hostel', 'hosteller'], codes: ['hostel_certificate', 'hosteller_certificate'] },
  { keywords: ['previous', 'last qualified'], codes: ['previous_marksheet', 'marksheet'] },
  { keywords: ['marksheet', 'mark sheet', 'marks'], codes: ['marksheet', 'previous_marksheet'] },
  { keywords: ['bank', 'passbook', 'account'], codes: ['bank_passbook', 'bank'] },
  { keywords: ['bona fide', 'bonafide', 'admission', 'joining', 'institution', 'enrollment', 'enrolment'], codes: ['admission_proof', 'admission'] },
  { keywords: ['offer'], codes: ['offer_letter'] },
  { keywords: ['degree', 'diploma', '12th', 'qualifying examination'], codes: ['degree_certificate'] },
  { keywords: ['fee receipt'], codes: ['fee_receipt'] },
  { keywords: ['10th', 'matriculation', 'birth'], codes: ['birth_certificate'] },
  { keywords: ['photo', 'photograph'], codes: ['photo'] },
  { keywords: ['signature'], codes: ['signature'] },
];

/**
 * `scheme_documents.document_type` -> applicant document code.
 *
 * Ordered most-specific first: "Category Certificate" must not be swallowed by a
 * broader rule, and the scheme's own document_type is a fixed vocabulary, so this
 * lookup is exact and does not depend on prose. The keys are the values written
 * by 20260927000200_remove_dummy_data_and_normalize_documents.sql.
 */
const SCHEME_DOCUMENT_TYPE_CODES: Record<string, string[]> = {
  'Category Certificate': ['caste_certificate'],
  'Income Certificate': ['income_certificate'],
  'Identity Proof': ['aadhaar', 'aadhaar_card'],
  'Residence Proof': ['domicile_certificate'],
  'Disability Certificate': ['disability_certificate'],
  Photograph: ['photo'],
  Marksheet: ['marksheet', 'previous_marksheet'],
  'Bank Proof': ['bank_passbook', 'bank'],
  'Admission Proof': ['admission_proof', 'admission'],
  'Offer Letter': ['offer_letter'],
  'Birth Certificate': ['birth_certificate'],
  'Degree Certificate': ['degree_certificate'],
  'Fee Receipt': ['fee_receipt'],
  'Institute Certificate': ['admission_proof', 'admission'],
};

/**
 * The controlled `document_type` to store for a scheme requirement's upload.
 *
 * Needed because uploadDocument() writes its argument into
 * `applicant_documents.document_type`, the only code column on that table, which
 * the profile's certificate slots and the completeness engine both match on
 * exactly — so the upload would not fill the slot it was meant to fill if the
 * scheme's free-text `document_name` were stored instead.
 *
 * The scheme's `document_type` is consulted first because it is a controlled
 * vocabulary; the keyword list then catches guideline wording the vocabulary does
 * not cover. When neither matches, the requirement name is slugged rather than
 * dropped: an unmapped scheme still gets a stable, readable code instead of every
 * upload for it colliding on one literal 'document'.
 */
export function resolveDocumentCode(
  requirementName: string,
  schemeDocumentType?: string | null
): string {
  const typeCodes = schemeDocumentType ? SCHEME_DOCUMENT_TYPE_CODES[schemeDocumentType] : undefined;
  if (typeCodes) return typeCodes[0];

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
 *
 * `applicant_documents` has no `document_code`; `document_type` holds the
 * controlled code that uploadDocument() was given.
 */
export function matchExistingDocument(
  requirementName: string,
  documents: ApplicantDocumentRecord[],
  schemeDocumentType?: string | null
): ApplicantDocumentRecord | null {
  const candidateCodes: string[][] = [];
  if (schemeDocumentType && SCHEME_DOCUMENT_TYPE_CODES[schemeDocumentType]) {
    candidateCodes.push(SCHEME_DOCUMENT_TYPE_CODES[schemeDocumentType]);
  }

  const name = normalise(requirementName);
  for (const alias of DOCUMENT_ALIASES) {
    if (alias.keywords.some((keyword) => name.includes(keyword))) candidateCodes.push(alias.codes);
  }

  for (const codes of candidateCodes) {
    const match = documents.find((document) => codes.includes(document.document_type ?? ''));
    if (match) return match;
  }

  return null;
}
