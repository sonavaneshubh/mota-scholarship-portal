/**
 * Read-only master data for the profile dropdowns.
 *
 * All of these tables are RLS-protected read-only for applicants, and the
 * reference tables (castes, districts, talukas, boards, universities, courses,
 * branches, institutions) are seeded empty by design, so a load failure degrades
 * to the free-text fallbacks rather than blocking the form.
 *
 * The column names below are not uniform, and that is a property of the schema
 * rather than an oversight here. The label column is `label` on religions,
 * caste_categories, course_levels, disability_types and applicant_document_types,
 * but plain `name` on states, districts, talukas, courses, branches, boards,
 * universities and institutions. `sort_order` is also not universal: states and
 * disability_types have none.
 *
 * These projections were previously written against `name` for every table, which
 * made all five reads fail with Postgres 42703 "column does not exist" and left
 * every dropdown empty. Because the master-data tables are created with
 * `create table if not exists` and the migration contains no `alter table`, that
 * mismatch could never be repaired by re-running the migration -- `if not exists`
 * skips the whole definition when the table is already there. So the queries were
 * corrected to read the columns that actually exist.
 *
 * The label is mapped to `name` in JavaScript after the query to avoid relying on
 * PostgREST column alias syntax (`name:label`) which can be unreliable across
 * PostgREST versions.
 */

import { supabase, DEMO_MODE } from '../lib/supabase';
import type { ProfileMasterData } from '../types/profile';

const DEMO_MASTER_DATA: ProfileMasterData = {
  religions: [
    { id: 'demo-1', name: 'Hindu', code: 'hindu', is_active: true, sort_order: 10 },
    { id: 'demo-2', name: 'Muslim', code: 'muslim', is_active: true, sort_order: 20 },
    { id: 'demo-3', name: 'Christian', code: 'christian', is_active: true, sort_order: 30 },
    { id: 'demo-4', name: 'Sikh', code: 'sikh', is_active: true, sort_order: 40 },
    { id: 'demo-5', name: 'Buddhist', code: 'buddhist', is_active: true, sort_order: 50 },
    { id: 'demo-6', name: 'Jain', code: 'jain', is_active: true, sort_order: 60 },
    { id: 'demo-7', name: 'Parsi', code: 'parsi', is_active: true, sort_order: 70 },
    { id: 'demo-8', name: 'Other', code: 'other', is_active: true, sort_order: 80 },
  ],
  states: [
    { id: 'demo-mh', name: 'Maharashtra', code: 'MH', is_active: true, region: 'West', sort_order: 10 },
    { id: 'demo-dl', name: 'Delhi', code: 'DL', is_active: true, region: 'North', sort_order: 20 },
    { id: 'demo-ka', name: 'Karnataka', code: 'KA', is_active: true, region: 'South', sort_order: 30 },
    { id: 'demo-tn', name: 'Tamil Nadu', code: 'TN', is_active: true, region: 'South', sort_order: 40 },
    { id: 'demo-up', name: 'Uttar Pradesh', code: 'UP', is_active: true, region: 'North', sort_order: 50 },
  ],
  courseLevels: [
    { id: 'demo-1', name: 'Secondary (Class 10)', code: 'secondary', is_active: true, sort_order: 10 },
    { id: 'demo-2', name: 'Higher Secondary (Class 12)', code: 'higher_secondary', is_active: true, sort_order: 20 },
    { id: 'demo-3', name: 'Bachelor\'s Degree', code: 'bachelors', is_active: true, sort_order: 60 },
    { id: 'demo-4', name: 'Master\'s Degree', code: 'masters', is_active: true, sort_order: 70 },
  ],
  documentTypes: [],
  casteCategories: [
    'Open (General)',
    'Scheduled Caste (SC)',
    'Scheduled Tribe (ST)',
    'Other Backward Class (OBC)',
    'VJNT',
    'SBC',
    'Economically Backward Class (EBC)',
    'EWS',
    'Minority',
  ],
  disabilityTypes: [
    'Locomotor Disability',
    'Visual Impairment',
    'Hearing Impairment',
    'Speech & Language Disability',
    'Intellectual Disability',
    'Mental Illness',
    'Chronic Neurological Condition',
    'Blood Disorder',
  ],
};

function mapLabelToName<T extends { label: string }>(rows: T[] | null): Array<T & { name: string }> {
  return (rows ?? []).map((row) => ({ ...row, name: row.label }));
}

