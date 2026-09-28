/**
 * Demo Admin reads real submitted applications.
 *
 * Both queries hit the `demo_admin_*` views added by
 * `20260927000270_demo_admin_readonly_submitted_access.sql`. Nothing here reads a
 * mock, and nothing here falls back to one: if Supabase is unconfigured, the
 * policy has not been applied, or the query fails, the caller gets an error and
 * the panel says so. A demo that quietly shows invented rows when the database is
 * unreachable is worse than one that admits it is offline, because it looks like
 * it works.
 */
import { supabase } from '../lib/supabase';
import type { AdminApplication, AdminDocument, AdminDocumentStatus } from '../types/admin';

/** Mirrors a row of `public.demo_admin_submitted_applications`. */
interface SubmittedApplicationRow {
  id: string;
  application_number: string | null;
  status: string | null;
  submitted_at: string | null;
  declaration_accepted: boolean | null;
  applicant_id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  full_name: string | null;
  applicant_full_name_as_per_marksheet: string | null;
  email: string | null;
  mobile_number: string | null;
  alternate_mobile: string | null;
  date_of_birth: string | null;
  gender: string | null;
  course_name: string | null;
  course_level: string | null;
  degree: string | null;
  year_of_study: number | null;
  institution_name: string | null;
  university_name: string | null;
  academic_year: string | null;
  scheme_id: string | null;
  scheme_code: string | null;
  scheme_name: string | null;
  scheme_short_name: string | null;
  scheme_status: string | null;
  scheme_academic_year: string | null;
  renewal_available: boolean | null;
  draft_saved_at: string | null;
  eligibility_result: unknown;
  scheme_answers: Record<string, unknown> | null;
}

/** Mirrors a row of `public.demo_admin_submitted_requirements`. */
interface SubmittedRequirementRow {
  application_id: string;
  application_number: string | null;
  scheme_document_id: string;
  document_type: string | null;
  requirement_name: string | null;
  requirement_description: string | null;
  is_mandatory: boolean | null;
  required_from_course_year: number | null;
  requirement_status: 'required' | 'not_required_at_this_course_year';
  application_document_id: string | null;
  link_status: string | null;
  document_id: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string | null;
  verification_status: string | null;
  document_number: string | null;
  uploaded_at: string | null;
}

/** Mirrors a row of `public.demo_admin_submitted_documents`. */
interface SubmittedDocumentRow {
  id: string;
  application_id: string;
  application_number: string | null;
  scheme_document_id: string | null;
  document_type: string | null;
  link_status: string | null;
  requirement_name: string | null;
  is_mandatory: boolean | null;
  required_from_course_year: number | null;
  document_id: string | null;
  file_document_name: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  verification_status: string | null;
  document_number: string | null;
  uploaded_at: string | null;
}

export type DemoAdminQueryResult<T> =
  | { ok: true; rows: T; requirementsError?: string }
  | { ok: false; error: string };

/**
 * What a scheme asked for, and whether it arrived. Distinct from the
 * `AdminDocument` list, which is only what the applicant actually uploaded: a
 * mandatory requirement with no attachment produces no document row at all, so
 * absence cannot be read off that list.
 */
export interface AdminRequirement {
  schemeDocumentId: string;
  name: string;
  description: string;
  mandatory: boolean;
  requiredFromCourseYear: number | null;
  /** False when the requirement starts above this applicant's course year. */
  appliesToThisApplicant: boolean;
  attached: boolean;
  uploadedAt: string;
  fileName: string;
  storagePath: string | null;
}

function toAdminRequirement(row: SubmittedRequirementRow): AdminRequirement {
  return {
    schemeDocumentId: row.scheme_document_id,
    name: row.requirement_name?.trim() || row.document_type?.trim() || 'Unnamed requirement',
    description: row.requirement_description?.trim() ?? '',
    mandatory: row.is_mandatory === true,
    requiredFromCourseYear: row.required_from_course_year,
    appliesToThisApplicant: row.requirement_status !== 'not_required_at_this_course_year',
    attached: Boolean(row.application_document_id),
    uploadedAt: row.uploaded_at ?? '',
    fileName: row.file_name?.trim() ?? '',
    storagePath: row.storage_path,
  };
}

const REQUIREMENT_COLUMNS =
  'application_id,application_number,scheme_document_id,document_type,requirement_name,requirement_description,is_mandatory,required_from_course_year,requirement_status,application_document_id,link_status,document_id,file_name,file_size,mime_type,storage_path,verification_status,document_number,uploaded_at';

