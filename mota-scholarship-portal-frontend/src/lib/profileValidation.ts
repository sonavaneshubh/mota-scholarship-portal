/**
 * Per-section client validation.
 *
 * This is a *mirror* of `public.profile_completeness_rules`, not a replacement
 * for it. Every field key and every applicability gate below matches the seeded
 * rule for that key, so the two implementations agree about what "complete"
 * means. The server remains the authority: this layer exists so an applicant is
 * told what is missing at the moment they press Save, instead of after a
 * round-trip.
 *
 * If a rule is changed in the database, change it here too.
 */

import type {
  AddressFormValues,
  CurrentCourseFormValues,
  HostelFormValues,
  OtherInfoFormValues,
  ProfileFormValues,
  QualificationFormValues,
} from '../types/profile';

export interface SectionValidation {
  valid: boolean;
  /** Keyed by rule field_key, matching profile_completeness_rules.field_key. */
  errors: Record<string, string>;
  /** Field keys that are required *and* currently missing, in rule order. */
  missingRequired: string[];
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE_PATTERN = /^[6-9]\d{9}$/;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PINCODE_PATTERN = /^\d{6}$/;
const CURRENT_YEAR = new Date().getFullYear();

export const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Transgender'] as const;
export const MARITAL_STATUS_OPTIONS = ['Unmarried', 'Married', 'Divorced', 'Widowed'] as const;
export const CERTIFICATE_SOURCE_OPTIONS = ['Aaple Sarkar', 'Talathi', 'Municipal Corporation', 'Other'] as const;
export const ADMISSION_TYPE_OPTIONS = [
  'CAP',
  'Institute quota',
  'Management quota',
  'Government quota',
  'Other',
] as const;
export const MODE_OF_STUDY_OPTIONS = ['Full time', 'Part time', 'Distance', 'Online'] as const;
export const QUALIFICATION_TYPE_OPTIONS = ['10th Standard', '12th Standard', 'Diploma', 'Other'] as const;
export const QUALIFICATION_STATUS_OPTIONS = ['Passed', 'Appearing', 'Completed'] as const;
export const ACCOUNT_TYPE_OPTIONS = ['Savings', 'Current', 'Salary', 'NRE', 'Other'] as const;
export const HOSTEL_TYPE_OPTIONS = [
  'Government hostel',
  'Aided hostel',
  'Unaided hostel',
  'Private hostel',
  'Hostel at own institution',
] as const;
export const BENEFICIARY_CATEGORY_OPTIONS = ['Hosteller', 'Day Scholar', 'Not Applicable'] as const;
export const INSTITUTE_CATEGORY_OPTIONS = ['Government', 'Aided', 'Unaided', 'Private'] as const;

function isBlank(value: string | boolean | null | undefined): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'boolean') return false;
  return value.trim().length === 0;
}

/** A required select that has not been answered yet is `null`, not ''. */
function isUnanswered(value: boolean | null | undefined): boolean {
  return value === null || value === undefined;
}

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function present(value: string | boolean | null | undefined): boolean {
  return !isBlank(value);
}

class FieldCollector {
  readonly errors: Record<string, string> = {};

  readonly missingRequired: string[] = [];

  private noteMissing(key: string) {
    if (!this.missingRequired.includes(key)) {
      this.missingRequired.push(key);
    }
  }

  /** Required and blank. */
  required(key: string, label: string, value: string | boolean | null | undefined) {
    if (isBlank(value)) {
      this.errors[key] = `${label} is required.`;
      this.noteMissing(key);
      return false;
    }
    return true;
  }

  /** Required tri-state (Yes / No) that must be answered. */
  requiredChoice(key: string, label: string, value: boolean | null | undefined) {
    if (isUnanswered(value)) {
      this.errors[key] = `Select ${label.toLowerCase()}.`;
      this.noteMissing(key);
      return false;
    }
    return true;
  }

  pattern(key: string, label: string, value: string, regex: RegExp, message?: string) {
    if (isBlank(value)) return true;
    if (!regex.test(value.trim())) {
      this.errors[key] = message ?? `${label} is not in the expected format.`;
      return false;
    }
    return true;
  }

