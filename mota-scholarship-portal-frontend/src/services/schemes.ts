import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { SchemeDetailResponse, SchemeFilters, SchemeListResponse } from '../lib/supabase';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function fetchSchemes(filters: SchemeFilters = {}): Promise<SchemeListResponse> {
  if (!isSupabaseConfigured || !supabase) {
    return { schemes: [], total: 0, page: 1, limit: DEFAULT_LIMIT };
  }

  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('schemes')
    .select(`
      *,
      departments (id, name, code),
      scheme_categories (id, name)
    `, { count: 'exact' })
    .eq('status', 'published')
    .eq('verification_status', 'verified')
    .eq('is_active', true)
    .order('name', { ascending: true })
    .range(from, to);

  if (filters.department_id) {
    query = query.eq('department_id', filters.department_id);
  }
  if (filters.category_id) {
    query = query.eq('category_id', filters.category_id);
  }
  if (filters.academic_year) {
    query = query.eq('academic_year', filters.academic_year);
  }
  if (filters.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching schemes:', error);
    return { schemes: [], total: 0, page, limit };
  }

  return {
    schemes: data || [],
    total: count ?? 0,
    page,
    limit,
  };
}

export async function fetchSchemeDetail(schemeId: string): Promise<SchemeDetailResponse | null> {
  if (!supabase) {
    return null;
  }

  const { data: scheme, error: schemeError } = await supabase
    .from('schemes')
    .select(`
      *,
      departments (id, name, code),
      scheme_categories (id, name)
    `)
    .eq('id', schemeId)
    .eq('status', 'published')
    .eq('verification_status', 'verified')
    .eq('is_active', true)
    .single();

  if (schemeError || !scheme) {
    return null;
  }

  // The child tables are related to a scheme, not to a year. None of them has an
  // `academic_year` column, so filtering by it returned PostgreSQL 42703 and
  // every related section on the detail page rendered empty. `maybeSingle` is
  // used because a scheme with no eligibility row is a valid state, not an error.
  const [eligibility, benefits, documents, sources, versions, processSteps, criteria] = await Promise.all([
    supabase
      .from('scheme_eligibility')
      .select('*')
      .eq('scheme_id', schemeId)
      .maybeSingle(),
    supabase
      .from('scheme_benefits')
      .select('*')
      .eq('scheme_id', schemeId)
      // Only `benefit_type` exists as a sort key. `benefit_group` was also being
      // ordered by and is not a column on the table, so that second sort had no
      // effect; ordering by it on its own returns PostgreSQL 42703.
      .order('benefit_type'),
    supabase
      .from('scheme_documents')
      .select('*')
      .eq('scheme_id', schemeId),
    supabase
      .from('scheme_sources')
      .select('*')
      .eq('scheme_id', schemeId),
    supabase
      .from('scheme_versions')
      .select('*')
      .eq('scheme_id', schemeId)
      .order('created_at', { ascending: false })
      .limit(5),
    // Ordered by their own sequence rather than by insertion time, so a step
    // that was edited later still reads in the right order.
    supabase
      .from('scheme_process_steps')
      .select('*')
      .eq('scheme_id', schemeId)
      .order('step_order'),
    // criteria has no single sequence column: it is grouped by criteria_type and
    // keyed by criteria_key, so it is ordered by that pair instead.
    supabase
      .from('scheme_criteria')
      .select('*')
      .eq('scheme_id', schemeId)
      .order('criteria_type')
      .order('criteria_key'),
  ]);

  // Log each related-table failure instead of silently returning empty lists,
  // which is what made a wrong column name look like "this scheme has no data".
  if (eligibility.error) console.error('Error fetching scheme eligibility:', eligibility.error);
  if (benefits.error) console.error('Error fetching scheme benefits:', benefits.error);
  if (documents.error) console.error('Error fetching scheme documents:', documents.error);
  if (sources.error) console.error('Error fetching scheme sources:', sources.error);
  if (versions.error) console.error('Error fetching scheme versions:', versions.error);
  if (processSteps.error) console.error('Error fetching scheme process steps:', processSteps.error);
  if (criteria.error) console.error('Error fetching scheme criteria:', criteria.error);

  return {
    scheme,
    eligibility: eligibility.data,
    benefits: benefits.data || [],
    documents: documents.data || [],
    sources: sources.data || [],
    versions: versions.data || [],
    processSteps: processSteps.data || [],
    criteria: criteria.data || [],
  };
}

export async function fetchDepartments() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('departments')
    .select('id, name, code')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching departments:', error);
    return [];
  }

  return data || [];
}

export async function fetchSchemeCategories() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('scheme_categories')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data || [];
}

export async function fetchSchemeEligibility(schemeId: string) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('scheme_eligibility')
    .select('*')
    .eq('scheme_id', schemeId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching scheme eligibility:', error);
    return null;
  }

  return data;
}

export async function fetchSchemeBenefits(schemeId: string) {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('scheme_benefits')
    .select('*')
    .eq('scheme_id', schemeId);

  if (error) {
    console.error('Error fetching scheme benefits:', error);
    return [];
  }

  return data || [];
}

export async function fetchSchemeDocuments(schemeId: string) {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('scheme_documents')
    .select('*')
    .eq('scheme_id', schemeId)
    .order('is_mandatory', { ascending: false });

  if (error) {
    console.error('Error fetching scheme documents:', error);
    return [];
  }

  return data || [];
}

export async function fetchAcademicYears() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('schemes')
    .select('academic_year')
    .eq('status', 'published')
    .eq('verification_status', 'verified')
    .eq('is_active', true);

  if (error) {
    return [];
  }

  const years = Array.from(new Set<string>((data ?? []).map((row) => row.academic_year)));
  return years.sort((a, b) => b.localeCompare(a));
}

export { mapSchemeToFrontend } from '../lib/supabase';