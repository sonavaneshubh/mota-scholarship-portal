// =============================================================================
// process-document-ocr
// =============================================================================
// Purpose
//   Read one attached document, run it through an OCR/vision model, and record
//   what was read in public.application_documents.ai_extraction and .ai_confidence
//   together with the processing state added by
//   20260929084339_add_document_ocr_processing.sql.
//
// The data chain this sits in, and the part it is responsible for
//   ---------------------------------------------------------------------
//   original document   storage.objects row in the private applicant-documents
//                       bucket. Bytes are never read by the browser, never
//                       cached, never logged, never sent anywhere except the
//                       OCR provider, inside this function.
//        |
//   raw OCR result     the provider's text response. Held in memory for the
//                       duration of the invocation and then discarded. It is
//                       deliberately NOT persisted: it is the one layer in the
//                       chain that is large, unstructured, and of no evidentiary
//                       value once fields have been parsed out of it.
//        |
//   AI extracted data  ai_extraction. The structured fields, plus the metadata
//                       needed to audit where they came from. This function is
//                       the only writer.
//        |
//   AI confidence      ai_confidence, 0-1. Also per-field confidence inside
//                       ai_extraction._meta.field_confidence, because a single
//                       document-level number cannot tell a reviewer that one
//                       field is the uncertain one.
//        |
//   human verified     human_verified_data / human_verified_by /
//                       human_verified_at. NOT WRITTEN BY THIS FUNCTION, EVER.
//                       See "The one thing this function must never do" below.
//        |
//   final application  written by a person, through the existing UI.
//
// The one thing this function must never do
// -----------------------------------------
// It must never write human_verified_*. Verification is a human act and the
// columns are named for that reason: an officer signs off, this function does
// not. The `complete()` update below lists its columns explicitly rather than
// spreading the extraction object, so that adding a field to ai_extraction can
// never widen into writing a verification column by accident.
//
// Equally, it never writes to applicant_profiles. The profile is the
// applicant's own record of what they told us; a machine reading of a scanned
// document is weaker evidence than the applicant's own statement, so it is
// compared against the profile (see buildProfileComparison) and stored, and
// never merged into it.
//
// And it never decides anything. There is no branch anywhere in this file that
// rejects, approves, flags as fraudulent, or changes an application status. A
// document that disagrees with the profile produces NEEDS_REVIEW, which is a
// prompt for a person to look, and nothing else.
//
// Authorization
// -------------
// The caller's own JWT is required, and the *read* that decides what they may
// touch is performed with a client built from that JWT. The RLS policies on
// application_documents therefore decide access, not this file: an applicant
// can reach their own rows, an admin/officer/demo_admin can reach theirs, and
// anyone else gets no row at all. A caller who is not permitted receives a
// generic 404 rather than a 403, because a 403 would confirm that the row
// exists.
//
// The privileged (service-role) client is used only afterwards, and only for
// the four things RLS deliberately does not express: reading the storage object
// for a row the caller's JWT has already vouched for, and writing the ocr_*
// bookkeeping plus ai_extraction/ai_confidence.
//
// Required secrets (set with: supabase secrets set OCR_API_KEY=...)
//   OCR_API_KEY     the OCR provider's key. Server-side only. Never in the
//                   frontend, never in a response body, never in a log line.
//
// Optional environment
//   OCR_PROVIDER      'gemini' (default) is the only implemented provider.
//   OCR_MODEL         default 'gemini-2.0-flash'
//   OCR_TIMEOUT_MS    default 60000
//
// SUPABASE_URL, SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY) and
// SUPABASE_SERVICE_ROLE_KEY are injected by the platform.
//
// Deploy with: supabase functions deploy process-document-ocr
// =============================================================================

import { createClient } from '@supabase/supabase-js';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const BUCKET = 'applicant-documents';

/** Mirrors the bucket's own limits and 20260926090300's mime allow-list. */
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

/** Refuse to claim a document that has already been retried this many times. */
const MAX_ATTEMPTS = 5;

const DEFAULT_MODEL = 'gemini-2.0-flash';
const DEFAULT_TIMEOUT_MS = 60_000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Bump when the shape written into ai_extraction changes, so a stored extraction
 * can be told apart from one written by an older revision of this function.
 * A stored extraction is not re-read as truth by anything today, but an audit
 * that cannot tell which code produced a number cannot answer a question about
 * it later.
 */
const EXTRACTION_SCHEMA_VERSION = 1;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// -----------------------------------------------------------------------------
// Document kinds
// -----------------------------------------------------------------------------
// The names come from the guidelines the portal already serves, and the
// distinction between a 10th and a 12th marksheet is real in this portal:
// BPVGK/BVOBC ask for "Previous / Last Year Marksheet", BVOBC for "12th
// Marksheet", ARG45/AZKMI for "10th Marksheet". They are kept as separate kinds
// even where the field list is identical, because the reviewer has to be able to
// see which class of document was claimed, and because `board` and `passing_year`
// mean different things for each.
//
// Nothing here invents a document type. Every kind below is a shape for a
// document this portal already asks for, and anything it does not recognise
// falls through to GENERIC, which extracts only what is literally printed on the
// page.
// -----------------------------------------------------------------------------

type DocumentKind =
  | 'AADHAAR'
  | 'DOMICILE'
  | 'INCOME_CERTIFICATE'
  | 'TENTH_MARKSHEET'
  | 'TWELFTH_MARKSHEET'
  | 'LAST_YEAR_MARKSHEET'
  | 'UNCLASSIFIED_MARKSHEET'
  | 'GENERIC';