  numberRange(key: string, label: string, value: string, min: number, max: number) {
    if (isBlank(value)) return true;
    const parsed = toNumber(value);
    if (parsed === null || parsed < min || parsed > max) {
      this.errors[key] = `${label} must be a number between ${min} and ${max}.`;
      return false;
    }
    return true;
  }

  notFutureDate(key: string, label: string, value: string) {
    if (isBlank(value)) return true;
    if (value > new Date().toISOString().slice(0, 10)) {
      this.errors[key] = `${label} cannot be a future date.`;
      return false;
    }
    return true;
  }
}

/* -------------------------------------------------------------------------- */
/* 1. Personal Information                                                    */
/* -------------------------------------------------------------------------- */

export interface PersonalValidationContext {
  /** True when the server already holds a masked Aadhaar for this applicant. */
  hasSavedAadhaar: boolean;
  /** True when the server already holds a masked account number. */
  hasSavedAccount: boolean;
  /** Document ids attached to each conditional certificate field. */
  hasDomicileDocument: boolean;
  hasIncomeDocument: boolean;
  hasCasteDocument: boolean;
  hasDisabilityDocument: boolean;
}

export function validatePersonal(
  values: ProfileFormValues,
  context: PersonalValidationContext,
): SectionValidation {
  const f = new FieldCollector();

  // Core identity - always required
  f.required('full_name', 'Full name', values.full_name);
  f.required('mobile_number', 'Mobile number', values.mobile_number);
  f.pattern('mobile_number', 'Mobile number', values.mobile_number, MOBILE_PATTERN, 'Enter a 10-digit mobile number.');
  f.required('email', 'Email ID', values.email);
  f.pattern('email', 'Email ID', values.email, EMAIL_PATTERN, 'Enter a valid email address.');
  f.required('date_of_birth', 'Date of birth', values.date_of_birth);
  f.notFutureDate('date_of_birth', 'Date of birth', values.date_of_birth);
  f.required('gender', 'Gender', values.gender);
  f.required('religion', 'Religion', values.religion);
  f.required('marital_status', 'Marital status', values.marital_status);
  f.required('applicant_full_name_as_per_marksheet', 'Name as per marksheet', values.applicant_full_name_as_per_marksheet);
  f.required('parent_guardian_mobile', 'Parent/guardian mobile', values.parent_guardian_mobile);
  f.pattern('parent_guardian_mobile', 'Parent/guardian mobile', values.parent_guardian_mobile, MOBILE_PATTERN, 'Enter a 10-digit mobile number.');

  // Aadhaar
  if (!context.hasSavedAadhaar) {
    f.required('aadhaar', 'Aadhaar number', values.aadhaar);
  }
  if (present(values.aadhaar) && !/\d/.test(values.aadhaar)) {
    f.errors.aadhaar = 'Aadhaar number must contain digits.';
  }

  // Domicile - conditional on is_maharashtra_domicile
  f.requiredChoice('is_maharashtra_domicile', 'Maharashtra domicile status', values.is_maharashtra_domicile);
  if (values.is_maharashtra_domicile) {
    f.requiredChoice('has_domicile_certificate', 'Domicile certificate status', values.has_domicile_certificate);
    if (values.has_domicile_certificate) {
      f.required('domicile_certificate_number', 'Domicile certificate number', values.domicile_certificate_number);
      f.required('domicile_certificate_holder_name', 'Domicile certificate holder name', values.domicile_certificate_holder_name);
      f.required('domicile_issuing_authority', 'Domicile issuing authority', values.domicile_issuing_authority);
      f.required('domicile_date_of_issue', 'Domicile certificate date', values.domicile_date_of_issue);
      f.notFutureDate('domicile_date_of_issue', 'Domicile certificate date', values.domicile_date_of_issue);
      if (!context.hasDomicileDocument) {
        f.required('domicile_document', 'Domicile certificate upload', '');
      }
    }
  }

  // Income
  if (f.required('annual_income', 'Family annual income', values.annual_income)) {
    f.numberRange('annual_income', 'Family annual income', values.annual_income, 0, 100_000_000);
  }
  f.requiredChoice('has_income_certificate', 'Income certificate status', values.has_income_certificate);
  if (values.has_income_certificate) {
    f.required('income_certificate_number', 'Income certificate number', values.income_certificate_number);
    f.required('income_certificate_date', 'Income certificate date', values.income_certificate_date);
    f.notFutureDate('income_certificate_date', 'Income certificate date', values.income_certificate_date);
    f.required('income_issuing_authority', 'Income certificate issuing authority', values.income_issuing_authority);
    if (!context.hasIncomeDocument) {
      f.required('income_document', 'Income certificate upload', '');
    }
  }

  // Employment
  f.requiredChoice('is_salaried', 'Salaried status', values.is_salaried);
  if (values.is_salaried) {
    f.required('job_type', 'Job type', values.job_type);
  }

  // Disability
  f.requiredChoice('is_disabled', 'Disability status', values.is_disabled);
  if (values.is_disabled) {
    f.required('disability_type', 'Disability type', values.disability_type);
    f.requiredChoice('has_disability_certificate', 'Disability certificate status', values.has_disability_certificate);
    if (values.has_disability_certificate) {
      f.required('disability_certificate_number', 'Disability certificate number', values.disability_certificate_number);
      if (!context.hasDisabilityDocument) {
        f.required('disability_document', 'Disability certificate upload', '');
      }
    }
  }

  // Siblings
  f.required('siblings_count', 'Number of siblings', values.siblings_count);
  f.numberRange('siblings_count', 'Number of siblings', values.siblings_count, 0, 30);

  // Caste
  f.required('category', 'Caste category', values.category);
  f.required('caste', 'Caste', values.caste);
  f.requiredChoice('has_caste_certificate', 'Caste certificate status', values.has_caste_certificate);
  if (values.has_caste_certificate) {
    f.required('caste_certificate_number', 'Caste certificate number', values.caste_certificate_number);
    f.required('caste_certificate_holder_name', 'Caste certificate holder name', values.caste_certificate_holder_name);
    f.required('caste_issuing_authority', 'Caste issuing authority', values.caste_issuing_authority);
    f.required('caste_date_of_issue', 'Caste certificate date', values.caste_date_of_issue);
    f.notFutureDate('caste_date_of_issue', 'Caste certificate date', values.caste_date_of_issue);
    if (!context.hasCasteDocument) {
      f.required('caste_document', 'Caste certificate upload', '');
    }
  }

  // Bank
  f.required('bank_name', 'Bank name', values.bank_name);
  f.required('account_holder_name', 'Account holder name', values.account_holder_name);
  if (!context.hasSavedAccount) {
    f.required('account_number', 'Bank account number', values.account_number);
  }
  f.required('ifsc_code', 'IFSC code', values.ifsc_code);
  f.pattern('ifsc_code', 'IFSC code', values.ifsc_code.toUpperCase(), IFSC_PATTERN, 'Enter a valid 11-character IFSC code.');
  f.required('branch_name', 'Branch name', values.branch_name);
  f.required('account_type', 'Account type', values.account_type);
  f.requiredChoice('aadhaar_linked', 'Aadhaar-linked account status', values.aadhaar_linked);

  return {
    valid: Object.keys(f.errors).length === 0,
    errors: f.errors,
    missingRequired: f.missingRequired,
  };
}

