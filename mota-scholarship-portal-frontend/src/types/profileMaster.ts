/**
 * Types for the `public` master-data tables that back the profile dropdowns.
 *
 * Every one of these tables is read-only for applicants (RLS: select where
 * is_active) and writable only by an admin, so the client only ever reads them.
 *
 * Several reference tables — castes, districts, talukas, boards, universities,
 * courses, branches, institutions — are intentionally EMPTY in the seed. That
 * is deliberate: their contents are administrative decisions, so the UI offers a
 * free-text fallback for every one of them rather than inventing entries.
 */

export interface MasterRow {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number | null;
}

export interface Religion extends MasterRow {
  code: string | null;
}

export interface CasteCategory extends MasterRow {
  code: string | null;
}

export interface State extends MasterRow {
  code: string | null;
  region: string | null;
}

export interface District extends MasterRow {
  state_id: string | null;
}

export interface Taluka extends MasterRow {
  district_id: string | null;
}

export interface CourseLevel extends MasterRow {
  code: string | null;
}

export interface Course extends MasterRow {
  course_level_id: string | null;
}

export interface Branch extends MasterRow {
  course_id: string | null;
}

export interface Board extends MasterRow {
  state_id: string | null;
}

export interface University extends MasterRow {
  state_id: string | null;
}

export interface Institution extends MasterRow {
  university_id: string | null;
  board_id: string | null;
  institution_type: string | null;
  address: string | null;
  pincode: string | null;
}

export interface Caste extends MasterRow {
  category_id: string | null;
}

export interface DisabilityType extends MasterRow {
  code: string | null;
}

export interface ApplicantDocumentType extends MasterRow {
  code: string;
  description: string | null;
  accepts_multiple: boolean;
  max_file_size_mb: number | null;
  allowed_mime_types: string[] | null;
  is_required: boolean;
}

export interface CompletenessRule {
  id: string;
  section: string;
  field_key: string;
  label: string;
  condition_key: string;
  weight: number;
  sort_order: number;
}
