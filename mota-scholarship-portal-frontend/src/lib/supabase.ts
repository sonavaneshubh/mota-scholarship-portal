import { createClient } from '@supabase/supabase-js';
import { resolveGuidelineUrl } from '../data/schemeGuidelines';
import { describeEnvValue, diagnosticError, projectHost } from './diagnostics';

/**
 * Environment variables, named once.
 *
 * Vite inlines `import.meta.env.VITE_*` at **build** time, not at runtime. A
 * Vercel build therefore reads these from the project's environment variables at
 * the moment `npm run build` runs, and the values are baked into the emitted
 * bundle. Adding the variables to Vercel after a deployment has been built
 * changes nothing until a new deployment is produced.
 *
 * Both key names are accepted because Supabase renamed the browser key:
 * `VITE_SUPABASE_PUBLISHABLE_KEY` is the current name and
 * `VITE_SUPABASE_ANON_KEY` is the older one. Neither is a secret — both are
 * public, browser-safe values — but only the publishable/anon key may ever be
 * used here. The service-role key must never reach a frontend build.
 */
const URL_VAR = 'VITE_SUPABASE_URL';
const PUBLISHABLE_KEY_VAR = 'VITE_SUPABASE_PUBLISHABLE_KEY';
const ANON_KEY_VAR = 'VITE_SUPABASE_ANON_KEY';

const supabaseUrl = import.meta.env[URL_VAR]?.trim() ?? '';
const publishableKey = import.meta.env[PUBLISHABLE_KEY_VAR]?.trim() ?? '';
const anonKey = import.meta.env[ANON_KEY_VAR]?.trim() ?? '';
const supabaseKey = publishableKey || anonKey;

/**
 * Names of the variables the build is missing.
 *
 * Variable *names* only, never values, so this is safe to log or display. Empty
 * means the backend is configured, which is the only condition under which the
 * portal talks to a real database.
 */
export const missingSupabaseEnvVars: string[] = [
  ...(supabaseUrl ? [] : [URL_VAR]),
  ...(supabaseKey ? [] : [PUBLISHABLE_KEY_VAR]),
];

/**
 * Whether the URL is something `createClient` will accept.
 *
 * `createClient` throws synchronously on a malformed URL, and it is called at
 * module scope. An unusable value in the environment would therefore take down
 * the whole bundle before React renders, which is a white screen with one red
 * console line. Treating it as "not configured" instead keeps the portal
 * renderable and lets it say *why* it cannot reach the database.
 */
