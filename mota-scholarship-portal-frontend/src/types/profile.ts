/**
 * Applicant profile domain types.
 *
 * Two families of types live here on purpose:
 *
 *  1. Row types (`*Record`) mirror the PostgreSQL columns exactly, in snake_case,
 *     so a Supabase response can be assigned without a cast.
 *  2. Form types (`*FormValues`) mirror what the inputs hold: every value is a
 *     string or a boolean, dates are 'YYYY-MM-DD' strings, and nothing is null.
 *     The service layer is the only place the two representations meet, which
 *     keeps the null-handling and the sensitive-field handling in one place
 *     instead of scattered across six components.
 */

import type { ApplicantDocumentType, CourseLevel, Religion, State } from './profileMaster';

export type ProfileSectionId =
  | 'personal'
  | 'address'
  | 'other'
  | 'current_course'
  | 'past_qualification'
  | 'hostel';

/* -------------------------------------------------------------------------- */
/* Row types                                                                  */
/* -------------------------------------------------------------------------- */

export interface ApplicantProfileRecord {
  id: string;
  user_id: string;
  applicant_id: string | null;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
  date_of_birth: string | null;
  gender: string | null;
  religion: string | null;
  marital_status: string | null;
  applicant_full_name_as_per_marksheet: string | null;
  parent_guardian_mobile: string | null;
  aadhaar_masked: string | null;
  aadhaar_last4: string | null;
  aadhaar_verified_at: string | null;
  completeness_percent: number | null;
  profile_status: string | null;
  last_saved_at: string | null;
  updated_at: string | null;
}

export interface DomicileDetailsRecord {
  id: string;
  applicant_id: string;
  is_maharashtra_domicile: boolean | null;
  has_domicile_certificate: boolean | null;
  certificate_source: string | null;
  certificate_holder_name: string | null;
  certificate_number: string | null;
  issuing_authority: string | null;
  date_of_issue: string | null;
  document_id: string | null;
}

export interface IncomeDetailsRecord {
  id: string;
  applicant_id: string;
  annual_income: number | null;
  has_income_certificate: boolean | null;
  certificate_source: string | null;
  certificate_number: string | null;
  certificate_date: string | null;
  issuing_authority: string | null;
  barcode: string | null;
  document_id: string | null;
}

export interface PersonalEligibilityRecord {
  id: string;
  applicant_id: string;
  is_salaried: boolean | null;
  job_type: string | null;
  is_disabled: boolean | null;
  disability_type: string | null;
  has_disability_certificate: boolean | null;
  disability_certificate_number: string | null;
  disability_document_id: string | null;
  siblings_count: number | null;
}

export interface CasteDetailsRecord {
  id: string;
  applicant_id: string;
  category: string | null;
  caste: string | null;
  sub_caste: string | null;
  has_caste_certificate: boolean | null;
  certificate_source: string | null;
  certificate_number: string | null;
  certificate_holder_name: string | null;
  issuing_authority: string | null;
  date_of_issue: string | null;
  document_id: string | null;
}

export interface AddressDetailsRecord {
  id: string;
  applicant_id: string;
  permanent_address: string | null;
  permanent_village: string | null;
  permanent_state: string | null;
  permanent_district: string | null;
  permanent_taluka: string | null;
  permanent_pincode: string | null;
  same_as_permanent: boolean | null;
  correspondence_address: string | null;
  correspondence_village: string | null;
  correspondence_state: string | null;
  correspondence_district: string | null;
  correspondence_taluka: string | null;
  correspondence_pincode: string | null;
}

export interface ParentGuardianDetailsRecord {
  id: string;
  applicant_id: string;
  father_alive: boolean | null;
  father_name: string | null;
  father_occupation: string | null;
  father_salaried: boolean | null;
  mother_alive: boolean | null;
  mother_name: string | null;
  mother_occupation: string | null;
  mother_salaried: boolean | null;
  guardian_required: boolean | null;
  guardian_name: string | null;
  guardian_relationship: string | null;
  guardian_occupation: string | null;
  guardian_mobile: string | null;
}

