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
  data_snapshot: Record<string, any>;
  source_url: string | null;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
}

// API Response types
export interface SchemeListResponse {
  schemes: Scheme[];
  total: number;
  page: number;
  limit: number;
}

export interface SchemeDetailResponse {
  scheme: Scheme;
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
export function mapSchemeToFrontend(scheme: Scheme & { departments?: Department; scheme_categories?: SchemeCategory }): ApplicantScheme {
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
    applyHref: scheme.official_application_url || '#apply-placeholder',
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