/* -------------------------------------------------------------------------- */
/* 2. Address Information                                                     */
/* -------------------------------------------------------------------------- */

export function validateAddress(values: AddressFormValues): SectionValidation {
  const f = new FieldCollector();

  f.required('permanent_address', 'Permanent address', values.permanent_address);
  f.required('permanent_village', 'Village / city', values.permanent_village);
  f.required('permanent_state', 'State', values.permanent_state);
  f.required('permanent_district', 'District', values.permanent_district);
  f.required('permanent_taluka', 'Taluka', values.permanent_taluka);
  f.required('permanent_pincode', 'Pincode', values.permanent_pincode);
  f.pattern('permanent_pincode', 'Pincode', values.permanent_pincode, PINCODE_PATTERN, 'Pincode must be 6 digits.');

  if (!values.same_as_permanent) {
    f.required('correspondence_address', 'Correspondence address', values.correspondence_address);
    f.required('correspondence_village', 'Correspondence village / city', values.correspondence_village);
    f.required('correspondence_state', 'Correspondence state', values.correspondence_state);
    f.required('correspondence_district', 'Correspondence district', values.correspondence_district);
    f.required('correspondence_taluka', 'Correspondence taluka', values.correspondence_taluka);
    f.required('correspondence_pincode', 'Correspondence pincode', values.correspondence_pincode);
    f.pattern('correspondence_pincode', 'Correspondence pincode', values.correspondence_pincode, PINCODE_PATTERN, 'Pincode must be 6 digits.');
  }

  return {
    valid: Object.keys(f.errors).length === 0,
    errors: f.errors,
    missingRequired: f.missingRequired,
  };
}