/** Gemini's responseSchema is an OpenAPI subset; this is the node for one field. */
type SchemaField = {
  type: 'STRING' | 'NUMBER' | 'INTEGER' | 'BOOLEAN' | 'OBJECT' | 'ARRAY';
  description?: string;
  nullable?: boolean;
  items?: SchemaField;
  properties?: Record<string, SchemaField>;
  required?: string[];
};

type ExtractionSpec = {
  kind: DocumentKind;
  /** Field order as the reviewer should read them. */
  fields: Array<{ key: string; type: SchemaField['type']; description: string; nullable?: boolean }>;
  /** Keys that must not be inferred, only read. */
  verbatim: string[];
};

const MARKSHEET_FIELDS: ExtractionSpec['fields'] = [
  { key: 'student_name', type: 'STRING', description: 'Name printed on the marksheet' },
  { key: 'roll_number', type: 'STRING', description: 'Roll number or registration number as printed' },
  { key: 'school', type: 'STRING', description: 'School or board name as printed' },
  { key: 'board', type: 'STRING', description: 'Examination board, e.g. CBSE, State Board, University' },
  { key: 'passing_year', type: 'INTEGER', description: 'Year the examination was passed, four digits' },
  { key: 'total_marks', type: 'NUMBER', description: 'Total marks obtained, if a grand total is printed' },
  { key: 'percentage', type: 'NUMBER', description: 'Percentage printed on the document, if present' },
];

const MARKSHEET_SUBJECTS: SchemaField = {
  type: 'ARRAY',
  description: 'One entry per subject row that is actually printed',
  items: {
    type: 'OBJECT',
    properties: {
      name: { type: 'STRING' },
      marks_obtained: { type: 'NUMBER' },
      marks_maximum: { type: 'NUMBER' },
      grade: { type: 'STRING', nullable: true },
    },
    required: ['name'],
  },
};

const SPECS: Record<DocumentKind, ExtractionSpec> = {
  AADHAAR: {
    kind: 'AADHAAR',
    fields: [
      { key: 'name', type: 'STRING', description: 'Name as printed on the Aadhaar card' },
      { key: 'date_of_birth', type: 'STRING', description: 'Date of birth as YYYY-MM-DD' },
      {
        key: 'aadhaar_last4',
        type: 'STRING',
        description:
          'The LAST FOUR digits of the Aadhaar number only, as a 4-character string. Never return the full 12-digit number.',
      },
      { key: 'address', type: 'STRING', description: 'Address as printed, if shown' },
      { key: 'state', type: 'STRING', description: 'State as printed, if shown' },
      { key: 'district', type: 'STRING', description: 'District as printed, if shown' },
    ],
    verbatim: ['aadhaar_last4'],
  },
  DOMICILE: {
    kind: 'DOMICILE',
    fields: [
      { key: 'holder_name', type: 'STRING', description: 'Name of the certificate holder' },
      { key: 'certificate_number', type: 'STRING', description: 'Certificate or registration number' },
      { key: 'issue_date', type: 'STRING', description: 'Date of issue as YYYY-MM-DD' },
      { key: 'state', type: 'STRING', description: 'State named on the certificate' },
      { key: 'district', type: 'STRING', description: 'District named on the certificate' },
      { key: 'issuing_authority', type: 'STRING', description: 'Issuing authority as printed' },
    ],
    verbatim: ['certificate_number'],
  },
  INCOME_CERTIFICATE: {
    kind: 'INCOME_CERTIFICATE',
    fields: [
      { key: 'holder_name', type: 'STRING', description: 'Name of the person the income is certified for' },
      { key: 'annual_income', type: 'NUMBER', description: 'Annual or total income as a bare number, no symbol' },
      { key: 'financial_year', type: 'STRING', description: 'Financial year as printed, e.g. 2025-26' },
      { key: 'certificate_number', type: 'STRING', description: 'Certificate number as printed' },
      { key: 'issue_date', type: 'STRING', description: 'Date of issue as YYYY-MM-DD' },
      { key: 'issuing_authority', type: 'STRING', description: 'Issuing authority as printed' },
    ],
    verbatim: ['certificate_number'],
  },
  TENTH_MARKSHEET: {
    kind: 'TENTH_MARKSHEET',
    fields: [
      ...MARKSHEET_FIELDS,
      { key: 'subjects', type: 'ARRAY', description: 'Subject rows as printed' },
    ],
    verbatim: ['roll_number'],
  },
  TWELFTH_MARKSHEET: {
    kind: 'TWELFTH_MARKSHEET',
    fields: [
      ...MARKSHEET_FIELDS,
      { key: 'subjects', type: 'ARRAY', description: 'Subject rows as printed' },
    ],
    verbatim: ['roll_number'],
  },
  LAST_YEAR_MARKSHEET: {
    kind: 'LAST_YEAR_MARKSHEET',
    fields: [
      { key: 'student_name', type: 'STRING', description: 'Name as printed' },
      { key: 'institution', type: 'STRING', description: 'Institution name as printed' },
      { key: 'course', type: 'STRING', description: 'Course or programme as printed' },
      { key: 'academic_year', type: 'STRING', description: 'Academic year or session as printed' },
      { key: 'semester_or_year', type: 'STRING', description: 'Semester or year of study as printed' },
      { key: 'marks', type: 'STRING', description: 'Marks obtained, as printed' },
      { key: 'percentage_or_cgpa', type: 'STRING', description: 'Percentage or CGPA as printed' },
    ],
    verbatim: [],
  },
  /**
   * "Qualifying Examination Marksheet" (A023B), "Post-Graduation Marksheet"
   * (ARG45) and "Graduation / Post-Graduation Marksheet" (AZKMI). A marksheet is
   * a marksheet: it carries a name, a roll number, a board, subject rows and a
   * total. Reusing the marksheet field list is describing the document, not
   * inventing fields for it.
   */
  UNCLASSIFIED_MARKSHEET: {
    kind: 'UNCLASSIFIED_MARKSHEET',
    fields: [
      ...MARKSHEET_FIELDS,
      { key: 'subjects', type: 'ARRAY', description: 'Subject rows as printed' },
    ],
    verbatim: ['roll_number'],
  },
  /**
   * Everything else this portal asks for: ST/PVTG certificates, disability
   * certificates, bank proofs, fee receipts, photographs, offer letters,
   * admission proofs, institute certificates.
   *
   * No field list is asserted for these, because a fee receipt does not have a
   * date of birth and a photograph has nothing at all. Instead the provider is
   * told to return only label/value pairs that are literally printed, which is
   * the one shape that is correct for every document.
   */
  GENERIC: {
    kind: 'GENERIC',
    fields: [],
    verbatim: [],
  },
};

