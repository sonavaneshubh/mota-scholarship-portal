/**
 * Record <-> form value mapping.
 *
 * Kept out of the page component so the null-handling for eleven tables lives in
 * one readable place. The direction that matters for correctness is
 * records -> form: every column that can be NULL has to become a definite
 * string, because a controlled input cannot hold null.
 */

import type {
  AddressFormValues,
  ApplicantDocumentRecord,
  ApplicantProfileRecord,
  BankDetailsRecord,
  CasteDetailsRecord,
  CurrentCourseFormValues,
  CurrentCoursesRecord,
  DomicileDetailsRecord,
  HostelDetailsRecord,
  HostelFormValues,
  IncomeDetailsRecord,
  OtherInfoFormValues,
  ParentGuardianDetailsRecord,
  PersonalEligibilityRecord,
  ProfileData,
  ProfileFormValues,
  QualificationFormValues,
} from '../types/profile';

export function emptyProfileForm(): ProfileFormValues {
  return {
    // Core identity
    full_name: '',
    email: '',
    mobile_number: '',
    date_of_birth: '',
    gender: '',
    religion: '',
    marital_status: '',
    applicant_full_name_as_per_marksheet: '',
    parent_guardian_mobile: '',
    aadhaar: '',
    aadhaar_last4: '',
    // Domicile
    is_maharashtra_domicile: null,
    has_domicile_certificate: null,
    domicile_certificate_source: '',
    domicile_certificate_holder_name: '',
    domicile_certificate_number: '',
    domicile_issuing_authority: '',
    domicile_date_of_issue: '',
    // Income
    annual_income: '',
    has_income_certificate: null,
    income_certificate_source: '',
    income_certificate_number: '',
    income_certificate_date: '',
    income_issuing_authority: '',
    income_barcode: '',
    // Employment
    is_salaried: null,
    job_type: '',
    // Disability
    is_disabled: null,
    disability_type: '',
    has_disability_certificate: null,
    disability_certificate_number: '',
    // Siblings
    siblings_count: '',
    // Caste
    category: '',
    caste: '',
    sub_caste: '',
    has_caste_certificate: null,
    caste_certificate_source: '',
    caste_certificate_number: '',
    caste_certificate_holder_name: '',
    caste_issuing_authority: '',
    caste_date_of_issue: '',
    // Bank
    bank_name: '',
    account_holder_name: '',
    account_number: '',
    account_number_last4: '',
    ifsc_code: '',
    branch_name: '',
    account_type: '',
    aadhaar_linked: null,
  };
}

export function emptyAddressForm(): AddressFormValues {
  return {
    permanent_address: '',
    permanent_village: '',
    permanent_state: '',
    permanent_district: '',
    permanent_taluka: '',
    permanent_pincode: '',
    same_as_permanent: true,
    correspondence_address: '',
    correspondence_village: '',
    correspondence_state: '',
    correspondence_district: '',
    correspondence_taluka: '',
    correspondence_pincode: '',
  };
}

export function emptyOtherInfoForm(): OtherInfoFormValues {
  return {
    father_alive: null,
    father_name: '',
    father_occupation: '',
    father_salaried: null,
    mother_alive: null,
    mother_name: '',
    mother_occupation: '',
    mother_salaried: null,
    guardian_required: null,
    guardian_name: '',
    guardian_relationship: '',
    guardian_occupation: '',
    guardian_mobile: '',
  };
}

export function emptyCourseForm(): CurrentCourseFormValues {
  return {
    academic_year: '',
    course_level: '',
    course_name: '',
    degree: '',
    branch: '',
    year_of_study: '',
    semester: '',
    institution_name: '',
    board_university: '',
    admission_date: '',
    admission_type: '',
    mode_of_study: '',
    course_duration_months: '',
    is_professional: null,
    cap_admission: null,
    cap_application_number: '',
    seat_type: '',
    institute_state: '',
    institute_district: '',
    institute_taluka: '',
  };
}

export function emptyHostelForm(): HostelFormValues {
  return {
    beneficiary_category: '',
    state: '',
    district: '',
    taluka: '',
    hostel_type: '',
    hostel_name: '',
    is_aided: null,
    hostel_address: '',
    admission_date: '',
    mess_available: null,
    rent_per_month: '',
  };
}

/* -------------------------------------------------------------------------- */

const s = (value: string | null | undefined) => value ?? '';
const n = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));
const b = (value: boolean | null | undefined) => value ?? null;