/* -------------------------------------------------------------------------- */
/* 3. Other Information (parents and guardian)                                 */
/* -------------------------------------------------------------------------- */

export function validateOtherInfo(values: OtherInfoFormValues): SectionValidation {
  const f = new FieldCollector();

  f.requiredChoice('father_alive', 'Whether the father is alive', values.father_alive);
  if (values.father_alive) {
    f.required('father_name', "Father's name", values.father_name);
    f.required('father_occupation', "Father's occupation", values.father_occupation);
    f.requiredChoice('father_salaried', "Father's salaried status", values.father_salaried);
  }

  f.requiredChoice('mother_alive', 'Whether the mother is alive', values.mother_alive);
  if (values.mother_alive) {
    f.required('mother_name', "Mother's name", values.mother_name);
    f.required('mother_occupation', "Mother's occupation", values.mother_occupation);
    f.requiredChoice('mother_salaried', "Mother's salaried status", values.mother_salaried);
  }

  f.requiredChoice('guardian_required', 'Whether a guardian is required', values.guardian_required);
  if (values.guardian_required) {
    f.required('guardian_name', "Guardian's name", values.guardian_name);
    f.required('guardian_relationship', 'Relationship with guardian', values.guardian_relationship);
    f.required('guardian_occupation', "Guardian's occupation", values.guardian_occupation);
    f.required('guardian_mobile', "Guardian's mobile", values.guardian_mobile);
    f.pattern('guardian_mobile', "Guardian's mobile", values.guardian_mobile, MOBILE_PATTERN, 'Enter a 10-digit mobile number.');
  }

  return {
    valid: Object.keys(f.errors).length === 0,
    errors: f.errors,
    missingRequired: f.missingRequired,
  };
}

/* -------------------------------------------------------------------------- */
/* 4. Current Course                                                          */
/* -------------------------------------------------------------------------- */

export function validateCurrentCourse(values: CurrentCourseFormValues): SectionValidation {
  const f = new FieldCollector();

  f.required('academic_year', 'Academic year', values.academic_year);
  f.required('course_level', 'Course level', values.course_level);
  f.required('course_name', 'Course name', values.course_name);
  f.required('degree', 'Course / degree', values.degree);
  f.required('branch', 'Branch / specialisation', values.branch);
  f.required('year_of_study', 'Year of study', values.year_of_study);
  f.numberRange('year_of_study', 'Year of study', values.year_of_study, 1, 12);
  f.required('semester', 'Semester', values.semester);
  f.numberRange('semester', 'Semester', values.semester, 1, 20);
  f.required('institution_name', 'College / institute', values.institution_name);
  f.required('board_university', 'University / board', values.board_university);
  f.required('admission_date', 'Admission date', values.admission_date);
  f.notFutureDate('admission_date', 'Admission date', values.admission_date);
  f.required('admission_type', 'Admission type', values.admission_type);
  f.required('mode_of_study', 'Mode of study', values.mode_of_study);
  f.required('course_duration_months', 'Course duration', values.course_duration_months);
  f.numberRange('course_duration_months', 'Course duration', values.course_duration_months, 1, 120);
  f.requiredChoice('is_professional', 'Professional course status', values.is_professional);
  f.requiredChoice('cap_admission', 'CAP admission status', values.cap_admission);
  if (values.cap_admission) {
    f.required('cap_application_number', 'CAP application number', values.cap_application_number);
  }
  f.required('seat_type', 'Seat type / category', values.seat_type);
  f.required('institute_state', 'Institute state', values.institute_state);
  f.required('institute_district', 'Institute district', values.institute_district);
  f.required('institute_taluka', 'Institute taluka', values.institute_taluka);

  return {
    valid: Object.keys(f.errors).length === 0,
    errors: f.errors,
    missingRequired: f.missingRequired,
  };
}

