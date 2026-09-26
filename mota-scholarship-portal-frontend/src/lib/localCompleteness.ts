/**
 * Client-side mirror of `public.applicant_profile_completeness()`.
 *
 * WHY
 *
 * That function lives in 20260926090100_applicant_profile_security.sql, which is
 * not applied to the deployed project, so `fetchCompleteness()` returns PGRST202.
 * The profile page guards on `ok` before calling setState, so the bar silently
 * stayed at 0% forever: the applicant saved every section correctly and watched
 * nothing move.
 *
 * This computes the same number from rows the page has already loaded, so the
 * figure responds to each save. The server function remains the authority and
 * takes over the moment the migration is applied -- `fetchCompleteness` is still
 * called first and its result wins.
 *
 * FIDELITY
 *
 * The rules below are transcribed from the seed in
 * 20260926090030_applicant_profile_master_data.sql, and the arithmetic reproduces
 * the plpgsql exactly:
 *
 *   * rules whose applicability gate is false are skipped entirely and do not
 *     count toward the denominator;
 *   * a section with no applicable rules scores 100, not 0 -- an applicant who is
 *     not a hosteller is not penalised for skipping hostel fields;
 *   * `overall` is the rounded mean of the six section scores, so five finished
 *     sections never read as "almost done";
 *   * `missing` entries are "section.field_key", which is what the page's
 *     per-section filter greps for.
 *
 * If a rule changes in the database, change it here too.
 */

import type { ProfileCompleteness, ProfileData, ProfileSectionId } from '../types/profile';

/** One row of public.profile_completeness_rules. */
interface CompletenessRule {
  section: ProfileSectionId;
  fieldKey: string;
  /** Applicability gate; '' and 'always' mean unconditional. */
  condition: string;
}

/**
 * Transcribed from the seed in 20260926090030. Every seeded weight is 1, so
 * presence counting and weighted counting are identical; the weight column is
 * deliberately not modelled, and the comment on the seed says so.
 */
