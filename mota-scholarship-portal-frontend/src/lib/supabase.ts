import { createClient } from '@supabase/supabase-js';

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
  application_mode: string | null;
  official_scheme_url: string | null;
  official_application_url: string | null;
  gr_url: string | null;
  academic_year: string;
  application_start_date: string | null;
  application_end_date: string | null;
  renewal_available: boolean | null;
  status: 'draft' | 'review' | 'published' | 'inactive';
  verification_status: 'pending_review' | 'verified' | 'rejected';
  source_url: string;
  source_type: string | null;
  source_last_verified_at: string | null;
  verified_by: string | null;
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

export interface SchemeEligibility {
  id: string;
  scheme_id: string;
  academic_year: string;
  category_requirement: string | null;
  religion_requirement: string | null;
  gender_requirement: string | null;
  disability_requirement: string | null;
  min_age: number | null;
  max_age: number | null;
  min_percentage: number | null;
  max_income: number | null;
  income_period: string | null;
  residency_requirement: string | null;
  qualification_requirement: string | null;
  course_requirement: string | null;
  institution_requirement: string | null;
  attendance_requirement: string | null;
  admission_requirement: string | null;
  cap_requirement: string | null;
  gap_requirement: string | null;
  other_conditions: string | null;
  created_at: string;
  updated_at: string;
}

export interface SchemeBenefit {
  id: string;
  scheme_id: string;
  academic_year: string;
  benefit_type: string;
  description: string | null;
  amount: number | null;
  amount_currency: string;
  amount_period: string | null;
  coverage: string | null;
  hosteller_amount: number | null;
  day_scholar_amount: number | null;
  conditions: string | null;
  created_at: string;
  updated_at: string;
}

export interface SchemeDocument {
  id: string;
  scheme_id: string;
  document_name: string;
  description: string | null;
  is_mandatory: boolean;
  applicant_type: string | null;
  academic_year: string | null;
  source_text: string | null;
  created_at: string;
  updated_at: string;
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
  description: string;
  stats: { label: string; value: string; emphasize?: boolean }[];
  applyHref: string;
}

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
    guidelinesAvailable: !!scheme.gr_url,
    description: scheme.description || scheme.overview || '',
    stats: [
      { label: 'Academic Year', value: scheme.academic_year, emphasize: true },
      { label: 'Department', value: deptName },
      { label: 'Status', value: scheme.status },
    ],
    // Empty string means "no official application URL is published". A placeholder
    // href would render a working-looking Apply button that leads nowhere.
    applyHref: scheme.official_application_url ?? '',
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