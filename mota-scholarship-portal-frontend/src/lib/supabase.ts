import { createClient } from '@supabase/supabase-js';
import { resolveGuidelineUrl } from '../data/schemeGuidelines';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;

export const DEMO_MODE = !isSupabaseConfigured;

// Types for the new scholarship master tables
export interface Department {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  official_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SchemeCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Mirrors the deployed `public.schemes` table.
 *
 * This deliberately lists only columns that exist in the database, verified
 * against PostgREST. Earlier revisions of this file also described scheme_type,
 * overview, application_mode, official_scheme_url, official_application_url,
 * gr_url, renewal_available and source_* — none of which are in the deployed
 * table, so every read of them returned undefined and the UI rendered
 * confident-looking blanks. Add a column here only after it exists in the
 * database.
 *
 * scheme_type and overview are the exception, and they are back. Migration
 * 20260927000000 added both to the deployed table and
 * 20260927000008_scheme_detail_content.sql re-asserts them idempotently, so
 * they are now genuinely readable. They are still nullable: a scheme row that
 * has not been through the new seed has no value, and the detail view says so
 * rather than substituting a default that nobody verified.
 */
export interface Scheme {
  id: string;
  scheme_code: string;
  name: string;
  short_name: string | null;
  department_id: string;
  category_id: string;
  scheme_type: string | null;
  description: string | null;
  overview: string | null;
  academic_year: string;
  application_start_date: string | null;
  application_end_date: string | null;
  status: 'draft' | 'review' | 'published' | 'inactive' | 'archived';
  verification_status: 'pending_review' | 'verified' | 'rejected';
  is_active: boolean;
  created_by: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;

  // Joined fields
  departments?: Department;
  scheme_categories?: SchemeCategory;
}

// Scheme row as returned by the list/detail queries, which only select a subset
// of the joined department/category columns.
export type SchemeWithRelations = Scheme & {
  departments?: Pick<Department, 'id' | 'name' | 'code'> | null;
  scheme_categories?: Pick<SchemeCategory, 'id' | 'name'> | null;
};

/**
 * Lifecycle of an `applications` row. The vocabulary is the one the table's
 * check constraint enforces and the one applicantRecords.ts maps to labels; it
 * is deliberately snake_case because it mirrors the column, not the UI label.
 */
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_verification'
  | 'deficiency_raised'
  | 'resubmission_required'
  | 'under_scrutiny'
  | 'selected'
  | 'not_selected'
  | 'rejected'
  | 'withdrawn';

/**
 * A row of `public.applications`, as inserted by an "Apply Now" click.
 *
 * The column set mirrors the live table exactly. It was read back from the
 * deployed PostgREST schema rather than assumed, which is how we know the
 * human-readable reference is `application_number` and that there is no
 * `application_id` column on this table.
 *
 * `application_number` is the reference the applicant is shown and quotes
 * (APP-2026-A1B2C3D4). It is minted by the set_application_reference() trigger in
 * the database — not in UI state. `id` is the surrogate primary key; both are real
 * and stable.
 *
 * The form is routed by `id`, not by `application_number`. See
 * lib/applicationHandle: emitting a reference we did not generate was what made
 * Apply Now land on "Application not found", and the reference stays a display
 * value. The reference is still accepted inbound, so a shared pretty URL works.
 */
export interface Application {
  id: string;
  /**
   * Nullable on purpose. It is minted by the set_application_reference() trigger
   * in 20260927000002_create_applications.sql, so it is null on any project where
   * that migration has not been deployed. Typing it as a plain `string` invited
   * code that assumed it was always there and quietly built a link to
   * /applicant/applications/null.
   */
  application_number: string | null;
  applicant_id: string;
  scheme_id: string;
  status: ApplicationStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;