const RULES: readonly CompletenessRule[] = [
  // 1. Personal
  r('personal', 'full_name'),
  r('personal', 'mobile_number'),
  r('personal', 'email'),
  r('personal', 'date_of_birth'),
  r('personal', 'gender'),
  r('personal', 'religion'),
  r('personal', 'marital_status'),
  r('personal', 'applicant_full_name_as_per_marksheet'),
  r('personal', 'parent_guardian_mobile'),
  r('personal', 'aadhaar_last4'),
  r('personal', 'is_maharashtra_domicile'),
  r('personal', 'has_domicile_certificate', 'is_maharashtra_domicile'),
  r('personal', 'domicile_certificate_number', 'has_domicile_certificate'),
  r('personal', 'domicile_certificate_holder_name', 'has_domicile_certificate'),
  r('personal', 'domicile_issuing_authority', 'has_domicile_certificate'),
  r('personal', 'domicile_date_of_issue', 'has_domicile_certificate'),
  r('personal', 'domicile_document', 'has_domicile_certificate'),
  r('personal', 'annual_income'),
  r('personal', 'has_income_certificate'),
  r('personal', 'income_certificate_number', 'has_income_certificate'),
  r('personal', 'income_certificate_date', 'has_income_certificate'),
  r('personal', 'income_issuing_authority', 'has_income_certificate'),
  r('personal', 'income_document', 'has_income_certificate'),
  r('personal', 'is_salaried'),
  r('personal', 'job_type', 'is_salaried'),
  r('personal', 'is_disabled'),
  r('personal', 'disability_type', 'is_disabled'),
  r('personal', 'has_disability_certificate', 'is_disabled'),
  r('personal', 'disability_certificate_number', 'has_disability_certificate'),
  r('personal', 'disability_document', 'has_disability_certificate'),
  r('personal', 'siblings_count'),
  r('personal', 'category'),
  r('personal', 'caste'),
  r('personal', 'has_caste_certificate'),
  r('personal', 'caste_certificate_number', 'has_caste_certificate'),
  r('personal', 'caste_certificate_holder_name', 'has_caste_certificate'),
  r('personal', 'caste_issuing_authority', 'has_caste_certificate'),
  r('personal', 'caste_date_of_issue', 'has_caste_certificate'),
  r('personal', 'caste_document', 'has_caste_certificate'),
  r('personal', 'bank_name'),
  r('personal', 'account_holder_name'),
  r('personal', 'account_number_last4'),
  r('personal', 'ifsc_code'),
  r('personal', 'branch_name'),
  r('personal', 'account_type'),
  r('personal', 'aadhaar_linked'),

  // 2. Address
  r('address', 'permanent_address'),
  r('address', 'permanent_state'),
  r('address', 'permanent_district'),
  r('address', 'permanent_taluka'),
  r('address', 'permanent_village'),
  r('address', 'permanent_pincode'),
  r('address', 'same_as_permanent'),
  r('address', 'correspondence_address', 'same_as_permanent_false'),
  r('address', 'correspondence_state', 'same_as_permanent_false'),
  r('address', 'correspondence_district', 'same_as_permanent_false'),
  r('address', 'correspondence_taluka', 'same_as_permanent_false'),
  r('address', 'correspondence_village', 'same_as_permanent_false'),
  r('address', 'correspondence_pincode', 'same_as_permanent_false'),

  // 3. Other information (parents / guardian)
  r('other', 'father_alive'),
  r('other', 'father_name', 'father_alive'),
  r('other', 'father_occupation', 'father_alive'),
  r('other', 'father_salaried', 'father_alive'),
  r('other', 'mother_alive'),
  r('other', 'mother_name', 'mother_alive'),
  r('other', 'mother_occupation', 'mother_alive'),
  r('other', 'mother_salaried', 'mother_alive'),
  r('other', 'guardian_required'),
  r('other', 'guardian_name', 'guardian_required'),
  r('other', 'guardian_relationship', 'guardian_required'),
  r('other', 'guardian_mobile', 'guardian_required'),
  r('other', 'guardian_occupation', 'guardian_required'),

  // 4. Current course
  r('current_course', 'academic_year'),
  r('current_course', 'course_level'),
  r('current_course', 'course_name'),
  r('current_course', 'degree'),
  r('current_course', 'branch'),
  r('current_course', 'year_of_study'),
  r('current_course', 'semester'),
  r('current_course', 'institution_name'),
  r('current_course', 'board_university'),
  r('current_course', 'admission_date'),
  r('current_course', 'admission_type'),
  r('current_course', 'mode_of_study'),
  r('current_course', 'course_duration_months'),
  r('current_course', 'is_professional'),
  r('current_course', 'cap_admission'),
  r('current_course', 'cap_application_number', 'cap_admission'),
  r('current_course', 'seat_type'),
  r('current_course', 'institute_state'),
  r('current_course', 'institute_district'),
  r('current_course', 'institute_taluka'),

  // 5. Past qualification: satisfied by at least one complete saved record
  r('past_qualification', 'has_qualification', 'always'),
  r('past_qualification', 'qualification_core', 'always'),

  // 6. Hostel
  r('hostel', 'beneficiary_category'),
  r('hostel', 'state', 'is_hosteller'),
  r('hostel', 'district', 'is_hosteller'),
  r('hostel', 'taluka', 'is_hosteller'),
  r('hostel', 'hostel_type', 'is_hosteller'),
  r('hostel', 'hostel_name', 'is_hosteller'),
  r('hostel', 'is_aided', 'is_hosteller'),
  r('hostel', 'hostel_address', 'is_hosteller'),
  r('hostel', 'admission_date', 'is_hosteller'),
  r('hostel', 'mess_available', 'is_hosteller'),
  r('hostel', 'rent_per_month', 'is_hosteller'),
  r('hostel', 'certificate_document', 'is_hosteller'),
];

function r(section: ProfileSectionId, fieldKey: string, condition = ''): CompletenessRule {
  return { section, fieldKey, condition };
}

/** Order the database returns sections in: `order by 1` over distinct section. */
const SECTION_ORDER: readonly ProfileSectionId[] = [
  'personal',
  'address',
  'other',
  'current_course',
  'past_qualification',
  'hostel',
];