function buildResponseSchema(spec: ExtractionSpec): SchemaField {
  if (spec.kind === 'GENERIC') {
    return {
      type: 'OBJECT',
      properties: {
        document_type: { type: 'STRING' },
        fields: {
          type: 'ARRAY',
          description: 'One entry per distinct piece of printed text that is legible. Empty if none are.',
          items: {
            type: 'OBJECT',
            properties: { label: { type: 'STRING' }, value: { type: 'STRING' } },
            required: ['label', 'value'],
          },
        },
      },
      required: ['document_type', 'fields'],
    };
  }

  const properties: Record<string, SchemaField> = {
    document_type: { type: 'STRING', description: `Always exactly "${spec.kind}"` },
  };
  const required = ['document_type'];

  for (const field of spec.fields) {
    // `subjects` is the one array in any spec, and it is the one with a shape
    // of its own. Keying the substitution on the field name rather than on
    // `type === 'ARRAY'` matters: a later spec that adds a different array
    // would otherwise silently inherit the marksheet subject row, and the
    // provider would be asked for the wrong columns without any error.
    properties[field.key] = field.key === 'subjects'
      ? MARKSHEET_SUBJECTS
      : { type: field.type, description: field.description, nullable: field.nullable !== false };
  }

  // `document_type` is the only field guaranteed to be present: every other
  // field is optional because a real document routinely omits some of them, and
  // forcing the model to invent one to satisfy `required` is how invented data
  // gets into a scholarship record.
  return { type: 'OBJECT', properties, required };
}

// -----------------------------------------------------------------------------
// Document-kind resolution
// -----------------------------------------------------------------------------
// Three sources, most reliable first:
//
//   1. applicant_documents.document_type — a controlled code from
//      public.applicant_document_types ('aadhaar', 'domicile_certificate',
//      'income_certificate', 'caste_certificate', 'disability_certificate',
//      'marksheet', 'hosteller_certificate'). It is the code the upload path
//      chose, so it is the applicant's own declared intent.
//   2. scheme_documents.document_name — the guideline's own words, e.g. "10th
//      Marksheet". This is the only place the class of a marksheet is recorded,
//      since document_type is just "Marksheet" for all eight of them.
//   3. application_documents.document_type — a display label ("Identity Proof",
//      "Residence Proof"). Last, because it is the least controlled of the three.
// -----------------------------------------------------------------------------

