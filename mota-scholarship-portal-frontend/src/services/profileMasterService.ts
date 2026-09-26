/**
 * Read-only master data for the profile dropdowns.
 *
 * All of these tables are RLS-protected read-only for applicants, and the
 * reference tables (castes, districts, talukas, boards, universities, courses,
 * branches, institutions) are seeded empty by design, so a load failure degrades
 * to the free-text fallbacks rather than blocking the form.
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
    supabase.from('religions').select('id, name, code, is_active, sort_order').order('sort_order'),
    supabase.from('states').select('id, name, code, region, is_active, sort_order').order('sort_order'),
    supabase.from('course_levels').select('id, name, code, is_active, sort_order').order('sort_order'),
    supabase.from('caste_categories').select('id, name, code, is_active, sort_order').order('sort_order'),
    supabase.from('disability_types').select('id, name, code, is_active, sort_order').order('sort_order'),
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
