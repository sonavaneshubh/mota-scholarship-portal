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
 * The label is aliased to `name` on the `label` tables so that `MasterRow` stays a
 * single app-wide contract (`name:label` is PostgREST's alias syntax; the older
 * `label as name` form is parsed as one literal identifier and is rejected). Only
 * a verified column list appears below -- `region` and `sort_order` are not
 * selected for states, and `sort_order` is not selected for disability_types,
 * because selecting them returns 42703.
 */

import { supabase } from '../lib/supabase';
import type { ProfileMasterData } from '../types/profile';

const EMPTY: ProfileMasterData = {
  religions: [],
  states: [],
  courseLevels: [],
  documentTypes: [],
  casteCategories: [],
  disabilityTypes: [],
};

export async function loadProfileMasterData(): Promise<ProfileMasterData> {
  if (!supabase) {
    return EMPTY;
  }

  const [religions, states, courseLevels, casteCategories, disabilityTypes] = await Promise.all([
    supabase.from('religions').select('id, name:label, code, is_active, sort_order').order('sort_order'),
    // states has `name`, but no `region` and no `sort_order`. Ordered by name so
    // the list is still in a stable, meaningful order.
    supabase.from('states').select('id, name, code, is_active').order('name'),
    supabase.from('course_levels').select('id, name:label, code, is_active, sort_order').order('sort_order'),
    supabase.from('caste_categories').select('id, name:label, code, is_active, sort_order').order('sort_order'),
    // disability_types has `label` but no `sort_order`, so it is ordered by the
    // underlying `label` column. The order clause takes the real column name, not
    // the `name:label` alias -- PostgREST rejects a colon there with PGRST100.
    supabase.from('disability_types').select('id, name:label, code, is_active').order('label'),
  ]);

  // A failed master-data read must not take the whole form down: the seeded
  // lists are a convenience, and every control that uses one has a free-text
  // alternative.
  return {
    religions: (religions.data as ProfileMasterData['religions'] | null) ?? [],
    states: (states.data as ProfileMasterData['states'] | null) ?? [],
    courseLevels: (courseLevels.data as ProfileMasterData['courseLevels'] | null) ?? [],
    casteCategories: ((casteCategories.data as { name: string }[] | null) ?? []).map((row) => row.name),
    disabilityTypes: ((disabilityTypes.data as { name: string }[] | null) ?? []).map((row) => row.name),
    documentTypes: [],
  };
}
