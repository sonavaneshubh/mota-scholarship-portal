/**
 * Read model for the document reading result stored on `application_documents`.
 *
 * `ai_extraction` is jsonb written by the `process-document-ocr` Edge Function in
 * the shape `{ ...documentFields, _meta, _profile_comparison }`, alongside
 * `ai_confidence` (a 0-1 field-coverage ratio, NOT a calibrated probability) and
 * the `ocr_status` lifecycle column.
 *
 * Two rules shape everything in this file:
 *
 *  - Nothing renders the stored JSON. The applicant sees a short, useful summary
 *    and the officer sees the detail; neither sees a dump of a provider response.
 *  - `ai_confidence` is described as coverage everywhere it appears, because that
 *    is what it measures.
 *
 * Kept free of React on purpose: a module exporting both a component and a plain
 * function breaks Fast Refresh and trips eslint's react-refresh rule, and every
 * transformation here is worth testing without a renderer.
 */

export type OcrStatus = 'pending' | 'queued' | 'processing' | 'completed' | 'failed';

export type ComparisonOutcome = 'MATCH' | 'NEEDS_REVIEW' | 'NOT_COMPARABLE';

export type DocumentCheckState =
  | 'not-started'
  | 'in-flight'
  | 'complete'
  | 'needs-review'
  | 'failed';

/**
 * The subset of `application_documents` this read model needs. Kept separate from
 * the full link row so a caller holding only the OCR columns can use it.
 */
export interface OcrLinkColumns {
  id: string;
  ocr_status: OcrStatus | string | null;
  ocr_error: string | null;
  ocr_provider: string | null;
  ocr_model: string | null;
  ocr_processed_at: string | null;
  ocr_attempts: number | null;
  ai_extraction: unknown;
  ai_confidence: number | null;
}

export interface ExtractedField {
  key: string;
  label: string;
  value: string;
}

export interface ExtractedSubject {
  name: string;
  obtained: string;
  maximum: string;
  grade: string;
}

export interface ComparisonRow {
  field: string;
  label: string;
  profileValue: string;
  documentValue: string;
  outcome: ComparisonOutcome;
}

export interface DocumentOcrSummary {
  state: DocumentCheckState;
  headline: string;
  detail: string;
  coverage: number | null;
  documentKind: string | null;
  fields: ExtractedField[];
  subjects: ExtractedSubject[];
  comparison: ComparisonRow[];
  comparisonResult: ComparisonOutcome | null;
  canRetry: boolean;
}

const IN_FLIGHT: ReadonlySet<string> = new Set(['pending', 'queued', 'processing']);

const FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  holder_name: 'Name',
  student_name: 'Name',
  date_of_birth: 'Date of birth',
  roll_number: 'Roll number',
  enrollment_number: 'Enrolment number',
  aadhaar_last4: 'Aadhaar ending',
  school: 'School',
  board: 'Board',
  course: 'Course',
  institution: 'Institution',
  college: 'College',
  passing_year: 'Passing year',
  total_marks: 'Total marks',
  percentage: 'Percentage',
  state: 'State',
  district: 'District',
  certificate_number: 'Certificate number',
  issuing_authority: 'Issuing authority',
  date_of_issue: 'Date of issue',
  income: 'Annual income',
  financial_year: 'Financial year',
  holder: 'Holder',
  barcode: 'Barcode',
};

const FIELD_ORDER = [
  'name',
  'holder_name',
  'student_name',
  'date_of_birth',
  'aadhaar_last4',
  'roll_number',
  'enrollment_number',
  'school',
  'institution',
  'college',
  'board',
  'course',
  'passing_year',
  'total_marks',
  'percentage',
  'state',
  'district',
  'certificate_number',
  'issuing_authority',
  'date_of_issue',
  'income',
  'financial_year',
  'holder',
  'barcode',
];

const COMPARISON_LABELS: Record<string, string> = {
  name: 'Name',
  date_of_birth: 'Date of birth',
  aadhaar_last4: 'Aadhaar ending',
};

const KIND_LABELS: Record<string, string> = {
  AADHAAR: 'Aadhaar card',
  DOMICILE: 'Domicile certificate',
  INCOME_CERTIFICATE: 'Income certificate',
  TENTH_MARKSHEET: '10th marksheet',
  TWELFTH_MARKSHEET: '12th marksheet',
  LAST_YEAR_MARKSHEET: 'Previous year marksheet',
  UNCLASSIFIED_MARKSHEET: 'Marksheet',
  GENERIC: 'Document',
};