function norm(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

type ResolveInput = {
  /** applicant_documents.document_type, the controlled code. */
  applicantCode: string | null;
  /** scheme_documents.document_name, the guideline's wording. */
  schemeDocumentName: string | null;
  /** application_documents.document_type, the display label. */
  linkLabel: string | null;
};

export function resolveDocumentKind(input: ResolveInput): DocumentKind {
  const code = norm(input.applicantCode);
  const name = norm(input.schemeDocumentName);
  const label = norm(input.linkLabel);
  const all = `${code} ${name} ${label}`;

  // Aadhaar. BPVGK/BVOBC call it "Aadhaar Card" under document_type
  // "Identity Proof", so the name has to be consulted, not just the code.
  if (code === 'aadhaar' || code === 'aadhaar card' || /\baadhaar\b/.test(all)) return 'AADHAAR';

  // Domicile. scheme_documents calls it "Domicile Certificate" under document_type
  // "Residence Proof"; the controlled code is 'domicile_certificate'.
  if (code === 'domicile certificate' || /\bdomicile\b/.test(all)) return 'DOMICILE';

  if (code === 'income certificate' || /\bincome\b/.test(all)) return 'INCOME_CERTIFICATE';

  // A marksheet of some kind. The class is only visible in the guideline's name.
  const looksLikeMarksheet = code === 'marksheet' || /\bmarksheet\b/.test(all) || /\bmarks\b/.test(name);
  if (looksLikeMarksheet) {
    if (/\b10th\b|\bclass 10\b|\bssc\b/.test(name)) return 'TENTH_MARKSHEET';
    if (/\b12th\b|\bclass 12\b|\bhsc\b|\bintermediate\b/.test(name)) return 'TWELFTH_MARKSHEET';
    if (/\blast year\b|\bprevious\b/.test(name)) return 'LAST_YEAR_MARKSHEET';
    return 'UNCLASSIFIED_MARKSHEET';
  }

  return 'GENERIC';
}

// -----------------------------------------------------------------------------
// Prompt
// -----------------------------------------------------------------------------

function buildPrompt(spec: ExtractionSpec, ctx: { documentName: string; schemeName: string | null }): string {
  const common = [
    'You are reading a document that an applicant uploaded to an Indian tribal-affairs scholarship portal.',
    'Return only what is physically printed on the page.',
    '',
    'Hard rules:',
    '- Never infer a value. If a field is not legible or not present, leave it null.',
    '- Never guess from what a document of this type usually contains.',
    '- Never guess a date, an amount, a name spelling or a number.',
    '- Never return an Aadhaar number in full. If an Aadhaar number is visible, return only its last four digits.',
    '- Do not return a field because it would be expected on this kind of document.',
    '- Prefer an empty result over a plausible one.',
  ].join('\n');

  if (spec.kind === 'GENERIC') {
    return [
      common,
      '',
      'This document type has no fixed field list, because no field list is correct for every document of this kind.',
      `Return a "fields" array containing one entry per distinct piece of printed text that is legible, with "label" being the printed label and "value" the printed value.`,
      'If nothing on the page is legible, return an empty "fields" array. Do not invent an entry.',
    ].join('\n');
  }

  const rules = spec.verbatim.length
    ? [
        '',
        'These fields must be copied exactly as printed, character for character, and must never be reformatted, translated or completed:',
        ...spec.verbatim.map((key) => `  - ${key}`),
      ].join('\n')
    : '';

  return [
    common,
    rules,
    '',
    `The document class is ${spec.kind}.`,
    ctx.schemeName ? `It was uploaded to satisfy the requirement "${ctx.documentName}" on the ${ctx.schemeName} scheme.` : `It was uploaded to satisfy the requirement "${ctx.documentName}".`,
    '',
    'Extract exactly these fields:',
    ...spec.fields.map((f) => `  - ${f.key} (${f.type}): ${f.description}`),
    '',
    `Set "document_type" to exactly "${spec.kind}".`,
  ].join('\n');
}

// -----------------------------------------------------------------------------
// Profile comparison
// -----------------------------------------------------------------------------
// MATCH          every comparable field agrees
// NEEDS_REVIEW   at least one comparable field disagrees, or nothing was
//                comparable at all
//
// There is deliberately no third state. A disagreement is not a finding of
// fraud: OCR misreads a name far more often than an applicant lies about it, and
// "Rahul Kumar" vs "Rahul Kumer" is the ordinary case. The result is a prompt
// for a person to look at the document, and nothing more. Nothing in this
// function reacts to it.
// -----------------------------------------------------------------------------

type ComparisonResult = 'MATCH' | 'NEEDS_REVIEW' | 'NOT_COMPARABLE';

type ComparisonCheck = {
  field: string;
  profile_value: string | null;
  document_value: string | null;
  result: ComparisonResult;
};

type ProfileSnapshot = {
  full_name: string | null;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  aadhaar_last4: string | null;
};

function profileName(p: ProfileSnapshot): string | null {
  if (p.full_name && p.full_name.trim()) return p.full_name.trim();
  const parts = [p.first_name, p.middle_name, p.last_name].filter(
    (part): part is string => typeof part === 'string' && part.trim() !== '',
  );
  return parts.length ? parts.join(' ') : null;
}

/**
 * Case-, whitespace- and punctuation-insensitive. Deliberately not fuzzy: a
 * similarity threshold would call "Rahul Kumer" a match, which is the exact
 * outcome this is meant to avoid.
 */
function nameKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}

/** Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY and "12 May 2004". */
function toIsoDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const raw = value.trim();

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;

  const numeric = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (numeric) return `${numeric[3]}-${numeric[2].padStart(2, '0')}-${numeric[1].padStart(2, '0')}`;

  const named = raw.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/);
  if (named) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIndex = months.indexOf(named[2].slice(0, 3).toLowerCase());
    if (monthIndex >= 0) return `${named[3]}-${String(monthIndex + 1).padStart(2, '0')}-${named[1].padStart(2, '0')}`;
  }

  return null;
}