export interface BankDetailsRecord {
  id: string;
  applicant_id: string;
  bank_name: string | null;
  account_holder_name: string | null;
  account_number_last4: string | null;
  ifsc_code: string | null;
  branch_name: string | null;
  account_type: string | null;
  aadhaar_linked: boolean | null;
}

export interface CurrentCoursesRecord {
  id: string;
  applicant_id: string;
  academic_year: string | null;
  course_level: string | null;
  course_name: string | null;
  degree: string | null;
  branch: string | null;
  year_of_study: number | null;
  semester: number | null;
  institution_name: string | null;
  board_university: string | null;
  university_name: string | null;
  admission_date: string | null;
  admission_type: string | null;
  mode_of_study: string | null;
  course_duration_months: number | null;
  is_professional: boolean | null;
  cap_admission: boolean | null;
  cap_application_number: string | null;
  seat_type: string | null;
  institute_state: string | null;
  institute_district: string | null;
  institute_taluka: string | null;
}

export interface ApplicantQualificationRecord {
  id: string;
  applicant_id: string;
  qualification_type: string | null;
  degree: string | null;
  board_university: string | null;
  passing_year: number | null;
  percentage: number | null;
  class_grade: string | null;
  status: string | null;
  marksheet_document_id: string | null;
}

export interface HostelDetailsRecord {
  id: string;
  applicant_id: string;
  beneficiary_category: string | null;
  state: string | null;
  district: string | null;
  taluka: string | null;
  hostel_type: string | null;
  hostel_name: string | null;
  is_aided: boolean | null;
  hostel_address: string | null;
  admission_date: string | null;
  mess_available: boolean | null;
  rent_per_month: number | null;
  certificate_document_id: string | null;
}

export interface ApplicantDocumentRecord {
  id: string;
  applicant_id: string;
  document_type: string | null;
  document_code: string | null;
  file_name: string | null;
  storage_path: string | null;
  mime_type: string | null;
  file_size: number | null;
  status: string | null;
  uploaded_at: string | null;
}

/* -------------------------------------------------------------------------- */
/* Form types                                                                 */
/* -------------------------------------------------------------------------- */

export interface ProfileFormValues {
  // Core identity
  full_name: string;
  email: string;
  mobile_number: string;
  date_of_birth: string;
  gender: string;
  religion: string;
  marital_status: string;
  applicant_full_name_as_per_marksheet: string;
  parent_guardian_mobile: string;
  /**
   * Write-only. Cleared as soon as the save resolves and never restored from the
   * database, because the server only ever returns a mask. See profileService.
   */
  aadhaar: string;
  /** Read-only masked Aadhaar (XXXX XXXX 1234) from the database. */
  aadhaar_last4: string;

  // Domicile
  is_maharashtra_domicile: boolean | null;
  has_domicile_certificate: boolean | null;
  domicile_certificate_source: string;
  domicile_certificate_holder_name: string;
  domicile_certificate_number: string;
  domicile_issuing_authority: string;
  domicile_date_of_issue: string;

  // Income
  annual_income: string;
  has_income_certificate: boolean | null;
  income_certificate_source: string;
  income_certificate_number: string;
  income_certificate_date: string;
  income_issuing_authority: string;
  income_barcode: string;

  // Employment
  is_salaried: boolean | null;
  job_type: string;

  // Disability
  is_disabled: boolean | null;
  disability_type: string;
  has_disability_certificate: boolean | null;
  disability_certificate_number: string;

  // Siblings
  siblings_count: string;

  // Caste
  category: string;
  caste: string;
  sub_caste: string;
  has_caste_certificate: boolean | null;
  caste_certificate_source: string;
  caste_certificate_number: string;
  caste_certificate_holder_name: string;
  caste_issuing_authority: string;
  caste_date_of_issue: string;