  /* --- added by 20260927000003_application_form_data.sql ------------------- *
   * The form's own storage. Deliberately the *only* application-scoped record
   * of applicant-entered data: everything the profile already holds is read from
   * the profile tables instead of being snapshotted here, so editing My Profile
   * updates every application at once rather than leaving stale copies behind.
   *
   * Optional because these four columns do not exist until that migration has
   * been applied. readStoredAnswers() in applicationFormService treats a missing
   * key as "no answers saved yet" rather than failing the load, so the form works
   * on an un-migrated project instead of erroring. */
  scheme_answers?: Record<string, unknown> | null;
  declaration_accepted?: boolean | null;
  declaration_accepted_at?: string | null;
  draft_saved_at?: string | null;
}

/**
 * Mirrors the deployed `public.scheme_eligibility` table. There is no
 * `academic_year` column here — filtering a query by it returns PostgreSQL
 * 42703 "column does not exist", which is what silently emptied the
 * eligibility section of the scheme detail page.
 */
export interface SchemeEligibility {
  id: string;
  scheme_id: string;
  academic_year: string;
  min_age: number | null;
  max_age: number | null;
  // Free-text requirement columns. PostgREST returns these as strings, and
  // older rows can hold a JSON array, so the UI normalises both shapes through
  // describeList() rather than calling string methods on them.
  category_requirement: string[] | string | null;
  religion_requirement: string[] | string | null;
  gender_requirement: string[] | string | null;
  disability_requirement: string[] | string | null;
  qualification_requirement: string[] | string | null;
  course_requirement: string[] | string | null;
  residency_requirement: string[] | string | null;
  institution_requirement: string[] | string | null;
  attendance_requirement: string[] | string | null;
  admission_requirement: string[] | string | null;
  cap_requirement: string[] | string | null;
  gap_requirement: string[] | string | null;
  min_percentage: number | null;
  max_income: number | null;
  // 'per annum' or similar. Null when the column is not meaningful, such as on
  // a scheme with no income criterion at all.
  income_period: string | null;
  other_conditions: Record<string, unknown> | string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Mirrors the deployed `public.scheme_benefits` table. Amounts are null in the
 * data, and there are no amount_currency/amount_period/coverage/hosteller or
 * day-scholar columns, so the UI must not imply a per-year or per-hosteller
 * figure it cannot source.
 */
export interface SchemeBenefit {
  id: string;
  scheme_id: string;
  academic_year: string;
  benefit_type: string;
  description: string | null;
  amount: number | null;
  frequency: string | null;
  conditions: string | null;
  // Added by 20260927000008_scheme_detail_content.sql.
  //
  // A single scalar `amount` cannot express a stipend that differs by
  // residence, so the hosteller and day-scholar rates get their own columns
  // instead of being flattened into prose. `benefit_group` labels a tier within
  // one benefit_type (I, II, III, IV for the stipend groups); it is null for
  // benefits that are not tiered, which is why these stay nullable rather than
  // defaulting to an empty string that would look like a real group.
  benefit_group: string | null;
  amount_period: string | null;
  coverage: string | null;
  hosteller_amount: number | null;
  day_scholar_amount: number | null;
  created_at: string;
}

/**
 * Mirrors the deployed `public.scheme_process_steps` table, added by
 * 20260927000008_scheme_detail_content.sql. One ordered step an applicant
 * passes through, from submission through to payment.
 *
 * `is_verified` is false until a department officer has checked the step
 * against the scheme's own guideline, so the detail view can mark the pipeline
 * as provisional rather than presenting it as settled.
 */
export interface SchemeProcessStep {
  id: string;
  scheme_id: string;
  step_number: number;
  title: string;
  description: string | null;
  actor: string | null;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Mirrors the deployed `public.scheme_criteria` table, added by
 * 20260927000008_scheme_detail_content.sql.
 *
 * Separate from SchemeEligibility on purpose: that table holds the
 * machine-checkable values used to pre-evaluate an applicant (income ceiling,
 * minimum percentage, eligible categories), whereas this holds the ordered
 * conditions a person reads. They answer different questions and one cannot be
 * reliably derived from the other.
 */
export interface SchemeCriterion {
  id: string;
  scheme_id: string;
  criterion_order: number;
  label: string;
  detail: string | null;
  is_mandatory: boolean;
  source_text: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Mirrors the deployed `public.scheme_documents` table. There is no
 * `updated_at`, `applicant_type` or `source_text` column.
 */
export interface SchemeDocument {
  id: string;
  scheme_id: string;
  document_type: string | null;
  document_name: string;
  description: string | null;
  is_mandatory: boolean | null;
  accepted_formats: string | null;
  max_file_size_mb: number | null;
  created_at: string;
}

export interface SchemeSource {
  id: string;
  scheme_id: string;
  source_type: string;
  source_url: string;
  gr_url: string | null;
  source_title: string | null;
  source_last_checked_at: string;
  content_hash: string | null;
  verification_status: 'pending_review' | 'verified' | 'rejected';
  notes: string | null;
  created_at: string;
}

export interface SchemeVersion {
  id: string;
  scheme_id: string;
  academic_year: string;
  data_snapshot: Record<string, unknown>;
  source_url: string | null;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
}

// API Response types
export interface SchemeListResponse {
  schemes: SchemeWithRelations[];
  total: number;
  page: number;
  limit: number;
}

export interface SchemeDetailResponse {
  scheme: SchemeWithRelations;
  eligibility: SchemeEligibility | null;
  benefits: SchemeBenefit[];
  documents: SchemeDocument[];
  sources: SchemeSource[];
  versions: SchemeVersion[];
  /** Ordered pipeline from submission to payment. Empty when none is recorded. */
  processSteps: SchemeProcessStep[];
  /** Ordered eligibility conditions. Empty when none is recorded. */
  criteria: SchemeCriterion[];
}

export interface SchemeFilters {
  department_id?: string;
  category_id?: string;
  academic_year?: string;
  search?: string;
  page?: number;
  limit?: number;
  status?: 'draft' | 'review' | 'published' | 'inactive';
  verification_status?: 'pending_review' | 'verified' | 'rejected';
}

// Frontend types for compatibility
export interface ApplicantScheme {
  id: string;
  name: string;
  shortName: string;
  category: string;
  categoryLabel: string;
  badgeTone: 'blue' | 'purple' | 'green' | 'amber';
  statusLabel: string;
  statusActive: boolean;
  demo: boolean;
    department: string;
    guidelinesAvailable: boolean;
    /**
     * Resolved guideline download URL, or an empty string when the scheme has
     * no document. Prefer this over re-deriving availability from
     * `guidelinesAvailable`, so the link and the label can never disagree.
     */
    guidelineUrl: string;
  description: string;
  stats: { label: string; value: string; emphasize?: boolean }[];
  applyHref: string;
}

/**
 * Columns the guideline/overview fallback reads, but which the deployed
 * public.schemes table does not have. Kept off `Scheme` on purpose so nothing
 * depends on a column that is not in the database; reading them optionally means
 * a migration that adds them is picked up without another code change.
 */
type SchemeOptionalColumns = {
  gr_url?: string | null;
  overview?: string | null;
  official_application_url?: string | null;
};

// Helper to convert DB scheme to frontend format
export function mapSchemeToFrontend(scheme: SchemeWithRelations): ApplicantScheme {
  const categoryMap: Record<string, { label: string; tone: ApplicantScheme['badgeTone'] }> = {
    'Post Matric Scholarship': { label: 'Scholarship', tone: 'amber' },
    'Pre Matric Scholarship': { label: 'Scholarship', tone: 'blue' },
    'Freeship': { label: 'Freeship', tone: 'green' },
    'Merit Scholarship': { label: 'Merit', tone: 'purple' },
    'Maintenance Allowance': { label: 'Maintenance', tone: 'amber' },
    'Disability Scholarship': { label: 'Disability', tone: 'blue' },
    'Tribal Scholarship': { label: 'Tribal', tone: 'green' },
    'Fellowship': { label: 'Fellowship', tone: 'purple' },
    'Overseas Study Support': { label: 'Overseas', tone: 'blue' },
    'Other': { label: 'Other', tone: 'purple' },
  };

  const catInfo = categoryMap[scheme.scheme_categories?.name || ''] || { label: 'Other', tone: 'slate' };
  const deptName = scheme.departments?.name || 'Unknown Department';
  // public.schemes has no gr_url column, so the database value is read
  // optionally rather than declared on `Scheme`. resolveGuidelineUrl then falls
  // back to the scheme-code table, and picks the column up automatically if a
  // future migration adds it.
  const optionalColumns = scheme as SchemeWithRelations & SchemeOptionalColumns;
  const guidelineUrl = resolveGuidelineUrl(optionalColumns.gr_url, scheme.scheme_code);
  
  return {
    id: scheme.id,
    name: scheme.name,
    shortName: scheme.short_name || scheme.name.substring(0, 30),
    category: (scheme.scheme_categories?.name || 'other').toLowerCase().replace(/\s+/g, '-'),
    categoryLabel: scheme.scheme_categories?.name || 'Other',
    badgeTone: catInfo.tone,
    statusLabel: scheme.status === 'published' && scheme.verification_status === 'verified' ? 'Active' : 'Draft',
    statusActive: scheme.status === 'published' && scheme.verification_status === 'verified',
    demo: false,
    department: deptName,
      guidelinesAvailable: guidelineUrl !== '',
      guidelineUrl,
    description: scheme.description || optionalColumns.overview || '',
    stats: [
      { label: 'Academic Year', value: scheme.academic_year, emphasize: true },
      { label: 'Department', value: deptName },
      { label: 'Status', value: scheme.status },
    ],
    // Empty string means "no official application URL is published". A placeholder
    // href would render a working-looking Apply button that leads nowhere.
    applyHref: optionalColumns.official_application_url ?? '',
  };
}

// Eligibility evaluation types
export type EligibilityResult = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'NEEDS_REVIEW';

export interface EligibilityEvaluation {
  result: EligibilityResult;
  reasons: string[];
  matched: string[];
  missing: string[];
}

export interface ApplicantProfileForEligibility {
  category: string;
  annual_income: number | null;
  course: string | null;
  gender: string | null;
  age: number | null;
  state: string | null;
  district: string | null;
  previous_percentage: number | null;
  admission_mode: string | null; // CAP, management, etc.
  institution_type: string | null;
  is_hosteller: boolean | null;
}