export function buildProfileComparison(
  fields: Record<string, unknown>,
  profile: ProfileSnapshot,
): { result: 'MATCH' | 'NEEDS_REVIEW'; checks: ComparisonCheck[] } {
  const checks: ComparisonCheck[] = [];

  // ---- name -------------------------------------------------------------
  const docName = typeof fields.name === 'string' && fields.name.trim()
    ? fields.name
    : typeof fields.holder_name === 'string' && fields.holder_name.trim()
      ? fields.holder_name
      : typeof fields.student_name === 'string' && fields.student_name.trim()
        ? fields.student_name
        : null;
  const profName = profileName(profile);

  if (!docName || !profName) {
    checks.push({
      field: 'name',
      profile_value: profName,
      document_value: docName,
      result: 'NOT_COMPARABLE',
    });
  } else {
    const agrees = nameKey(docName) === nameKey(profName);
    checks.push({
      field: 'name',
      profile_value: profName,
      document_value: docName,
      result: agrees ? 'MATCH' : 'NEEDS_REVIEW',
    });
  }

  // ---- date of birth ----------------------------------------------------
  const docDob = toIsoDate(fields.date_of_birth);
  const profDob = toIsoDate(profile.date_of_birth);

  if (!docDob || !profDob) {
    checks.push({
      field: 'date_of_birth',
      profile_value: profDob,
      document_value: docDob,
      result: 'NOT_COMPARABLE',
    });
  } else {
    checks.push({
      field: 'date_of_birth',
      profile_value: profDob,
      document_value: docDob,
      result: docDob === profDob ? 'MATCH' : 'NEEDS_REVIEW',
    });
  }

  // ---- aadhaar last four ------------------------------------------------
  const docLast4 = typeof fields.aadhaar_last4 === 'string' ? fields.aadhaar_last4.replace(/\D/g, '').slice(-4) : '';
  const profLast4 = (profile.aadhaar_last4 ?? '').replace(/\D/g, '').slice(-4);

  if (docLast4.length !== 4 || profLast4.length !== 4) {
    checks.push({
      field: 'aadhaar_last4',
      profile_value: profLast4 || null,
      document_value: docLast4 || null,
      result: 'NOT_COMPARABLE',
    });
  } else {
    checks.push({
      field: 'aadhaar_last4',
      profile_value: profLast4,
      document_value: docLast4,
      result: docLast4 === profLast4 ? 'MATCH' : 'NEEDS_REVIEW',
    });
  }

  const comparable = checks.filter((c) => c.result !== 'NOT_COMPARABLE');
  const result = comparable.length > 0 && comparable.every((c) => c.result === 'MATCH') ? 'MATCH' : 'NEEDS_REVIEW';

  return { result, checks };
}

// -----------------------------------------------------------------------------
// Output hygiene
// -----------------------------------------------------------------------------

/**
 * Reduce an Aadhaar number that reached the output anyway to its last four
 * digits.
 *
 * The prompt already forbids it and the schema asks only for four characters,
 * but an Aadhaar number is the one piece of this data where a mistake is not
 * recoverable by the person it belongs to, so it is enforced here rather than
 * trusted. It also catches a full number that arrived in a free-text field such
 * as `address`, which the prompt does not govern.
 */
function redactAadhaarNumbers(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.replace(/\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g, (match) => {
      const digits = match.replace(/\D/g, '');
      return `XXXX XXXX ${digits.slice(-4)}`;
    });
  }
  if (Array.isArray(value)) return value.map(redactAadhaarNumbers);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = key === 'aadhaar_last4' && typeof inner === 'string'
        ? inner.replace(/\D/g, '').slice(-4) || null
        : redactAadhaarNumbers(inner);
    }
    return out;
  }
  return value;
}

/**
 * Drop keys the model returned that the spec does not declare.
 *
 * Gemini honours responseSchema closely, but not perfectly, and a model that
 * invents a field is exactly the failure this whole layer exists to prevent.
 * Anything undeclared is discarded rather than persisted.
 */
function keepDeclaredFields(
  raw: Record<string, unknown>,
  spec: ExtractionSpec,
): Record<string, unknown> {
  if (spec.kind === 'GENERIC') {
    const fields = Array.isArray(raw.fields) ? raw.fields : [];
    return {
      document_type: 'GENERIC',
      fields: fields
        .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object')
        .map((entry) => ({
          label: String(entry.label ?? '').slice(0, 200),
          value: String(entry.value ?? '').slice(0, 500),
        }))
        .filter((entry) => entry.label !== '' && entry.value !== ''),
    };
  }

  const allowed = new Set(['document_type', ...spec.fields.map((f) => f.key)]);
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (!allowed.has(key)) continue;
    if (value === undefined) continue;
    out[key] = value === '' ? null : value;
  }

  for (const field of spec.fields) {
    if (out[field.key] === undefined) out[field.key] = null;
  }

  out.document_type = spec.kind;
  return out;
}

/**
 * A 0-1 number for ai_confidence, which is numeric(5,4) and so holds 0.0000-9.9999.
 *
 * A vision model does not return a calibrated probability for "this is right", so
 * nothing here pretends to be one. The value reported is the fraction of the
 * fields this spec expects that the model actually filled in, which is a coverage
 * ratio and is labelled as such in _meta.confidence_basis. A per-field
 * confidence, when the provider supplies one, is kept separately in
 * _meta.field_confidence so that a reviewer can see which field is the weak one
 * rather than being handed a single document-level number.
 */
function coverageConfidence(fields: Record<string, unknown>, spec: ExtractionSpec): number {
  if (spec.kind === 'GENERIC') {
    const list = Array.isArray(fields.fields) ? (fields.fields as unknown[]) : [];
    return list.length ? 1 : 0;
  }
  const expected = spec.fields.filter((f) => f.key !== 'subjects');
  if (!expected.length) return 0;
  const filled = expected.filter((f) => {
    const value = fields[f.key];
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }).length;
  return Math.round((filled / expected.length) * 10_000) / 10_000;
}

// -----------------------------------------------------------------------------
// HTTP helpers
// -----------------------------------------------------------------------------

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

/**
 * The only error text the browser ever sees.
 *
 * ocr_error is readable by the applicant under the existing SELECT policies, so
 * anything written into it, and anything returned here, is written on the
 * assumption that a member of the public will read it. Provider responses, keys,
 * storage paths and stack traces stay in the function log.
 */