async function readRequirements(applicationId?: string): Promise<DemoAdminQueryResult<AdminRequirement[]>> {
  if (!supabase) {
    return offlineResult();
  }

  let query = supabase.from('demo_admin_submitted_requirements').select(REQUIREMENT_COLUMNS);

  if (applicationId) {
    query = query.eq('application_id', applicationId);
  }

  const { data, error } = await query.order('is_mandatory', { ascending: false });

  if (error) {
    return { ok: false, error: error.message || POLICY_MISSING };
  }

  return { ok: true, rows: ((data ?? []) as SubmittedRequirementRow[]).map(toAdminRequirement) };
}

const NOT_CONNECTED =
  'The Demo Admin is not connected to the database, so no application data can be shown. Check the Supabase environment variables.';
const POLICY_MISSING =
  'The database refused the Demo Admin query. This usually means migration 20260927000270 has not been applied yet, or the Demo Admin account has not been given the demo_admin role.';

function offlineResult<T>(): DemoAdminQueryResult<T> {
  return supabase ? { ok: false, error: POLICY_MISSING } : { ok: false, error: NOT_CONNECTED };
}

function dateOnly(value: string | null): string {
  if (!value) {
    return '';
  }
  // The table appends its own `T00:00:00`, so pass a bare date and keep the
  // submission time out of the sort key.
  return value.slice(0, 10);
}

function joinNames(...parts: (string | null)[]): string {
  return parts.map((part) => part?.trim()).filter(Boolean).join(' ');
}

function applicantName(row: SubmittedApplicationRow): string {
  return (
    joinNames(row.first_name, row.middle_name, row.last_name) ||
    row.full_name?.trim() ||
    row.applicant_full_name_as_per_marksheet?.trim() ||
    row.email?.trim() ||
    'Name not recorded'
  );
}

function courseLabel(row: SubmittedApplicationRow): string {
  return [row.course_name, row.degree, row.course_level].filter(Boolean).join(' · ') || 'Course not recorded';
}

function documentStatus(value: string | null): AdminDocumentStatus {
  switch (value) {
    case 'verified':
      return 'Verified';
    case 'rejected':
      return 'Rejected';
    case 'under_verification':
      return 'Under Verification';
    default:
      return 'Uploaded';
  }
}

export function toAdminDocument(row: SubmittedDocumentRow): AdminDocument {
  const name = row.requirement_name?.trim() || row.file_document_name?.trim() || row.document_type?.trim() || 'Document';
  const uploadedAt = dateOnly(row.uploaded_at);

  return {
    id: row.id,
    applicationId: row.application_id,
    name,
    fileName: row.file_name ?? 'No file name recorded',
    status: documentStatus(row.verification_status),
    uploadedAt,
    updatedAt: uploadedAt,
    required: row.is_mandatory === true,
    storagePath: row.storage_path,
  };
}

function toAdminApplication(row: SubmittedApplicationRow, documents: AdminDocument[]): AdminApplication {
  const applicationDate = dateOnly(row.submitted_at);
  const hasAnyDocument = documents.length > 0;

  return {
    // The view's uuid is the row key; the MOTA- reference is what a human reads,
    // and it is what the list shows and the details route uses.
    id: row.application_number?.trim() || row.id,
    applicantId: row.applicant_id,
    applicantName: applicantName(row),
    email: row.email?.trim() || 'Email not recorded',
    mobile: row.mobile_number?.trim() || row.alternate_mobile?.trim() || 'Mobile not recorded',
    dateOfBirth: row.date_of_birth ?? '',
    gender: row.gender?.trim() || 'Not recorded',
    // No applicant-category column exists in the database, so there is nothing
    // truthful to put here. Blank beats invented.
    category: '',
    address: '',
    college: row.institution_name?.trim() || 'Institute not recorded',
    course: courseLabel(row),
    academicYear: row.academic_year?.trim() || '',
    enrollmentNumber: '',
    previousResult: '',
    schemeId: row.scheme_id ?? '',
    schemeName: row.scheme_name?.trim() || 'Scheme not recorded',
    schemeCode: row.scheme_code?.trim() || '',
    schemeStatus: row.scheme_status?.trim() || '',
    schemeAcademicYear: row.scheme_academic_year?.trim() || '',
    // Null is a genuine "the scheme does not say", so it is kept distinct from
    // false rather than folded into one.
    renewalAvailable: row.renewal_available ?? undefined,
    applicationDate,
    // The view exposes only submitted rows, so every one of them is genuinely
    // waiting for a decision. That is what 'Pending' means here.
    status: 'Pending',
    amount: 0,
    documentStatus: hasAnyDocument ? 'Complete' : 'Documents Required',
    documents,
    lastActivity: applicationDate,
    submittedAt: row.submitted_at ?? '',
    // The guard refuses to submit without this ticked, so a submitted row should
    // always be true. Undefined means the view did not carry the column, which
    // the details page renders as "not recorded" rather than guessing.
    declarationAccepted: row.declaration_accepted ?? undefined,
    eligibilityResult: row.eligibility_result ?? null,
    schemeAnswers: (row.scheme_answers ?? null) as Record<string, unknown> | null,
    draftSavedAt: row.draft_saved_at ?? '',
  };
}

