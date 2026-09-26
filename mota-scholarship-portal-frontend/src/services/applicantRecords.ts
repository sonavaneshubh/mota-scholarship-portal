/**
 * Applicant-owned records: documents and applications.
 *
 * Why this module exists
 * ---------------------
 * The prototype used to render hardcoded rows from src/data/applicantData.ts.
 * That is the single worst kind of bug in a scholarship portal: a sample
 * "Application under scrutiny" that no officer ever wrote. So this module reads
 * only what the signed-in applicant actually has in the database, and reports
 * honestly when a table is not deployed yet.
 *
 * Table availability
 *   applicant_documents  deployed — see 20260926090200_applicant_profile_rls.sql
 *   applications         NOT deployed — there is no `applications` table in
 *                        supabase/migrations as of this writing. The query below
 *                        is written so that the moment the table and its RLS
 *                        policies land, the applicant pages start showing real
 *                        rows with no frontend change. Until then they render an
 *                        honest empty state instead of invented records.
 *
 * Ownership
 *   applicant_id is always resolved from the authenticated user, never accepted
 *   from the caller, and RLS re-checks it server-side.
 */

import { supabase } from '../lib/supabase';
import type { ApplicantDocumentRecord } from '../types/profile';
import type { ApplicantApplication, ApplicantDocument } from '../types';

export type RecordsStatus = 'loading' | 'ready' | 'unavailable' | 'error';

export interface ApplicantRecordsResult<T> {
  status: RecordsStatus;
  data: T;
  error: string | null;
}

const DOCUMENTS_TABLE = 'applicant_documents';
const APPLICATIONS_TABLE = 'applications';
const PROFILE_TABLE = 'applicant_profiles';

/**
 * Postgres reports a missing relation as 42P01 and a missing column as 42703.
 * PostgREST surfaces the SQLSTATE in `error.code` and a human message separately,
 * so both are checked. A missing relation means "the backend has not shipped
 * this yet", which is different from a permission problem and should not be
 * shown to the applicant as an error.
 */
const MISSING_SCHEMA_CODES = new Set(['42P01', '42703', '42883']);

function isMissingRelation(error: { code?: string | null; message: string }): boolean {
  if (error.code && MISSING_SCHEMA_CODES.has(error.code)) return true;
  return /does not exist|not found in the schema cache/i.test(error.message);
}

async function resolveApplicantId(): Promise<string | null> {
  if (!supabase) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) return null;

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select('id')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (error || !data) return null;
  return (data as { id: string }).id;
}

/* -------------------------------------------------------------------------- */
/* Documents                                                                    */
/* -------------------------------------------------------------------------- */

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  uploaded: 'Uploaded',
  verified: 'Verified',
  rejected: 'Rejected',
  needs_correction: 'Needs correction',
  under_verification: 'Under verification',
};

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function humaniseCode(code: string | null): string {
  if (!code) return 'Document';
  return code
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (character) => character.toUpperCase());
}

function toApplicantDocument(record: ApplicantDocumentRecord): ApplicantDocument {
  const status = record.status ?? 'uploaded';
  return {
    id: record.id,
    name: record.file_name?.trim() || humaniseCode(record.document_code ?? record.document_type),
    type: humaniseCode(record.document_type ?? record.document_code),
    description: record.file_name ? `Uploaded file: ${record.file_name}` : 'Uploaded document.',
    status: (DOCUMENT_STATUS_LABELS[status] ? status : 'uploaded') as ApplicantDocument['status'],
    statusLabel: DOCUMENT_STATUS_LABELS[status] ?? 'Uploaded',
    fileSize: formatBytes(record.file_size),
    uploadedAt: formatDate(record.uploaded_at),
    updatedAt: formatDate(record.uploaded_at),
    required: false,
    storagePath: record.storage_path ?? null,
  };
}

export async function fetchApplicantDocuments(): Promise<ApplicantRecordsResult<ApplicantDocument[]>> {
  if (!supabase) {
    return { status: 'unavailable', data: [], error: null };
  }

  const applicantId = await resolveApplicantId();
  if (!applicantId) {
    return { status: 'unavailable', data: [], error: null };
  }

  const { data, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .select('*')
    .eq('applicant_id', applicantId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    if (isMissingRelation(error)) {
      return { status: 'unavailable', data: [], error: null };
    }
    return { status: 'error', data: [], error: error.message };
  }

  return {
    status: 'ready',
    data: ((data ?? []) as ApplicantDocumentRecord[]).map(toApplicantDocument),
    error: null,
  };
}

/* -------------------------------------------------------------------------- */
/* Applications                                                                 */
/* -------------------------------------------------------------------------- */

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_verification: 'Under verification',
  deficiency_raised: 'Deficiency raised',
  resubmission_required: 'Resubmission required',
  under_scrutiny: 'Under scrutiny',
  selected: 'Selected',
  not_selected: 'Not selected',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

/**
 * Maps an `applications` row onto the view model the existing tables render.
 *
 * Columns are read defensively because the table has not been deployed yet: the
 * first field name that exists wins, and anything absent renders as "—" instead
 * of a fabricated value. No amount, date or status is ever invented here.
 */
function toApplicantApplication(row: Record<string, unknown>): ApplicantApplication {
  const read = (...keys: string[]): string => {
    for (const key of keys) {
      const value = row[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  };

  const status = read('status');
  const statusLabel = APPLICATION_STATUS_LABELS[status] ?? (status ? status : '—');

  return {
    id: read('id', 'application_id', 'reference_number') || '—',
    schemeId: read('scheme_id'),
    schemeName: read('scheme_name', 'scheme') || '—',
    submittedAt: formatDate(read('submitted_at', 'created_at') || null),
    updatedAt: formatDate(read('updated_at', 'last_updated_at') || null),
    status: (APPLICATION_STATUS_LABELS[status] ? status : 'draft') as ApplicantApplication['status'],
    statusLabel,
    nextStep: read('next_step', 'remarks', 'note') || 'No update available.',
    referenceNumber: read('reference_number', 'application_number') || '—',
    amountLabel: read('amount_label', 'sanctioned_amount') || '—',
    documentsComplete: Number(row.documents_complete ?? 0) || 0,
    documentsTotal: Number(row.documents_total ?? 0) || 0,
  };
}

export async function fetchApplicantApplications(): Promise<ApplicantRecordsResult<ApplicantApplication[]>> {
  if (!supabase) {
    return { status: 'unavailable', data: [], error: null };
  }

  const applicantId = await resolveApplicantId();
  if (!applicantId) {
    return { status: 'unavailable', data: [], error: null };
  }

  const { data, error } = await supabase
    .from(APPLICATIONS_TABLE)
    .select('*')
    .eq('applicant_id', applicantId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingRelation(error)) {
      return { status: 'unavailable', data: [], error: null };
    }
    return { status: 'error', data: [], error: error.message };
  }

  return {
    status: 'ready',
    data: ((data ?? []) as Record<string, unknown>[]).map(toApplicantApplication),
    error: null,
  };
}