/* -------------------------------------------------------------------------- */
/* 5. Past Qualification                                                      */
/* -------------------------------------------------------------------------- */

export function validateQualifications(values: QualificationFormValues[]): SectionValidation {
  const f = new FieldCollector();

  if (values.length === 0) {
    f.errors.has_qualification = 'Add at least one past qualification.';
    f.missingRequired.push('has_qualification');
    return { valid: false, errors: f.errors, missingRequired: f.missingRequired };
  }

  values.forEach((row, index) => {
    const at = (base: string) => (index === 0 ? base : `${base}_${index + 1}`);

    f.required(at('qualification_type'), 'Qualification', row.qualification_type);
    f.required(at('board_university'), 'Board / university', row.board_university);

    if (f.required(at('passing_year'), 'Year of passing', row.passing_year)) {
      const parsed = toNumber(row.passing_year);
      if (parsed === null || parsed < 1980 || parsed > CURRENT_YEAR + 1) {
        f.errors[at('passing_year')] = 'Enter a valid year of passing.';
      }
    }

    if (f.required(at('percentage'), 'Percentage', row.percentage)) {
      f.numberRange(at('percentage'), 'Percentage', row.percentage, 0, 100);
    }
  });

  return {
    valid: Object.keys(f.errors).length === 0,
    errors: f.errors,
    missingRequired: f.missingRequired,
  };
}

/* -------------------------------------------------------------------------- */
/* 6. Hostel Details                                                          */
/* -------------------------------------------------------------------------- */

export interface HostelValidationContext {
  /** The hosteller certificate row, if one has been uploaded. */
  hasCertificate: boolean;
}

export function validateHostel(
  values: HostelFormValues,
  context: HostelValidationContext,
): SectionValidation {
  const f = new FieldCollector();
  const isHosteller = values.beneficiary_category.trim().toLowerCase() === 'hosteller';

  f.required('beneficiary_category', 'Beneficiary category', values.beneficiary_category);

  if (isHosteller) {
    f.required('state', 'Hostel state', values.state);
    f.required('district', 'Hostel district', values.district);
    f.required('taluka', 'Hostel taluka', values.taluka);
    f.required('hostel_type', 'Hostel type', values.hostel_type);
    f.required('hostel_name', 'Hostel name', values.hostel_name);
    f.requiredChoice('is_aided', 'Aided status', values.is_aided);
    f.required('hostel_address', 'Hostel address', values.hostel_address);
    f.required('admission_date', 'Hostel admission date', values.admission_date);
    f.notFutureDate('admission_date', 'Hostel admission date', values.admission_date);
    f.requiredChoice('mess_available', 'Mess availability', values.mess_available);
    f.required('rent_per_month', 'Rent per month', values.rent_per_month);
    f.numberRange('rent_per_month', 'Rent per month', values.rent_per_month, 0, 1_000_000);
    if (!context.hasCertificate) {
      f.required('certificate_document', 'Hosteller certificate upload', '');
    }
  }

  return {
    valid: Object.keys(f.errors).length === 0,
    errors: f.errors,
    missingRequired: f.missingRequired,
  };
}