export function profileToForm(
  data: ProfileData,
  authEmail: string,
  authName: string,
): ProfileFormValues {
  const base = emptyProfileForm();
  const profile: ApplicantProfileRecord | null = data.profile;
  const domicile: DomicileDetailsRecord | null = data.domicile;
  const income: IncomeDetailsRecord | null = data.income;
  const eligibility: PersonalEligibilityRecord | null = data.eligibility;
  const caste: CasteDetailsRecord | null = data.caste;
  const bank: BankDetailsRecord | null = data.bank;

  return {
    ...base,
    // The Supabase account is the fallback so an applicant who has just signed up
    // is not asked to retype what the portal already knows.
    full_name: s(profile?.full_name) || authName,
    email: s(profile?.email) || authEmail,
    mobile_number: s(profile?.mobile_number),
    date_of_birth: s(profile?.date_of_birth),
    gender: s(profile?.gender),
    religion: s(profile?.religion),
    marital_status: s(profile?.marital_status),
    applicant_full_name_as_per_marksheet: s(profile?.applicant_full_name_as_per_marksheet),
    parent_guardian_mobile: s(profile?.parent_guardian_mobile),
    aadhaar_last4: s(profile?.aadhaar_last4),
    is_maharashtra_domicile: b(domicile?.is_maharashtra_domicile),
    has_domicile_certificate: b(domicile?.has_domicile_certificate),
    domicile_certificate_source: s(domicile?.certificate_source),
    domicile_certificate_holder_name: s(domicile?.certificate_holder_name),
    domicile_certificate_number: s(domicile?.certificate_number),
    domicile_issuing_authority: s(domicile?.issuing_authority),
    domicile_date_of_issue: s(domicile?.date_of_issue),
    annual_income: n(income?.annual_income),
    has_income_certificate: b(income?.has_income_certificate),
    income_certificate_source: s(income?.certificate_source),
    income_certificate_number: s(income?.certificate_number),
    income_certificate_date: s(income?.certificate_date),
    income_issuing_authority: s(income?.issuing_authority),
    income_barcode: s(income?.barcode),
    is_salaried: b(eligibility?.is_salaried),
    job_type: s(eligibility?.job_type),
    is_disabled: b(eligibility?.is_disabled),
    disability_type: s(eligibility?.disability_type),
    has_disability_certificate: b(eligibility?.has_disability_certificate),
    disability_certificate_number: s(eligibility?.disability_certificate_number),
    siblings_count: n(eligibility?.siblings_count),
    category: s(caste?.category),
    caste: s(caste?.caste),
    sub_caste: s(caste?.sub_caste),
    has_caste_certificate: b(caste?.has_caste_certificate),
    caste_certificate_source: s(caste?.certificate_source),
    caste_certificate_number: s(caste?.certificate_number),
    caste_certificate_holder_name: s(caste?.certificate_holder_name),
    caste_issuing_authority: s(caste?.issuing_authority),
    caste_date_of_issue: s(caste?.date_of_issue),
    bank_name: s(bank?.bank_name),
    account_holder_name: s(bank?.account_holder_name),
    account_number_last4: s(bank?.account_number_last4),
    ifsc_code: s(bank?.ifsc_code),
    branch_name: s(bank?.branch_name),
    account_type: s(bank?.account_type),
    aadhaar_linked: b(bank?.aadhaar_linked),
  };
}

export function addressToForm(data: ProfileData): AddressFormValues {
  const row = data.address;
  if (!row) {
    return emptyAddressForm();
  }

  return {
    permanent_address: s(row.permanent_address),
    permanent_village: s(row.permanent_village),
    permanent_state: s(row.permanent_state),
    permanent_district: s(row.permanent_district),
    permanent_taluka: s(row.permanent_taluka),
    permanent_pincode: s(row.permanent_pincode),
    same_as_permanent: row.same_as_permanent ?? true,
    correspondence_address: s(row.correspondence_address),
    correspondence_village: s(row.correspondence_village),
    correspondence_state: s(row.correspondence_state),
    correspondence_district: s(row.correspondence_district),
    correspondence_taluka: s(row.correspondence_taluka),
    correspondence_pincode: s(row.correspondence_pincode),
  };
}