function applicantSafeError(reason: string): string {
  switch (reason) {
    case 'not_found':
      return 'That document could not be found.';
    case 'forbidden':
      return 'You do not have access to that document.';
    case 'no_file':
      return 'This document is not linked to an uploaded file, so there is nothing to read.';
    case 'not_configured':
      return 'Document reading is not available on this portal right now. Please contact the administrator.';
    case 'migration_missing':
      return 'Document reading has not been enabled on this portal yet. Please contact the administrator.';
    case 'no_access_token':
      return 'You are not signed in.';
    case 'already_processing':
      return 'This document is already being read.';
    case 'too_many_attempts':
      return 'This document has been read too many times without success. Please contact the administrator.';
    case 'unsupported_type':
      return 'Only PDF, JPG and PNG documents can be read.';
    case 'too_large':
      return 'This document is too large to read.';
    case 'no_file_bytes':
      return 'The stored file could not be read.';
    case 'provider_unavailable':
      return 'The document reading service is not responding. Please try again later.';
    case 'provider_rejected':
      return 'The document could not be read by the reading service.';
    case 'bad_extraction':
      return 'The reading service returned a result this portal could not use.';
    case 'internal':
      return 'This document could not be read. Please contact the administrator.';
    default:
      return 'This document could not be read.';
  }
}