/** Human labels for the field keys, used by the "what is missing" summary. */
export const FIELD_LABELS: Record<string, string> = {
  full_name: 'Full name',
  mobile_number: 'Mobile number',
  email: 'Email ID',
  date_of_birth: 'Date of birth',
  gender: 'Gender',
  religion: 'Religion',
  marital_status: 'Marital status',
  applicant_full_name_as_per_marksheet: 'Name as per marksheet',
  parent_guardian_mobile: 'Parent/guardian mobile',
  aadhaar: 'Aadhaar number',
  aadhaar_last4: 'Aadhaar number',
  is_maharashtra_domicile: 'Maharashtra domicile status',
  has_domicile_certificate: 'Domicile certificate status',
  domicile_certificate_number: 'Domicile certificate number',
  domicile_certificate_holder_name: 'Domicile certificate holder name',
  domicile_issuing_authority: 'Domicile issuing authority',
  domicile_date_of_issue: 'Domicile certificate date',
  domicile_document: 'Domicile certificate upload',
  annual_income: 'Family annual income',
  has_income_certificate: 'Income certificate status',
  income_certificate_number: 'Income certificate number',
  income_certificate_date: 'Income certificate date',
  income_issuing_authority: 'Income certificate issuing authority',
  income_document: 'Income certificate upload',
  is_salaried: 'Salaried status',
  job_type: 'Job type',
  is_disabled: 'Disability status',
  disability_type: 'Disability type',
  has_disability_certificate: 'Disability certificate status',
  disability_certificate_number: 'Disability certificate number',
  disability_document: 'Disability certificate upload',
  siblings_count: 'Number of siblings',
  category: 'Caste category',
  caste: 'Caste',
  has_caste_certificate: 'Caste certificate status',
  caste_certificate_number: 'Caste certificate number',
  caste_certificate_holder_name: 'Caste certificate holder name',
  caste_issuing_authority: 'Caste issuing authority',
  caste_date_of_issue: 'Caste certificate date',
  caste_document: 'Caste certificate upload',
  bank_name: 'Bank name',
  account_holder_name: 'Account holder name',
  account_number: 'Bank account number',
  account_number_last4: 'Bank account number',
  ifsc_code: 'IFSC code',
  branch_name: 'Branch name',
  account_type: 'Account type',
  aadhaar_linked: 'Aadhaar-linked account status',
  permanent_address: 'Permanent address',
  permanent_village: 'Village / city',
  permanent_state: 'State',
  permanent_district: 'District',
  permanent_taluka: 'Taluka',
  permanent_pincode: 'Pincode',
  same_as_permanent: 'Correspondence address confirmation',
  correspondence_address: 'Correspondence address',
  correspondence_village: 'Correspondence village / city',
  correspondence_state: 'Correspondence state',
  correspondence_district: 'Correspondence district',
  correspondence_taluka: 'Correspondence taluka',
  correspondence_pincode: 'Correspondence pincode',
  father_alive: "Whether the father is alive",
  father_name: "Father's name",
  father_occupation: "Father's occupation",
  father_salaried: "Father's salaried status",
  mother_alive: 'Whether the mother is alive',
  mother_name: "Mother's name",
  mother_occupation: "Mother's occupation",
  mother_salaried: "Mother's salaried status",
  guardian_required: 'Whether a guardian is required',
  guardian_name: "Guardian's name",
  guardian_relationship: 'Relationship with guardian',
  guardian_occupation: "Guardian's occupation",
  guardian_mobile: "Guardian's mobile",
  academic_year: 'Academic year',
  course_level: 'Course level',
  course_name: 'Course name',
  degree: 'Course / degree',
  branch: 'Branch / specialisation',
  year_of_study: 'Year of study',
  semester: 'Semester',
  institution_name: 'College / institute',
  board_university: 'University / board',
  admission_date: 'Admission date',
  admission_type: 'Admission type',
  mode_of_study: 'Mode of study',
  course_duration_months: 'Course duration',
  is_professional: 'Professional course status',
  cap_admission: 'CAP admission status',
  cap_application_number: 'CAP application number',
  seat_type: 'Seat type / category',
  institute_state: 'Institute state',
  institute_district: 'Institute district',
  institute_taluka: 'Institute taluka',
  has_qualification: 'At least one past qualification',
  beneficiary_category: 'Beneficiary category',
  state: 'Hostel state',
  district: 'Hostel district',
  taluka: 'Hostel taluka',
  hostel_type: 'Hostel type',
  hostel_name: 'Hostel name',
  is_aided: 'Aided status',
  hostel_address: 'Hostel address',
  mess_available: 'Mess availability',
  rent_per_month: 'Rent per month',
  certificate_document: 'Hostel certificate upload',
};