async function readDocuments(): Promise<DemoAdminQueryResult<SubmittedDocumentRow[]>> {
  if (!supabase) {
    return offlineResult();
  }

  const { data, error } = await supabase
    .from('demo_admin_submitted_documents')
    .select(
      'id,application_id,application_number,scheme_document_id,document_type,link_status,requirement_name,is_mandatory,required_from_course_year,document_id,file_document_name,file_name,mime_type,file_size,storage_path,verification_status,document_number,uploaded_at',
    )
    .order('uploaded_at', { ascending: true });

  if (error) {
    return { ok: false, error: error.message || POLICY_MISSING };
  }

  return { ok: true, rows: (data ?? []) as SubmittedDocumentRow[] };
}

const APPLICATION_COLUMNS =
  'id,application_number,status,submitted_at,declaration_accepted,applicant_id,first_name,middle_name,last_name,full_name,applicant_full_name_as_per_marksheet,email,mobile_number,alternate_mobile,date_of_birth,gender,course_name,course_level,degree,year_of_study,institution_name,university_name,academic_year,scheme_id,scheme_code,scheme_name,scheme_short_name,scheme_status,scheme_academic_year,renewal_available,draft_saved_at,eligibility_result,scheme_answers';

export async function fetchSubmittedApplications(): Promise<DemoAdminQueryResult<AdminApplication[]>> {
  if (!supabase) {
    return offlineResult();
  }

  const { data, error } = await supabase
    .from('demo_admin_submitted_applications')
    .select(APPLICATION_COLUMNS)
    .order('submitted_at', { ascending: false });

  if (error) {
    return { ok: false, error: error.message || POLICY_MISSING };
  }

  const rows = (data ?? []) as SubmittedApplicationRow[];

  // The document list lives in its own view, so it is one extra query rather
  // than a join PostgREST would have to embed.
  const documents = await readDocuments();

  if (!documents.ok) {
    return documents;
  }

  const byApplication = new Map<string, AdminDocument[]>();

  for (const row of documents.rows) {
    const bucket = byApplication.get(row.application_id) ?? [];
    bucket.push(toAdminDocument(row));
    byApplication.set(row.application_id, bucket);
  }

  return {
    ok: true,
    rows: rows.map((row) => toAdminApplication(row, byApplication.get(row.id) ?? [])),
  };
}

export interface SubmittedApplicationDetail {
  application: AdminApplication;
  documents: AdminDocument[];
  /** What the scheme required, and whether each requirement was satisfied. */
  requirements: AdminRequirement[];
}

/**
 * Single-application read for the details page. Keyed by the MOTA- reference
 * rather than the row uuid, because that is what the list links to and what an
 * officer reads out over the phone.
 */
export async function fetchSubmittedApplication(
  applicationNumber: string,
): Promise<DemoAdminQueryResult<SubmittedApplicationDetail>> {
  if (!supabase) {
    return offlineResult();
  }

  const { data, error } = await supabase
    .from('demo_admin_submitted_applications')
    .select(APPLICATION_COLUMNS)
    .eq('application_number', applicationNumber)
    .limit(1)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message || POLICY_MISSING };
  }

  if (!data) {
    return {
      ok: false,
      error: `No submitted application with the reference ${applicationNumber} is visible to the Demo Admin.`,
    };
  }

  const applicationId = (data as SubmittedApplicationRow).id;

  const documents = await supabase
    .from('demo_admin_submitted_documents')
    .select(
      'id,application_id,application_number,scheme_document_id,document_type,link_status,requirement_name,is_mandatory,required_from_course_year,document_id,file_document_name,file_name,mime_type,file_size,storage_path,verification_status,document_number,uploaded_at',
    )
    .eq('application_id', applicationId)
    .order('uploaded_at', { ascending: true });

  if (documents.error) {
    return { ok: false, error: documents.error.message || POLICY_MISSING };
  }

  const mapped = ((documents.data ?? []) as SubmittedDocumentRow[]).map(toAdminDocument);

  // A failure here must not blank the page: the applicant, scheme and uploaded
  // documents are all real, and the requirements panel can say it could not read
  // the requirement list rather than the whole details view disappearing.
  const requirements = await readRequirements(applicationId);

  return {
    ok: true,
    rows: {
      application: toAdminApplication(data as SubmittedApplicationRow, mapped),
      documents: mapped,
      requirements: requirements.ok ? requirements.rows : [],
    },
    requirementsError: requirements.ok ? '' : requirements.error,
  };
}