const PINCODE = /^[0-9]{6}$/;
const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;

function filled(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

/** postgres round(): half away from zero. */
function pgRound(numerator: number, denominator: number): number {
  return Math.round(numerator / denominator);
}

export interface LocalCompletenessInput {
  data: ProfileData;
  /**
   * True when the Aadhaar only exists as a device-local placeholder, because the
   * SECURITY DEFINER writer is not deployed. The field has a value in that case,
   * so it counts as present -- otherwise saving an Aadhaar would not move the
   * bar, which is the same frozen-progress symptom this whole module exists to
   * fix.
   */
  localAadhaarPresent: boolean;
  localAccountPresent: boolean;
}

export function computeLocalCompleteness({
  data,
  localAadhaarPresent,
  localAccountPresent,
}: LocalCompletenessInput): ProfileCompleteness {
  const { profile, domicile, income, eligibility, caste, address, parents, bank, course, hostel, qualifications } = data;

  const qualificationCount = qualifications.length;
  const incompleteQualifications = qualifications.filter(
    (row) =>
      !filled(row.qualification_type) ||
      !filled(row.board_university) ||
      row.passing_year === null ||
      row.percentage === null,
  ).length;

  /** Mirrors the applicability `case` in the plpgsql. */
  function isApplicable(condition: string): boolean {
    switch (condition) {
      case '':
      case 'always':
        return true;
      case 'is_maharashtra_domicile':
        return domicile?.is_maharashtra_domicile === true;
      case 'has_domicile_certificate':
        return domicile?.has_domicile_certificate === true;
      case 'has_income_certificate':
        return income?.has_income_certificate === true;
      case 'has_caste_certificate':
        return caste?.has_caste_certificate === true;
      case 'is_disabled':
        return eligibility?.is_disabled === true;
      case 'has_disability_certificate':
        return eligibility?.is_disabled === true && eligibility?.has_disability_certificate === true;
      case 'is_salaried':
        return eligibility?.is_salaried === true;
      case 'same_as_permanent_false':
        return address?.same_as_permanent !== true;
      case 'father_alive':
        return parents?.father_alive === true;
      case 'mother_alive':
        return parents?.mother_alive === true;
      case 'guardian_required':
        return parents?.guardian_required === true;
      case 'cap_admission':
        return course?.cap_admission === true;
      case 'is_hosteller':
        return (hostel?.beneficiary_category ?? '').trim().toLowerCase() === 'hosteller';
      default:
        // Mirrors the plpgsql `else v_applicable := true`: an unrecognised gate is
        // treated as unconditional rather than silently dropping rules.
        return true;
    }
  }

  /** Mirrors the presence `case`. Returns false for an unknown key, as plpgsql does. */
  function isPresent(section: ProfileSectionId, fieldKey: string): boolean {
    // `admission_date` is the one field_key seeded under two sections
    // (current_course and hostel), so it cannot be resolved on the key alone.
    //
    // The plpgsql resolves it on field_key alone, and because that case is an
    // *expression* PostgreSQL does not reject the duplicate -- it silently takes
    // the first match, so the hostel rule was reading current_courses.admission_date.
    // Resolved per section here, which is the evident intent; the migration is
    // fixed to match.
    if (fieldKey === 'admission_date') {
      return section === 'hostel'
        ? hostel?.admission_date != null
        : course?.admission_date != null;
    }

    switch (fieldKey) {
      // Personal
      case 'full_name':
        return filled(profile?.full_name);
      case 'mobile_number':
        return filled(profile?.mobile_number);
      case 'email':
        return filled(profile?.email);
      case 'date_of_birth':
        return profile?.date_of_birth != null;
      case 'gender':
        return filled(profile?.gender);
      case 'religion':
        return filled(profile?.religion);
      case 'marital_status':
        return filled(profile?.marital_status);
      case 'applicant_full_name_as_per_marksheet':
        return filled(profile?.applicant_full_name_as_per_marksheet);
      case 'parent_guardian_mobile':
        return filled(profile?.parent_guardian_mobile);
      case 'aadhaar_last4':
        return filled(profile?.aadhaar_last4) || localAadhaarPresent;

      // Domicile
      case 'is_maharashtra_domicile':
        return domicile?.is_maharashtra_domicile != null;
      case 'has_domicile_certificate':
        return domicile?.has_domicile_certificate != null;
      case 'domicile_certificate_number':
        return filled(domicile?.certificate_number);
      case 'domicile_certificate_holder_name':
        return filled(domicile?.certificate_holder_name);
      case 'domicile_issuing_authority':
        return filled(domicile?.issuing_authority);
      case 'domicile_date_of_issue':
        return domicile?.date_of_issue != null;
      case 'domicile_document':
        return domicile?.document_id != null;

      // Income
      case 'annual_income':
        return income?.annual_income != null;
      case 'has_income_certificate':
        return income?.has_income_certificate != null;
      case 'income_certificate_number':
        return filled(income?.certificate_number);
      case 'income_certificate_date':
        return income?.certificate_date != null;
      case 'income_issuing_authority':
        return filled(income?.issuing_authority);
      case 'income_document':
        return income?.document_id != null;

      // Eligibility
      case 'is_salaried':
        return eligibility?.is_salaried != null;
      case 'job_type':
        return filled(eligibility?.job_type);
      case 'is_disabled':
        return eligibility?.is_disabled != null;
      case 'disability_type':
        return filled(eligibility?.disability_type);
      case 'has_disability_certificate':
        return eligibility?.has_disability_certificate != null;
      case 'disability_certificate_number':
        return filled(eligibility?.disability_certificate_number);
      case 'disability_document':
        return eligibility?.disability_document_id != null;
      case 'siblings_count':
        return eligibility?.siblings_count != null;

      // Caste
      case 'category':
        return filled(caste?.category);
      case 'caste':
        return filled(caste?.caste);
      case 'has_caste_certificate':
        return caste?.has_caste_certificate != null;
      case 'caste_certificate_number':
        return filled(caste?.certificate_number);
      case 'caste_certificate_holder_name':
        return filled(caste?.certificate_holder_name);
      case 'caste_issuing_authority':
        return filled(caste?.issuing_authority);
      case 'caste_date_of_issue':
        return caste?.date_of_issue != null;
      case 'caste_document':
        return caste?.document_id != null;

      // Bank. Each is an `exists` in plpgsql, so a missing row is false rather
      // than undefined-but-truthy.
      case 'aadhaar_linked':
        return bank != null && bank.aadhaar_linked != null;
      case 'bank_name':
        return bank != null && filled(bank.bank_name);
      case 'account_holder_name':
        return bank != null && filled(bank.account_holder_name);
      case 'account_number_last4':
        return (bank != null && filled(bank.account_number_last4)) || localAccountPresent;
      case 'ifsc_code':
        return bank != null && bank.ifsc_code != null && IFSC.test(bank.ifsc_code);
      case 'branch_name':
        return bank != null && filled(bank.branch_name);
      case 'account_type':
        return bank != null && filled(bank.account_type);

      // Address
      case 'permanent_address':
        return filled(address?.permanent_address);
      case 'permanent_state':
        return filled(address?.permanent_state);
      case 'permanent_district':
        return filled(address?.permanent_district);
      case 'permanent_taluka':
        return filled(address?.permanent_taluka);
      case 'permanent_village':
        return filled(address?.permanent_village);
      case 'permanent_pincode':
        return address?.permanent_pincode != null && PINCODE.test(address.permanent_pincode);
      case 'same_as_permanent':
        return address?.same_as_permanent != null;
      case 'correspondence_address':
        return filled(address?.correspondence_address);
      case 'correspondence_state':
        return filled(address?.correspondence_state);
      case 'correspondence_district':
        return filled(address?.correspondence_district);
      case 'correspondence_taluka':
        return filled(address?.correspondence_taluka);
      case 'correspondence_village':
        return filled(address?.correspondence_village);
      case 'correspondence_pincode':
        return address?.correspondence_pincode != null && PINCODE.test(address.correspondence_pincode);

      // Parents / guardian
      case 'father_alive':
        return parents?.father_alive != null;
      case 'father_name':
        return filled(parents?.father_name);
      case 'father_occupation':
        return filled(parents?.father_occupation);
      case 'father_salaried':
        return parents?.father_salaried != null;
      case 'mother_alive':
        return parents?.mother_alive != null;
      case 'mother_name':
        return filled(parents?.mother_name);
      case 'mother_occupation':
        return filled(parents?.mother_occupation);
      case 'mother_salaried':
        return parents?.mother_salaried != null;
      case 'guardian_required':
        return parents?.guardian_required != null;
      case 'guardian_name':
        return filled(parents?.guardian_name);
      case 'guardian_relationship':
        return filled(parents?.guardian_relationship);
      case 'guardian_mobile':
        return filled(parents?.guardian_mobile);
      case 'guardian_occupation':
        return filled(parents?.guardian_occupation);

      // Current course
      case 'academic_year':
        return filled(course?.academic_year);
      case 'course_level':
        return filled(course?.course_level);
      case 'course_name':
        return filled(course?.course_name);
      case 'degree':
        return filled(course?.degree);
      case 'branch':
        return filled(course?.branch);
      case 'year_of_study':
        return course?.year_of_study != null;
      case 'semester':
        return course?.semester != null;
      case 'institution_name':
        return filled(course?.institution_name);
      case 'board_university':
        return filled(course?.board_university) || filled(course?.university_name);
      case 'admission_type':
        return filled(course?.admission_type);
      case 'mode_of_study':
        return filled(course?.mode_of_study);
      case 'course_duration_months':
        return course?.course_duration_months != null;
      case 'is_professional':
        return course?.is_professional != null;
      case 'cap_admission':
        return course?.cap_admission != null;
      case 'cap_application_number':
        return filled(course?.cap_application_number);
      case 'seat_type':
        return filled(course?.seat_type);
      case 'institute_state':
        return filled(course?.institute_state);
      case 'institute_district':
        return filled(course?.institute_district);
      case 'institute_taluka':
        return filled(course?.institute_taluka);

      // Past qualifications
      case 'has_qualification':
        return qualificationCount > 0;
      case 'qualification_core':
        return qualificationCount > 0 && incompleteQualifications === 0;

      // Hostel
      case 'beneficiary_category':
        return filled(hostel?.beneficiary_category);
      case 'state':
        return filled(hostel?.state);
      case 'district':
        return filled(hostel?.district);
      case 'taluka':
        return filled(hostel?.taluka);
      case 'hostel_type':
        return filled(hostel?.hostel_type);
      case 'hostel_name':
        return filled(hostel?.hostel_name);
      case 'is_aided':
        return hostel?.is_aided != null;
      case 'hostel_address':
        return filled(hostel?.hostel_address);
      case 'mess_available':
        return hostel?.mess_available != null;
      case 'rent_per_month':
        return hostel?.rent_per_month != null;
      case 'certificate_document':
        return hostel?.certificate_document_id != null;

      default:
        return false;
    }
  }

  const sections = {} as Record<ProfileSectionId, number>;
  const missing: string[] = [];
  let completeSections = 0;
  let overallSum = 0;

  for (const section of SECTION_ORDER) {
    let total = 0;
    let done = 0;

    for (const rule of RULES) {
      if (rule.section !== section) continue;
      if (!isApplicable(rule.condition)) continue;

      total += 1;
      if (isPresent(section, rule.fieldKey)) {
        done += 1;
      } else {
        missing.push(`${section}.${rule.fieldKey}`);
      }
    }

    // A section with nothing applicable scores 100, matching the plpgsql. This is
    // what stops a non-hosteller from being permanently 0% on hostel.
    const percent = total === 0 ? 100 : pgRound(done * 100, total);
    sections[section] = percent;
    overallSum += percent;
    if (percent >= 100) completeSections += 1;
  }

  const overall = pgRound(overallSum, SECTION_ORDER.length);

  return {
    overall,
    status: overall >= 100 ? 'complete' : 'incomplete',
    complete_sections: completeSections,
    section_count: SECTION_ORDER.length,
    sections,
    missing,
  };
}