function base64FromBytes(bytes: Uint8Array): string {
  // Chunked so a 5 MB file does not build one enormous intermediate string in a
  // single spread, which is where this idiom runs out of argument slots.
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * True when an error means "a column this function needs is not there".
 *
 * Two different shapes have to be recognised. Through PostgREST — which is how
 * every read and write here happens — a missing column surfaces as PGRST204,
 * "Could not find the 'ocr_status' column of 'application_documents' in the
 * schema cache", which does not contain the words "does not exist" anywhere.
 * A direct SQL error would be 42703 undefined_column. Matching only one of the
 * two is how a migration that has not been applied ends up reported to the
 * applicant as a missing document.
 *
 * PGRST204 is also returned when the column exists but the schema cache has
 * not reloaded, so the operator log below names both causes; the remedy the
 * applicant is told about is the same either way.
 */
function isMissingColumn(error: { code?: string; message?: string }): boolean {
  const code = error.code ?? '';
  const message = error.message ?? '';
  return code === '42703' || code === 'PGRST204' || /column .* does not exist/i.test(message);
}

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------
// One provider, behind one function, so a second one is an added case and not a
// second copy of the state machine. The request is assembled here and nowhere
// else; the key is read from the environment and never leaves the server.
// -----------------------------------------------------------------------------

type ProviderResult = {
  fields: Record<string, unknown>;
  model: string;
  provider: string;
};

async function runGemini(args: {
  apiKey: string;
  model: string;
  mimeType: string;
  bytes: Uint8Array;
  prompt: string;
  schema: SchemaField;
  timeoutMs: number;
}): Promise<ProviderResult> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:generateContent`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': args.apiKey },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ inline_data: { mime_type: args.mimeType, data: base64FromBytes(args.bytes) } }, { text: args.prompt }],
        },
      ],
      generationConfig: {
        // Deterministic on purpose. A scholarship record should not depend on
        // which of two equally valid readings the sampler happened to produce.
        temperature: 0,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: args.schema,
      },
    }),
    signal: AbortSignal.timeout(args.timeoutMs),
  });

  if (!response.ok) {
    // Status only. The body can echo the document and the prompt, and neither
    // belongs in a log line or a response.
    console.error('process-document-ocr: provider returned', response.status, 'for model', args.model);
    throw new Error(response.status === 429 || response.status >= 500 ? 'provider_unavailable' : 'provider_rejected');
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    promptFeedback?: { blockReason?: string };
  };

  const blockReason = payload.promptFeedback?.blockReason;
  if (blockReason) {
    console.error('process-document-ocr: provider blocked the request:', blockReason);
    throw new Error('provider_rejected');
  }

  const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!text.trim()) {
    console.error('process-document-ocr: provider returned no text. finishReason:', payload.candidates?.[0]?.finishReason ?? 'unknown');
    throw new Error('bad_extraction');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error('process-document-ocr: provider response was not JSON');
    throw new Error('bad_extraction');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('bad_extraction');

  return { fields: parsed as Record<string, unknown>, model: args.model, provider: 'gemini' };
}

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publicKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const provider = (Deno.env.get('OCR_PROVIDER') ?? 'gemini').trim().toLowerCase();
  const apiKey = Deno.env.get('OCR_API_KEY') ?? '';
  const model = (Deno.env.get('OCR_MODEL') ?? DEFAULT_MODEL).trim();
  const timeoutMs = Number(Deno.env.get('OCR_TIMEOUT_MS') ?? DEFAULT_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;

  if (!supabaseUrl || !publicKey || !serviceRoleKey) {
    console.error('process-document-ocr is not configured; missing SUPABASE_URL, a public key, or SUPABASE_SERVICE_ROLE_KEY');
    return json({ error: applicantSafeError('not_configured') }, 503);
  }

  // A missing provider key is an operator mistake, not a document failure, so it
  // is reported before the document is claimed and nothing is written. Marking
  // the row 'failed' here would blame the applicant's file for a deployment gap.
  if (provider !== 'gemini' || !apiKey) {
    console.error(`process-document-ocr: provider ${provider} is not available in this deployment or OCR_API_KEY is unset`);
    return json({ error: applicantSafeError('not_configured') }, 503);
  }

  const authOptions = { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } as const;
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: authOptions });

  // ---- 1. who is calling -------------------------------------------------
  const header = request.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return json({ error: applicantSafeError('no_access_token') }, 401);

  // A client bound to the caller's own token, so the read below is subject to
  // the RLS policies rather than to anything this file decides.
  const caller = createClient(supabaseUrl, publicKey, {
    auth: authOptions,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  /**
   * The token is verified rather than decoded, and the resulting user id is
   * deliberately not carried any further.
   *
   * `getUser` is the call that proves this is a real, live session — a token
   * that has been revoked or has expired fails here even though it still decodes.
   * What the id is *not* used for is an ownership test of this file's own: the
   * check that matters is the RLS-scoped read in the next step, which already
   * asks the database "may this caller see this row" and is not answerable by
   * anything in JavaScript. Keeping the id around would invite a second,
   * weaker comparison to be written next to the real one, and the two would
   * eventually disagree.
   */
  const { error: userError } = await caller.auth.getUser(token);
  if (userError) {
    console.error('process-document-ocr: token rejected:', userError.message);
    return json({ error: applicantSafeError('forbidden') }, 401);
  }

  // ---- 2. what may this caller touch? -----------------------------------
  let body: { application_document_id?: unknown };
  try {
    body = (await request.json()) as { application_document_id?: unknown };
  } catch {
    return json({ error: 'A JSON body with application_document_id is required.' }, 400);
  }

  const documentId = typeof body.application_document_id === 'string' ? body.application_document_id.trim() : '';
  if (!UUID_RE.test(documentId)) {
    return json({ error: 'A valid application_document_id is required.' }, 400);
  }

  const { data: link, error: linkError } = await caller
    .from('application_documents')
    .select('id, application_id, applicant_id, document_id, scheme_document_id, document_type, ocr_status, ocr_attempts')
    .eq('id', documentId)
    .maybeSingle();

  if (linkError) {
    // The ocr_* columns are added by 20260929084339, and this SELECT names two
    // of them, so a database without the migration fails here — before anything
    // has been claimed or written. Recognising that case has to happen at this
    // point rather than at the claim below, because the generic 404 below would
    // tell the applicant their document has vanished when in fact the feature
    // is not deployed.
    if (isMissingColumn(linkError)) {
      console.error(
        'process-document-ocr: the ocr_* columns are not visible to PostgREST — 20260929084339_add_document_ocr_processing.sql is either not applied or the schema cache has not reloaded.',
      );
      return json({ error: applicantSafeError('migration_missing') }, 503);
    }
    console.error('process-document-ocr: could not read the link:', linkError.message);
    return json({ error: applicantSafeError('not_found') }, 404);
  }

  // No row for an unauthorised caller and no row for a bad id are the same
  // answer, because a 403 would confirm the row exists.
  if (!link) return json({ error: applicantSafeError('not_found') }, 404);

  // ---- 3. the document is a link, not a file -----------------------------
  if (!link.document_id) {
    await admin
      .from('application_documents')
      .update({ ocr_status: 'failed', ocr_error: applicantSafeError('no_file') })
      .eq('id', documentId);
    return json({ error: applicantSafeError('no_file') }, 409);
  }

  // ---- 4. claim it -------------------------------------------------------
  const currentAttempts = typeof link.ocr_attempts === 'number' ? link.ocr_attempts : 0;
  if (currentAttempts >= MAX_ATTEMPTS) {
    return json({ error: applicantSafeError('too_many_attempts') }, 429);
  }

  /**
   * Compare-and-swap. The `.eq('ocr_attempts', currentAttempts)` plus the
   * `.in('ocr_status', [...])` is what makes the claim atomic: two concurrent
   * invocations both read attempts = 0, both try to move 0 -> 1, and the
   * database lets exactly one of them through. Without the guard this would be
   * a read-then-write race, and a retry storm would process the same file twice
   * and bill the provider twice.
   */
  const { data: claimed, error: claimError } = await admin
    .from('application_documents')
    .update({
      ocr_status: 'processing',
      ocr_error: null,
      ocr_attempts: currentAttempts + 1,
    })
    .eq('id', documentId)
    .eq('ocr_attempts', currentAttempts)
    .in('ocr_status', ['pending', 'queued', 'failed'])
    .select('ocr_attempts')
    .maybeSingle();

  if (claimError) {
    // The ocr_* columns are added by 20260929084339. If they are not deployed
    // this says so precisely, instead of reporting a missing file.
    if (isMissingColumn(claimError)) {
      console.error('process-document-ocr: the ocr_* columns are not deployed. Apply 20260929084339_add_document_ocr_processing.sql first.');
      return json({ error: applicantSafeError('migration_missing') }, 503);
    }
    console.error('process-document-ocr: claim failed:', claimError.message);
    return json({ error: applicantSafeError('internal') }, 500);
  }

  if (!claimed) return json({ error: applicantSafeError('already_processing') }, 409);

  // Every failure from here on has to leave the row in a state a person can read.
  const fail = async (reason: string, status: number) => {
    const message = applicantSafeError(reason);
    await admin
      .from('application_documents')
      .update({ ocr_status: 'failed', ocr_error: message })
      .eq('id', documentId);
    console.error(`process-document-ocr: ${reason} (document ${documentId})`);
    return json({ error: message }, status);
  };

  try {
    // ---- 5. the file, and the requirement it satisfies -------------------
    const { data: file, error: fileError } = await admin
      .from('applicant_documents')
      .select('id, storage_path, mime_type, document_type, document_name')
      .eq('id', link.document_id)
      .maybeSingle();

    if (fileError) return await fail('no_file_bytes', 500);
    if (!file?.storage_path) return await fail('no_file', 409);

    /**
     * The storage key is `{applicant_id}/{code}/{uuid}{ext}`. The first segment
     * is the ownership boundary the RLS policies on storage.objects already
     * enforce; re-checking it here is defence in depth for the one path that
     * bypasses those policies, because the download below is made with the
     * service-role client.
     */
    const [ownerSegment] = file.storage_path.split('/');
    if (!ownerSegment || ownerSegment !== link.applicant_id) {
      console.error('process-document-ocr: storage path does not belong to the application applicant');
      return await fail('forbidden', 403);
    }

    const { data: requirement, error: requirementError } = link.scheme_document_id
      ? await admin
          .from('scheme_documents')
          .select('document_name, scheme_id, schemes(scheme_code, name)')
          .eq('id', link.scheme_document_id)
          .maybeSingle()
      : { data: null, error: null };

    if (requirementError) {
      console.error('process-document-ocr: could not read the requirement:', requirementError.message);
    }

    const schemeRow = (requirement as { schemes?: { scheme_code?: string; name?: string } | null } | null)?.schemes ?? null;

    // ---- 6. the bytes ----------------------------------------------------
    const { data: blob, error: downloadError } = await admin.storage
      .from(BUCKET)
      .download(file.storage_path);

    if (downloadError || !blob) {
      console.error('process-document-ocr: download failed:', downloadError?.message ?? 'no object');
      return await fail('no_file_bytes', 502);
    }

    if (blob.size === 0) return await fail('no_file_bytes', 422);
    if (blob.size > MAX_BYTES) return await fail('too_large', 413);

    const mimeType = file.mime_type || blob.type || 'application/octet-stream';
    if (!ALLOWED_MIME.includes(mimeType)) return await fail('unsupported_type', 415);

    const bytes = new Uint8Array(await blob.arrayBuffer());
    // The bytes go to the provider and to nothing else. They are not logged, not
    // returned, and not written anywhere.
    void bytes.length;

    // ---- 7. read it ------------------------------------------------------
    const kind = resolveDocumentKind({
      applicantCode: file.document_type,
      schemeDocumentName: requirement?.document_name ?? null,
      linkLabel: link.document_type,
    });
    const spec = SPECS[kind];

    const raw = await runGemini({
      apiKey,
      model,
      mimeType,
      bytes,
      prompt: buildPrompt(spec, {
        documentName: requirement?.document_name ?? file.document_name ?? 'the uploaded document',
        schemeName: schemeRow?.name ?? schemeRow?.scheme_code ?? null,
      }),
      schema: buildResponseSchema(spec),
      timeoutMs,
    });

    // ---- 8. keep only what the spec declares, then compare ---------------
    const declared = keepDeclaredFields(raw.fields, spec);
    const scrubbed = redactAadhaarNumbers(declared) as Record<string, unknown>;

    const { data: profileRow } = await admin
      .from('applicant_profiles')
      .select('full_name, first_name, middle_name, last_name, date_of_birth, aadhaar_last4')
      .eq('id', link.applicant_id)
      .maybeSingle();

    const comparison = buildProfileComparison(
      scrubbed,
      (profileRow ?? {}) as ProfileSnapshot,
    );

    const confidence = coverageConfidence(scrubbed, spec);

    /**
     * The stored shape is the document's own field list at the top level, so a
     * reviewer reads ai_extraction.name, plus two reserved keys. The underscore
     * prefix is what guarantees `_meta` and `_profile_comparison` cannot collide
     * with a document field name.
     */
    const extraction = {
      ...scrubbed,
      _meta: {
        schema_version: EXTRACTION_SCHEMA_VERSION,
        document_kind: kind,
        provider: raw.provider,
        model: raw.model,
        processed_at: new Date().toISOString(),
        confidence_basis: 'field_coverage',
        confidence_note:
          'ai_confidence is the fraction of expected fields the reader filled in, not a calibrated probability. A low value means the document was hard to read, not that it is wrong.',
      },
      _profile_comparison: comparison,
    };

    // ---- 9. record the result -------------------------------------------
    /**
     * The columns are listed one by one on purpose.
     *
     * human_verified_data, human_verified_by and human_verified_at are absent
     * from this object and must stay absent. Verification is a person's act; an
     * automatic verification would be a decision this function has no business
     * making, and would be indistinguishable from a real sign-off once written.
     */
    const { error: completeError } = await admin
      .from('application_documents')
      .update({
        ai_extraction: extraction,
        ai_confidence: confidence,
        ocr_status: 'completed',
        ocr_error: null,
        ocr_provider: raw.provider,
        ocr_model: raw.model,
        ocr_processed_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .eq('ocr_status', 'processing');

    if (completeError) {
      console.error('process-document-ocr: could not record the result:', completeError.message);
      return await fail('bad_extraction', 500);
    }

    return json(
      {
        ok: true,
        application_document_id: documentId,
        ocr_status: 'completed',
        document_kind: kind,
        ai_confidence: confidence,
        profile_comparison: comparison.result,
        requires_human_verification: true,
      },
      200,
    );
  } catch (error) {
    // Only the reasons this file throws deliberately keep their own wording.
    // Anything else is a defect here rather than anything about the document,
    // and must not be reported as "the reading service returned something we
    // could not use" — that sentence sends the applicant looking at their
    // certificate for a fault that is not in it.
    const deliberate = error instanceof Error && /^(provider_[a-z]+|bad_extraction|no_file_bytes)$/.test(error.message);
    if (!deliberate) console.error('process-document-ocr: unexpected error', error);
    return await fail(deliberate ? (error as Error).message : 'internal', 502);
  }
});
