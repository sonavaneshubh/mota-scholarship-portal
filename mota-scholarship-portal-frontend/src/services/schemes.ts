import { supabase, isSupabaseConfigured } from '../lib/supabase';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function fetchSchemes(filters: any = {}): Promise<any> {
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

export async function fetchSchemeDetail(schemeId: string): Promise<any | null> {
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

  const [eligibility, benefits, documents, sources, versions] = await Promise.all([
    supabase
      .from('scheme_eligibility')
      .select('*')
      .eq('scheme_id', schemeId)
      .eq('academic_year', scheme.academic_year)
      .single(),
    supabase
      .from('scheme_benefits')
      .select('*')
      .eq('scheme_id', schemeId)
      .eq('academic_year', scheme.academic_year),
    supabase
      .from('scheme_documents')
      .select('*')
      .eq('scheme_id', schemeId)
      .eq('academic_year', scheme.academic_year),
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
  ]);

  return {
    scheme,
    eligibility: eligibility.data,
    benefits: benefits.data || [],
    documents: documents.data || [],
    sources: sources.data || [],
    versions: versions.data || [],
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

export async function fetchSchemeEligibility(schemeId: string, academicYear: string) {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('scheme_eligibility')
    .select('*')
    .eq('scheme_id', schemeId)
    .eq('academic_year', academicYear)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function fetchSchemeBenefits(schemeId: string, academicYear: string) {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('scheme_benefits')
    .select('*')
    .eq('scheme_id', schemeId)
    .eq('academic_year', academicYear);

  if (error) {
    return [];
  }

  return data || [];
}

export async function fetchSchemeDocuments(schemeId: string, academicYear: string) {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('scheme_documents')
    .select('*')
    .eq('scheme_id', schemeId)
    .eq('academic_year', academicYear)
    .order('is_mandatory', { ascending: false });

  if (error) {
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

  const years = [...new Set(data?.map(s => s.academic_year) || [])];
  return years.sort((a, b) => b.localeCompare(a));
}

export { mapSchemeToFrontend } from '../lib/supabase';