export function otherInfoToForm(data: ProfileData): OtherInfoFormValues {
  const row: ParentGuardianDetailsRecord | null = data.parents;
  if (!row) {
    return emptyOtherInfoForm();
  }

  return {
    father_alive: b(row.father_alive),
    father_name: s(row.father_name),
    father_occupation: s(row.father_occupation),
    father_salaried: b(row.father_salaried),
    mother_alive: b(row.mother_alive),
    mother_name: s(row.mother_name),
    mother_occupation: s(row.mother_occupation),
    mother_salaried: b(row.mother_salaried),
    guardian_required: b(row.guardian_required),
    guardian_name: s(row.guardian_name),
    guardian_relationship: s(row.guardian_relationship),
    guardian_occupation: s(row.guardian_occupation),
    guardian_mobile: s(row.guardian_mobile),
  };
}

export function courseToForm(data: ProfileData): CurrentCourseFormValues {
  const row: CurrentCoursesRecord | null = data.course;
  if (!row) {
    return emptyCourseForm();
  }

  return {
    academic_year: s(row.academic_year),
    course_level: s(row.course_level),
    course_name: s(row.course_name),
    degree: s(row.degree),
    branch: s(row.branch),
    year_of_study: n(row.year_of_study),
    semester: n(row.semester),
    institution_name: s(row.institution_name),
    board_university: s(row.board_university) || s(row.university_name),
    admission_date: s(row.admission_date),
    admission_type: s(row.admission_type),
    mode_of_study: s(row.mode_of_study),
    course_duration_months: n(row.course_duration_months),
    is_professional: b(row.is_professional),
    cap_admission: b(row.cap_admission),
    cap_application_number: s(row.cap_application_number),
    seat_type: s(row.seat_type),
    institute_state: s(row.institute_state),
    institute_district: s(row.institute_district),
    institute_taluka: s(row.institute_taluka),
  };
}

export function qualificationsToForm(data: ProfileData): QualificationFormValues[] {
  return data.qualifications.map((row) => ({
    id: row.id,
    qualification_type: s(row.qualification_type),
    degree: s(row.degree),
    board_university: s(row.board_university),
    passing_year: n(row.passing_year),
    percentage: n(row.percentage),
    class_grade: s(row.class_grade),
    status: s(row.status),
  }));
}

export function emptyQualification(): QualificationFormValues {
  return {
    id: null,
    qualification_type: '',
    degree: '',
    board_university: '',
    passing_year: '',
    percentage: '',
    class_grade: '',
    status: '',
  };
}

export function hostelToForm(data: ProfileData): HostelFormValues {
  const row: HostelDetailsRecord | null = data.hostel;
  if (!row) {
    return emptyHostelForm();
  }

  return {
    beneficiary_category: s(row.beneficiary_category),
    state: s(row.state),
    district: s(row.district),
    taluka: s(row.taluka),
    hostel_type: s(row.hostel_type),
    hostel_name: s(row.hostel_name),
    is_aided: b(row.is_aided),
    hostel_address: s(row.hostel_address),
    admission_date: s(row.admission_date),
    mess_available: b(row.mess_available),
    rent_per_month: n(row.rent_per_month),
  };
}

/* -------------------------------------------------------------------------- */
/* Certificate slots                                                          */
/* -------------------------------------------------------------------------- */

export const CERTIFICATE_CODES = {
  domicile: 'domicile_certificate',
  income: 'income_certificate',
  caste: 'caste_certificate',
  disability: 'disability_certificate',
  hostel: 'hostel_certificate',
} as const;

export type CertificateSlot = 'domicile' | 'income' | 'caste' | 'disability';

/**
 * Attach an already-uploaded certificate to the slot it belongs to.
 *
 * A certificate qualifies for a slot by its document_code. Uploading a second
 * file for the same code replaces the row for that slot, which is what the
 * applicant means by "this is my current certificate".
 */
export function documentsToCertificates(documents: ApplicantDocumentRecord[]): {
  certificates: Record<CertificateSlot, ApplicantDocumentRecord | null>;
  hostel: ApplicantDocumentRecord | null;
} {
  // `document_type` is the only code column on `applicant_documents`.
  const find = (code: string): ApplicantDocumentRecord | null =>
    documents.find((document) => document.document_type === code) ?? null;

  return {
    certificates: {
      domicile: find(CERTIFICATE_CODES.domicile),
      income: find(CERTIFICATE_CODES.income),
      caste: find(CERTIFICATE_CODES.caste),
      disability: find(CERTIFICATE_CODES.disability),
    },
    hostel: find(CERTIFICATE_CODES.hostel),
  };
}

export function emptyProfileData(): ProfileData {
  return {
    profile: null,
    domicile: null,
    income: null,
    eligibility: null,
    caste: null,
    address: null,
    parents: null,
    bank: null,
    course: null,
    hostel: null,
    qualifications: [],
    documents: [],
  };
}