const RESERVED_KEYS = new Set(['_meta', '_profile_comparison', 'subjects']);

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asText(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function fieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  const spaced = key.replace(/_/g, ' ').trim();
  if (spaced === '') return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function maskLastFour(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return value;
  return `•••• ${digits.slice(-4)}`;
}

function formatCoverage(aiConfidence: number | null): number | null {
  if (typeof aiConfidence !== 'number' || !Number.isFinite(aiConfidence)) return null;
  const clamped = Math.min(1, Math.max(0, aiConfidence));
  return Math.round(clamped * 100);
}

function readSubjects(extraction: Record<string, unknown>): ExtractedSubject[] {
  const raw = extraction.subjects;
  if (!Array.isArray(raw)) return [];

  const subjects: ExtractedSubject[] = [];
  for (const entry of raw) {
    const subject = asRecord(entry);
    const name = asText(subject.name);
    const obtained = asText(subject.marks_obtained);
    const maximum = asText(subject.marks_maximum);
    const grade = asText(subject.grade);
    if (!name && !obtained && !maximum && !grade) continue;
    subjects.push({
      name: name ?? '—',
      obtained: obtained ?? '—',
      maximum: maximum ?? '—',
      grade: grade ?? '—',
    });
  }
  return subjects;
}

function readComparison(extraction: Record<string, unknown>): {
  rows: ComparisonRow[];
  result: ComparisonOutcome | null;
} {
  const comparison = asRecord(extraction._profile_comparison);
  const rawResult = asText(comparison.result);
  const result: ComparisonOutcome | null =
    rawResult === 'MATCH' || rawResult === 'NEEDS_REVIEW' || rawResult === 'NOT_COMPARABLE'
      ? rawResult
      : null;

  const checks = Array.isArray(comparison.checks) ? comparison.checks : [];
  const rows: ComparisonRow[] = [];

  for (const entry of checks) {
    const check = asRecord(entry);
    const field = asText(check.field);
    if (!field) continue;
    const outcome = asText(check.result);
    rows.push({
      field,
      label: COMPARISON_LABELS[field] ?? fieldLabel(field),
      profileValue: asText(check.profile_value) ?? 'Not on your profile',
      documentValue: asText(check.document_value) ?? 'Not found on the document',
      outcome:
        outcome === 'MATCH' || outcome === 'NEEDS_REVIEW' || outcome === 'NOT_COMPARABLE'
          ? outcome
          : 'NOT_COMPARABLE',
    });
  }

  return { rows, result };
}

function readFields(extraction: Record<string, unknown>): ExtractedField[] {
  const present: ExtractedField[] = [];
  const seen = new Set<string>();

  for (const key of FIELD_ORDER) {
    if (seen.has(key)) continue;
    const value = asText(extraction[key]);
    if (!value) continue;
    seen.add(key);
    present.push({
      key,
      label: fieldLabel(key),
      value: key === 'aadhaar_last4' ? maskLastFour(value) : value,
    });
  }

  for (const [key, raw] of Object.entries(extraction)) {
    if (RESERVED_KEYS.has(key) || seen.has(key)) continue;
    const value = asText(raw);
    if (!value) continue;
    present.push({ key, label: fieldLabel(key), value });
  }

  return present;
}

function stateFor(status: string | null, completed: boolean, result: ComparisonOutcome | null): DocumentCheckState {
  if (status === 'failed') return 'failed';
  if (status && IN_FLIGHT.has(status)) return 'in-flight';
  if (!completed) return status ? 'in-flight' : 'not-started';
  return result === 'NEEDS_REVIEW' ? 'needs-review' : 'complete';
}

function copyFor(
  state: DocumentCheckState,
  documentKind: string | null
): { headline: string; detail: string } {
  switch (state) {
    case 'not-started':
      return {
        headline: 'AI document check has not started yet',
        detail:
          'Nothing has been read from this file. This does not affect your application — a reviewing officer will open the document themselves.',
      };
    case 'in-flight':
      return {
        headline: 'AI is processing this document…',
        detail: 'This page updates on its own. You do not need to refresh it.',
      };
    case 'complete':
      return {
        headline: 'AI document check completed',
        detail: documentKind
          ? `The information read from this ${KIND_LABELS[documentKind] ?? 'document'} matches your profile.`
          : 'The information read from this document matches your profile.',
      };
    case 'needs-review':
      return {
        headline: 'Information needs review',
        detail:
          'Something read from this document does not match your profile. Please check the details below and your profile before submitting. This is not a decision on your application — a reviewing officer will look at it.',
      };
    case 'failed':
    default:
      return {
        headline: 'We could not read this document',
        detail:
          'This does not affect your application. A reviewing officer will open the document themselves, and you can try the check again.',
      };
  }
}

/**
 * Turns one attachment row into everything both the applicant and the officer
 * need to render it.
 *
 * A link with no OCR columns at all (an attachment made before the reading
 * feature existed, or one whose reading was never requested) resolves to
 * `not-started` rather than throwing, so the document list renders unchanged for
 * every row that has never been read.
 */
export function summariseDocumentOcr(link: OcrLinkColumns | null | undefined): DocumentOcrSummary {
  const status = link?.ocr_status ?? null;
  const extraction = asRecord(link?.ai_extraction);
  const hasExtraction = Object.keys(extraction).length > 0;
  const { rows, result } = readComparison(extraction);
  const completed = status === 'completed' && hasExtraction;
  const state = stateFor(status, completed, result);
  const meta = asRecord(extraction._meta);
  const documentKind = asText(meta.document_kind);
  const copy = copyFor(state, documentKind);

  return {
    state,
    headline: copy.headline,
    detail: copy.detail,
    coverage: completed ? formatCoverage(link?.ai_confidence ?? null) : null,
    documentKind: documentKind ? (KIND_LABELS[documentKind] ?? documentKind) : null,
    fields: completed ? readFields(extraction) : [],
    subjects: completed ? readSubjects(extraction) : [],
    comparison: completed ? rows : [],
    comparisonResult: completed ? result : null,
    canRetry: Boolean(link?.id) && state === 'failed',
  };
}

/** True while the server may still be reading this attachment. */
export function isOcrInFlight(status: string | null | undefined): boolean {
  return typeof status === 'string' && IN_FLIGHT.has(status);
}

/** True while at least one attachment is still being read, so polling is worth it. */
export function hasOcrWorkInFlight(links: readonly OcrLinkColumns[]): boolean {
  return links.some((link) => isOcrInFlight(link.ocr_status));
}