async function ensureSession(): Promise<boolean> {
  if (!supabase) return false;
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

export async function loadProfileMasterData(): Promise<ProfileMasterData> {
  console.log('[MasterData] DEMO_MODE:', DEMO_MODE);
  console.log('[MasterData] supabase client exists:', !!supabase);

  if (DEMO_MODE || !supabase) {
    console.log('[MasterData] Returning DEMO_MASTER_DATA');
    return DEMO_MASTER_DATA;
  }

  // Ensure we have a valid session before querying master data
  const hasSession = await ensureSession();
  console.log('[MasterData] Has valid session:', hasSession);
  if (!hasSession) {
    console.warn('[MasterData] No active session, returning demo data as fallback');
    return DEMO_MASTER_DATA;
  }

  console.log('[MasterData] Querying Supabase for religions, states, courseLevels, casteCategories, disabilityTypes');

  // Use correct column names from the actual database schema
  const religionsResult = await supabase
    .from('religions')
    .select('id, code, label, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order');

  const statesResult = await supabase
    .from('states')
    .select('id, name, code, is_active')
    .eq('is_active', true)
    .order('name');

  const courseLevelsResult = await supabase
    .from('course_levels')
    .select('id, label, code, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order');

  const casteCategoriesResult = await supabase
    .from('caste_categories')
    .select('id, code, label, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order');

  const disabilityTypesResult = await supabase
    .from('disability_types')
    .select('id, label, code, is_active, description')
    .eq('is_active', true)
    .order('label');

  // Detailed logging for each query
  console.log('[MasterData] religions data:', religionsResult.data);
  console.log('[MasterData] religions error:', religionsResult.error);
  console.log('[MasterData] religions status:', religionsResult.status);
  console.log('[MasterData] religions statusText:', religionsResult.statusText);
  console.log('[MasterData] religion count:', religionsResult.data?.length ?? 0);

  console.log('[MasterData] caste_categories data:', casteCategoriesResult.data);
  console.log('[MasterData] caste_categories error:', casteCategoriesResult.error);
  console.log('[MasterData] caste_categories status:', casteCategoriesResult.status);
  console.log('[MasterData] caste_categories statusText:', casteCategoriesResult.statusText);
  console.log('[MasterData] category count:', casteCategoriesResult.data?.length ?? 0);

  console.log('[MasterData] states data:', statesResult.data);
  console.log('[MasterData] states error:', statesResult.error);
  console.log('[MasterData] states status:', statesResult.status);
  console.log('[MasterData] states statusText:', statesResult.statusText);
  console.log('[MasterData] states count:', statesResult.data?.length ?? 0);

  console.log('[MasterData] courseLevels data:', courseLevelsResult.data);
  console.log('[MasterData] courseLevels error:', courseLevelsResult.error);
  console.log('[MasterData] courseLevels status:', courseLevelsResult.status);
  console.log('[MasterData] courseLevels count:', courseLevelsResult.data?.length ?? 0);

  console.log('[MasterData] disabilityTypes data:', disabilityTypesResult.data);
  console.log('[MasterData] disabilityTypes error:', disabilityTypesResult.error);
  console.log('[MasterData] disabilityTypes status:', disabilityTypesResult.status);
  console.log('[MasterData] disabilityTypes count:', disabilityTypesResult.data?.length ?? 0);

  // Handle errors explicitly
  if (religionsResult.error) {
    console.error('[MasterData] Religions query error:', religionsResult.error);
  }
  if (casteCategoriesResult.error) {
    console.error('[MasterData] Caste categories query error:', casteCategoriesResult.error);
  }
  if (statesResult.error) {
    console.error('[MasterData] States query error:', statesResult.error);
  }
  if (courseLevelsResult.error) {
    console.error('[MasterData] Course levels query error:', courseLevelsResult.error);
  }
  if (disabilityTypesResult.error) {
    console.error('[MasterData] Disability types query error:', disabilityTypesResult.error);
  }

  // Map data
  const mappedReligions = mapLabelToName(
    (religionsResult.data as { id: string; label: string; code: string | null; is_active: boolean; sort_order: number | null }[] | null) ?? [],
  );
  const mappedCasteCategories = mapLabelToName(
    (casteCategoriesResult.data as { id: string; label: string; code: string | null; is_active: boolean; sort_order: number | null }[] | null) ?? [],
  ).map((row) => row.name);

  console.log('[MasterData] religions mapped:', mappedReligions);
  console.log('[MasterData] casteCategories mapped:', mappedCasteCategories);

  // A failed master-data read must not take the whole form down: the seeded
  // lists are a convenience, and every control that uses one has a free-text
  // alternative.
  return {
    religions: mappedReligions,
    states: (statesResult.data as ProfileMasterData['states'] | null) ?? [],
    courseLevels: mapLabelToName(
      (courseLevelsResult.data as { id: string; label: string; code: string | null; is_active: boolean; sort_order: number | null }[] | null) ?? [],
    ),
    casteCategories: mappedCasteCategories,
    disabilityTypes: mapLabelToName(
      (disabilityTypesResult.data as { id: string; label: string; code: string | null; is_active: boolean; description: string | null }[] | null) ?? [],
    ).map((row) => row.name),
    documentTypes: [],
  };
}