function isUsableSupabaseUrl(value: string): boolean {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = isUsableSupabaseUrl(supabaseUrl) && Boolean(supabaseKey);

/**
 * User-facing explanation for a portal that cannot reach its database.
 *
 * Deliberately free of environment variable names, hostnames and anything else
 * about the deployment: this string is rendered to applicants. The
 * variable-level detail is available separately through
 * `missingSupabaseEnvVars` for developers.
 */
export const supabaseConfigNotice =
  'Sign-in and scheme data are temporarily unavailable because this portal is not connected to its authentication service. Please contact the administrator.';

/**
 * Session persistence for a Vite SPA.
 *
 * These three settings are required for a browser-only Supabase client and were
 * already correct; they are kept explicit because changing any of them silently
 * logs every applicant out on refresh:
 *
 *   persistSession      the session is written to localStorage, so a refresh or a
 *                       reopened tab does not require signing in again
 *   autoRefreshToken    the access token is refreshed before it expires, so a
 *                       long session does not drop the user at the dashboard
 *   detectSessionInUrl  the tokens in a password-reset / email-confirmation
 *                       callback URL are consumed and removed from the address bar
 */
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

/**
 * Reports the Supabase configuration once, at module load, in development only.
 *
 * The single most useful line when the portal is misconfigured: it answers
 * "was the value inlined into this build at all?", and if it was, "which project
 * is this build pointed at?" — the question that distinguishes a missing
 * environment variable from a variable pointing at the wrong Supabase project.
 */
diagnosticError('supabase', 'configuration', {
  configured: isSupabaseConfigured,
  demoMode: DEMO_MODE,
  missingEnvVars: missingSupabaseEnvVars,
  url: describeEnvValue(supabaseUrl),
  key: {
    ...describeEnvValue(supabaseKey),
    // Which of the two accepted names supplied it, so a project configured with
    // only the older name is obvious rather than a mystery.
    source: publishableKey ? PUBLISHABLE_KEY_VAR : anonKey ? ANON_KEY_VAR : null,
  },
  projectHost: projectHost(supabaseUrl),
});

if (!isSupabaseConfigured) {
  diagnosticError(
    'supabase',
    'no Supabase client was created, so every database read returns empty and ' +
      'sign-in falls back to the demo accounts. On Vercel this means the build ' +
      'ran without its VITE_SUPABASE_* environment variables, or with an unusable URL.',
    { missingEnvVars: missingSupabaseEnvVars },
  );
}

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
 * Mirrors the deployed `public.scheme_eligibility` table exactly.
 *
 * The column names here are the live ones, verified against the hosted schema:
 * `eligible_categories`, `eligible_course_types`, `eligible_states`,
 * `maximum_family_income`, `other_rules`, `minimum_age`, `maximum_age`,
 * `minimum_percentage`, `eligible_gender`, `eligible_course_levels`,
 * `required_domicile`, `required_hosteller`. Naming a column that does not
 * exist is not a type error, it is a silent `undefined` at runtime, so this
 * interface deliberately carries nothing the table does not have. The
 * qualification, institution, disability, attendance, admission and cap
 * requirements that earlier revisions of this file declared have no column
 * behind them and are therefore not represented here.
 *
 * The descriptive columns are jsonb and currently hold arrays such as
 * `["ST (Scheduled Tribe)"]`, but the UI normalises both shapes through
 * describeList() rather than assuming an array.
 */
export interface SchemeEligibility {
  id: string;
  scheme_id: string;
  // Present as a column, but seeded as an empty string on every current row, so
  // it is not usable as a required value.
  academic_year: string | null;
  minimum_age: number | null;
  maximum_age: number | null;
  eligible_categories: string[] | string | null;
  eligible_gender: string[] | string | null;
  eligible_course_levels: string[] | string | null;
  eligible_course_types: string[] | string | null;
  eligible_states: string[] | string | null;
  maximum_family_income: number | null;
  minimum_percentage: number | null;
  required_domicile: boolean | null;
  required_hosteller: boolean | null;
  /**
   * jsonb, not text. Populated by
   * 20260927000120_official_scheme_data_eligibility.sql with a structured object
   * whose keys are official rule names, plus `source_ref`, `not_specified_officialy`
   * and `open_conflict`. It used to be a plain sentence of prose, so anything
   * treating it as a string will now be wrong.
   */
  other_rules: Record<string, unknown> | null;
  /**
   * Added by 20260927000110_official_scheme_data_ddl.sql. NULL means the
   * guideline does not state a qualifying examination (BPVGK), which is a real
   * answer and must be shown as such rather than filled in.
   */
  qualifying_examination: string[] | null;
  /**
   * Added by the same migration. The official institution categories a student
   * may study at. NULL means the guideline states no such requirement.
   */
  institution_requirement: string[] | null;
  created_at: string;
  updated_at: string;
}

/**
 * Mirrors the deployed `public.scheme_benefits` table exactly: `benefit_type`,
 * `description`, `amount`, `frequency`, `conditions`, `academic_year`,
 * `currency` and `amount_basis`. There is no `benefit_group`, `amount_period`,
 * `coverage`, `hosteller_amount` or `day_scholar_amount` column, and no
 * `updated_at` either, so none of them are declared here.
 *
 * Hosteller and day-scholar rates live in SEPARATE rows, as do the four
 * BVOBC course groups and the two AZKMI Ph.D tenure bands. Nothing may be
 * merged back into one row for display.
 */
export interface SchemeBenefit {
  id: string;
  scheme_id: string;
  academic_year: string | null;
  benefit_type: string;
  description: string | null;
  /**
   * NULL whenever the official value is not a fixed number: as-per-actuals
   * items, State-decided fees and the UGC-percentage HRA. NULL must render as
   * words, never as zero.
   */
  amount: number | null;
  frequency: string | null;
  conditions: string | null;
  /** ISO code: 'INR', 'USD', 'GBP', or NULL when not stated officially. */
  currency: string | null;
  /**
   * How `amount` must be read: 'fixed' | 'state_fixed' | 'percentage' |
   * 'actual' | 'pro_rated'. 'actual' and 'state_fixed' rows are expected to
   * have a NULL amount.
   */
  amount_basis: string | null;
  created_at: string;
}

/**
 * Mirrors the deployed `public.scheme_process_steps` table, created by
 * 20260927000110_official_scheme_data_ddl.sql and populated by
 * 20260927000130_official_scheme_data_process_steps.sql.
 *
 * One ordered step an applicant passes through, from submission through to
 * payment. `step_order` is the sequence number and is unique per scheme.
 * `sla_or_timeline` holds a SUGGESTED official date, never a fixed one.
 */
export interface SchemeProcessStep {
  id: string;
  scheme_id: string;
  step_order: number;
  title: string;
  description: string | null;
  actor: string | null;
  /** Official suggested date or timeline, or NULL when none is stated. */
  sla_or_timeline: string | null;
  /** Guideline document and page/section the step was taken from. */
  source_ref: string | null;
  created_at: string;
}

/**
 * Mirrors the deployed `public.scheme_criteria` table, created by
 * 20260927000110_official_scheme_data_ddl.sql and populated by
 * 20260927000140_official_scheme_data_criteria.sql.
 *
 * Separate from SchemeEligibility on purpose: this holds official rules that do
 * not fit a scalar column — AZKMI's three course-dependent maximum ages, ARG45's
 * four slot allocations, AZKMI's four field allocations and BVOBC's four course
 * groups. `criteria_type` groups them and `criteria_key` is unique per type.
 */
export interface SchemeCriterion {
  id: string;
  scheme_id: string;
  criteria_type: string;
  criteria_key: string;
  title: string;
  description: string | null;
  /** Numeric rule value, e.g. a maximum age or a slot count. */
  numeric_value: number | null;
  text_value: string | null;
  /** Course, stream or category the rule applies to, or NULL scheme-wide. */
  applies_to: string | null;
  source_ref: string | null;
  created_at: string;
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
  accepted_formats: string[] | string | null;
  /** Size limit in MB. NULL means no official limit is stated for the scheme. */
  max_file_size_mb: number | null;
  academic_year: string | null;
  /**
   * Added by 20260927000110_official_scheme_data_ddl.sql. Only A023B has an
   * official fresh/renewal matrix; every other scheme uses true/true.
   */
  is_required_fresh: boolean;
  is_required_renewal: boolean;
  /**
   * Added by 20260927000200_remove_dummy_data_and_normalize_documents.sql.
   * Lowest course year (1-based) at which this document is required, or null
   * when it is required at every year. Only the "Previous / Last Year Marksheet"
   * rows on BPVGK and BVOBC use 2, which is how a first-year applicant is kept
   * from being asked for a previous-year mark sheet.
   */
  required_from_course_year: number | null;
  created_at: string;
}

export interface SchemeSource {
  id: string;
  scheme_id: string;
  source_type: string | null;
  source_url: string | null;
  source_title: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_at: string | null;
  verified_by: string | null;
  content_hash: string | null;
  retrieved_at: string | null;
  created_at: string;
}

export interface SchemeVersion {
  id: string;
  scheme_id: string;
  version_number: number;
  academic_year: string | null;
  /** jsonb. Populated by 20260927000100_snapshot_pre_official_data_migration.sql. */
  snapshot: Record<string, unknown>;
  change_summary: string | null;
  created_by: string | null;
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