  // Bank
  bank_name: string;
  account_holder_name: string;
  /** Write-only, same lifecycle as `aadhaar`. */
  account_number: string;
  /** Read-only masked account number (•••• 1234) from the database. */
  account_number_last4: string;
  ifsc_code: string;
  branch_name: string;
  account_type: string;
  aadhaar_linked: boolean | null;
}

export interface AddressFormValues {
  permanent_address: string;
  permanent_village: string;
  permanent_state: string;
  permanent_district: string;
  permanent_taluka: string;
  permanent_pincode: string;
  same_as_permanent: boolean;
  correspondence_address: string;
  correspondence_village: string;
  correspondence_state: string;
  correspondence_district: string;
  correspondence_taluka: string;
  correspondence_pincode: string;
}

export interface OtherInfoFormValues {
  father_alive: boolean | null;
  father_name: string;
  father_occupation: string;
  father_salaried: boolean | null;
  mother_alive: boolean | null;
  mother_name: string;
  mother_occupation: string;
  mother_salaried: boolean | null;
  guardian_required: boolean | null;
  guardian_name: string;
  guardian_relationship: string;
  guardian_occupation: string;
  guardian_mobile: string;
}

export interface CurrentCourseFormValues {
  academic_year: string;
  course_level: string;
  course_name: string;
  degree: string;
  branch: string;
  year_of_study: string;
  semester: string;
  institution_name: string;
  board_university: string;
  admission_date: string;
  admission_type: string;
  mode_of_study: string;
  course_duration_months: string;
  is_professional: boolean | null;
  cap_admission: boolean | null;
  cap_application_number: string;
  seat_type: string;
  institute_state: string;
  institute_district: string;
  institute_taluka: string;
}

export interface QualificationFormValues {
  id: string | null;
  qualification_type: string;
  degree: string;
  board_university: string;
  passing_year: string;
  percentage: string;
  class_grade: string;
  status: string;
}

export interface HostelFormValues {
  beneficiary_category: string;
  state: string;
  district: string;
  taluka: string;
  hostel_type: string;
  hostel_name: string;
  is_aided: boolean | null;
  hostel_address: string;
  admission_date: string;
  mess_available: boolean | null;
  rent_per_month: string;
}

/* -------------------------------------------------------------------------- */
/* Master data + completeness                                                 */
/* -------------------------------------------------------------------------- */

export interface ProfileMasterData {
  religions: Religion[];
  states: State[];
  courseLevels: CourseLevel[];
  documentTypes: ApplicantDocumentType[];
  casteCategories: string[];
  disabilityTypes: string[];
}

export interface ProfileCompleteness {
  overall: number;
  status: 'complete' | 'incomplete';
  complete_sections: number;
  section_count: number;
  sections: Record<ProfileSectionId, number>;
  missing: string[];
}

export const EMPTY_PROFILE_COMPLETENESS: ProfileCompleteness = {
  overall: 0,
  status: 'incomplete',
  complete_sections: 0,
  section_count: 6,
  sections: {
    personal: 0,
    address: 0,
    other: 0,
    current_course: 0,
    past_qualification: 0,
    hostel: 0,
  },
  missing: [],
};

/** The whole profile as the client holds it, section by section. */
export interface ProfileData {
  profile: ApplicantProfileRecord | null;
  domicile: DomicileDetailsRecord | null;
  income: IncomeDetailsRecord | null;
  eligibility: PersonalEligibilityRecord | null;
  caste: CasteDetailsRecord | null;
  address: AddressDetailsRecord | null;
  parents: ParentGuardianDetailsRecord | null;
  bank: BankDetailsRecord | null;
  course: CurrentCoursesRecord | null;
  qualifications: ApplicantQualificationRecord[];
  hostel: HostelDetailsRecord | null;
  documents: ApplicantDocumentRecord[];
}