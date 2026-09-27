/**
 * Applicant profile data access.
 *
 * Handles all profile sections:
 * 1. Personal Information
 * 2. Address Information
 * 3. Other Information (parents / guardian)
 * 4. Current Course
 * 5. Past Qualification
 * 6. Hostel Details
 *
 * The loadProfile function loads all data for the application form to use.
 * The save functions handle each section separately.
 */

import { supabase } from '../lib/supabase';
import { messageFromError } from '../lib/dbErrorMessage';
import { saveLocalAadhaar, saveLocalAccountNumber } from '../lib/localSecretStore';
import type {
  AddressDetailsRecord,
  AddressFormValues,
  ApplicantDocumentRecord,
  ApplicantProfileRecord,
  ApplicantQualificationRecord,
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
  ProfileCompleteness,
  ProfileData,
  ProfileFormValues,
  QualificationFormValues,
} from '../types/profile';
import { EMPTY_PROFILE_COMPLETENESS } from '../types/profile';

export interface ServiceResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  /**
   * Write-only fields that were accepted but are NOT on the applicant's profile,
   * because the SECURITY DEFINER writer for them is not deployed. Present only on
   * success, and never a substitute for `error`: the save really did succeed, and
   * the caller needs to say so precisely rather than implying the whole thing
   * failed. Values are 'aadhaar' and/or 'account'.
   */
  pendingLocally?: readonly ('aadhaar' | 'account')[];
}

const PROFILE_TABLE = 'applicant_profiles';
const DOMICILE_TABLE = 'domicile_details';
const INCOME_TABLE = 'income_details';
const ELIGIBILITY_TABLE = 'personal_eligibility';
const CASTE_TABLE = 'caste_details';
const ADDRESS_TABLE = 'address_details';
const PARENTS_TABLE = 'parent_guardian_details';
const BANK_TABLE = 'bank_details';
const COURSE_TABLE = 'current_courses';
const QUAL_TABLE = 'applicant_qualifications';
const HOSTEL_TABLE = 'hostel_details';

function requireClient() {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to use the applicant profile.',
    );
  }
  return supabase;
}

/** Empty string means "not answered"; store NULL so the completeness engine agrees. */
function text(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

function num(value: string | null | undefined): number | null {
  const trimmed = (value ?? '').trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function int(value: string | null | undefined): number | null {
  const parsed = num(value);
  if (parsed === null) return null;
  return Math.trunc(parsed);
}

/** 'YYYY-MM-DD' or null. */
function date(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}



/* -------------------------------------------------------------------------- */
/* Anchor row                                                                 */
/* -------------------------------------------------------------------------- */

export async function ensureApplicantProfile(userId: string): Promise<ServiceResult<ApplicantProfileRecord>> {
  const client = requireClient();

  const { data: existing, error: selectError } = await client
    .from(PROFILE_TABLE)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (selectError) {
    return { ok: false, error: messageFromError(selectError, 'Could not load your profile.') };
  }

  if (existing) {
    return { ok: true, data: existing as ApplicantProfileRecord };
  }

  const { data: created, error: insertError } = await client
    .from(PROFILE_TABLE)
    .insert({ user_id: userId, profile_status: 'incomplete' })
    .select('*')
    .maybeSingle();

  if (insertError) {
    const { data: retry } = await client
      .from(PROFILE_TABLE)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (retry) {
      return { ok: true, data: retry as ApplicantProfileRecord };
    }

    return { ok: false, error: messageFromError(insertError, 'Could not start your profile.') };
  }

  return { ok: true, data: created as ApplicantProfileRecord };
}

/* -------------------------------------------------------------------------- */
/* Read                                                                       */
/* -------------------------------------------------------------------------- */

export async function loadProfile(applicantId: string): Promise<ServiceResult<ProfileData>> {
  const client = requireClient();

  const [profile, domicile, income, eligibility, caste, address, parents, bank, course, hostel, quals, docs] =
    await Promise.all([
      client.from(PROFILE_TABLE).select('*').eq('id', applicantId).maybeSingle(),
      client.from(DOMICILE_TABLE).select('*').eq('applicant_id', applicantId).maybeSingle(),
      client.from(INCOME_TABLE).select('*').eq('applicant_id', applicantId).maybeSingle(),
      client.from(ELIGIBILITY_TABLE).select('*').eq('applicant_id', applicantId).maybeSingle(),
      client.from(CASTE_TABLE).select('*').eq('applicant_id', applicantId).maybeSingle(),
      client.from(ADDRESS_TABLE).select('*').eq('applicant_id', applicantId).maybeSingle(),
      client.from(PARENTS_TABLE).select('*').eq('applicant_id', applicantId).maybeSingle(),
      // Columns are listed explicitly rather than using '*'. bank_details has
      // column-level grants (the RLS migration revokes the table-level grant and
      // re-grants per column, excluding account_number and
      // account_number_ciphertext), so '*' is a permission error here by design.
      // Naming the safe columns also documents at the call site that the
      // ciphertext is never pulled into the browser.
      client
        .from(BANK_TABLE)
        .select(
          'id, applicant_id, bank_name, account_holder_name, ifsc_code, branch_name, account_type, aadhaar_linked, account_number_last4',
        )
        .eq('applicant_id', applicantId)
        .maybeSingle(),
      client.from(COURSE_TABLE).select('*').eq('applicant_id', applicantId).maybeSingle(),
      client.from(HOSTEL_TABLE).select('*').eq('applicant_id', applicantId).maybeSingle(),
      client.from(QUAL_TABLE).select('*').eq('applicant_id', applicantId).order('passing_year', {
        ascending: false,
      }),
      client.from('applicant_documents').select('*').eq('applicant_id', applicantId).order('uploaded_at', {
        ascending: false,
      }),
    ]);

  const failure = [profile, domicile, income, eligibility, caste, address, parents, bank, course, hostel].find(
    (result) => result.error,
  );

  if (failure?.error) {
    return { ok: false, error: messageFromError(failure.error, 'Could not load your profile.') };
  }

  if (quals.error || docs.error) {
    return {
      ok: false,
      error: messageFromError(quals.error ?? docs.error, 'Could not load your documents.'),
    };
  }

  return {
    ok: true,
    data: {
      profile: (profile.data as ApplicantProfileRecord | null) ?? null,
      domicile: (domicile.data as DomicileDetailsRecord | null) ?? null,
      income: (income.data as IncomeDetailsRecord | null) ?? null,
      eligibility: (eligibility.data as PersonalEligibilityRecord | null) ?? null,
      caste: (caste.data as CasteDetailsRecord | null) ?? null,
      address: (address.data as AddressDetailsRecord | null) ?? null,
      parents: (parents.data as ParentGuardianDetailsRecord | null) ?? null,
      bank: (bank.data as BankDetailsRecord | null) ?? null,
      course: (course.data as CurrentCoursesRecord | null) ?? null,
      hostel: (hostel.data as HostelDetailsRecord | null) ?? null,
      qualifications: (quals.data as ApplicantQualificationRecord[] | null) ?? [],
      documents: (docs.data as ApplicantDocumentRecord[] | null) ?? [],
    } satisfies ProfileData,
  };
}

/** upsert helper for the 1:1 section tables. */
async function upsertOne<T>(
  table: string,
  applicantId: string,
  rowId: string | null,
  payload: Record<string, unknown>,
  columns = '*',
): Promise<ServiceResult<T>> {
  const client = requireClient();

  if (rowId) {
    const { data, error } = await client
      .from(table)
      .update(payload)
      .eq('id', rowId)
      .eq('applicant_id', applicantId)
      .select(columns)
      .maybeSingle();
    if (error) return { ok: false, error: messageFromError(error, 'Could not save your changes.') };
    return { ok: true, data: data as T };
  }

  const { data, error } = await client
    .from(table)
    .insert({ ...payload, applicant_id: applicantId })
    .select(columns)
    .maybeSingle();

  if (error) return { ok: false, error: messageFromError(error, 'Could not save your changes.') };
  return { ok: true, data: data as T };
}

/* -------------------------------------------------------------------------- */
/* 1. Personal Information                                                    */
/* -------------------------------------------------------------------------- */

export interface PersonalSaveInput {
  values: ProfileFormValues;
  ids: {
    profile: string;
    domicile: string | null;
    income: string | null;
    eligibility: string | null;
    caste: string | null;
    bank: string | null;
  };
  /**
   * Ids of the certificate metadata rows the applicant uploaded in this session.
   * They are written as the FK on the owning section, which is what the
   * completeness engine reads to decide a certificate requirement is met.
   */
  documentIds: {
    domicile: string | null;
    income: string | null;
    caste: string | null;
    disability: string | null;
  };
}

export async function savePersonalSection(
  applicantId: string,
  { values, ids, documentIds }: PersonalSaveInput,
  options: { localSecretKey?: string } = {},
): Promise<ServiceResult<ApplicantProfileRecord>> {
  const client = requireClient();
  const { data: auth } = await client.auth.getUser();

  const localSecretKey = options.localSecretKey ?? auth.user?.id ?? null;
  const degraded: string[] = [];

  // Sensitive values first: they go through the SECURITY DEFINER writers and are
  // never part of the column payloads below.
  //
  // Both writers live in 20260926090100_applicant_profile_security.sql, which is
  // not applied to the deployed project, so each call currently fails with
  // PostgREST PGRST202. That used to abort the whole section, leaving the
  // applicant unable to save their name, date of birth or address because a
  // function was missing.
  //
  // So a writer failure is no longer fatal. The number is recorded against a
  // device-local placeholder (mask and last four only -- see localSecretStore) and
  // the section save continues, with the shortfall reported back so the page can
  // tell the applicant their number is not yet on their profile.
  if (values.aadhaar.trim() !== '') {
    const { error } = await client.rpc('set_applicant_aadhaar', { p_aadhaar: values.aadhaar });
    if (error) {
      const remembered = localSecretKey ? saveLocalAadhaar(localSecretKey, values.aadhaar) : null;
      if (remembered) {
        degraded.push('aadhaar');
        console.error(
          'Aadhaar writer unavailable; kept a device-local mask only. Apply 20260926090100_applicant_profile_security.sql to store it on the profile.',
          { code: error.code ?? null, message: error.message },
        );
      } else {
        // No local slot either (storage disabled, or no key): this one is fatal,
        // because silently discarding a number the applicant typed is worse than
        // telling them it did not save.
        return { ok: false, error: messageFromError(error, 'Could not save the Aadhaar number.') };
      }
    }
  }

  if (values.account_number.trim() !== '') {
    const { error } = await client.rpc('set_bank_account', { p_account_number: values.account_number });
    if (error) {
      const remembered = localSecretKey ? saveLocalAccountNumber(localSecretKey, values.account_number) : null;
      if (remembered) {
        degraded.push('account');
        console.error(
          'Bank account writer unavailable; kept a device-local last-four only. Apply 20260926090100_applicant_profile_security.sql to store it on the profile.',
          { code: error.code ?? null, message: error.message },
        );
      } else {
        return { ok: false, error: messageFromError(error, 'Could not save the bank account number.') };
      }
    }
  }

  const profilePayload: Record<string, unknown> = {
    user_id: auth.user?.id ?? null,
    full_name: text(values.full_name),
    email: text(values.email),
    mobile_number: text(values.mobile_number),
    date_of_birth: date(values.date_of_birth),
    gender: text(values.gender),
    religion: text(values.religion),
    marital_status: text(values.marital_status),
    applicant_full_name_as_per_marksheet: text(values.applicant_full_name_as_per_marksheet),
    parent_guardian_mobile: text(values.parent_guardian_mobile),
  };

  const profileResult = await upsertOne<ApplicantProfileRecord>(
    PROFILE_TABLE,
    applicantId,
    ids.profile,
    profilePayload,
  );
  if (!profileResult.ok) return { ok: false, error: profileResult.error };

  const domicile = await upsertOne<DomicileDetailsRecord>(DOMICILE_TABLE, applicantId, ids.domicile, {
    is_maharashtra_domicile: values.is_maharashtra_domicile,
    has_domicile_certificate: values.has_domicile_certificate,
    certificate_source: text(values.domicile_certificate_source),
    certificate_holder_name: text(values.domicile_certificate_holder_name),
    certificate_number: text(values.domicile_certificate_number),
    issuing_authority: text(values.domicile_issuing_authority),
    date_of_issue: date(values.domicile_date_of_issue),
    document_id: documentIds.domicile,
  });
  if (!domicile.ok) return { ok: false, error: domicile.error };

  const income = await upsertOne<IncomeDetailsRecord>(INCOME_TABLE, applicantId, ids.income, {
    annual_income: num(values.annual_income),
    has_income_certificate: values.has_income_certificate,
    certificate_source: text(values.income_certificate_source),
    certificate_number: text(values.income_certificate_number),
    certificate_date: date(values.income_certificate_date),
    issuing_authority: text(values.income_issuing_authority),
    barcode: text(values.income_barcode),
    document_id: documentIds.income,
  });
  if (!income.ok) return { ok: false, error: income.error };

  const eligibility = await upsertOne<PersonalEligibilityRecord>(ELIGIBILITY_TABLE, applicantId, ids.eligibility, {
    is_salaried: values.is_salaried,
    job_type: text(values.job_type),
    is_disabled: values.is_disabled,
    disability_type: text(values.disability_type),
    has_disability_certificate: values.has_disability_certificate,
    disability_certificate_number: text(values.disability_certificate_number),
    disability_document_id: documentIds.disability,
    siblings_count: int(values.siblings_count),
  });
  if (!eligibility.ok) return { ok: false, error: eligibility.error };

  const caste = await upsertOne<CasteDetailsRecord>(CASTE_TABLE, applicantId, ids.caste, {
    category: text(values.category),
    caste: text(values.caste),
    sub_caste: text(values.sub_caste),
    has_caste_certificate: values.has_caste_certificate,
    certificate_source: text(values.caste_certificate_source),
    certificate_number: text(values.caste_certificate_number),
    certificate_holder_name: text(values.caste_certificate_holder_name),
    issuing_authority: text(values.caste_issuing_authority),
    date_of_issue: date(values.caste_date_of_issue),
    document_id: documentIds.caste,
  });
  if (!caste.ok) return { ok: false, error: caste.error };

  // Neither the plaintext account_number column nor account_number_ciphertext is
  // written from here: the account number goes through set_bank_account(text),
  // which encrypts it server-side. The safe column list is passed to upsertOne
  // because this table has no table-level SELECT grant.
  const bank = await upsertOne<BankDetailsRecord>(
    BANK_TABLE,
    applicantId,
    ids.bank,
    {
      bank_name: text(values.bank_name),
      account_holder_name: text(values.account_holder_name),
      ifsc_code: text(values.ifsc_code)?.toUpperCase() ?? null,
      branch_name: text(values.branch_name),
      account_type: text(values.account_type),
      aadhaar_linked: values.aadhaar_linked,
    },
    'id, applicant_id, bank_name, account_holder_name, ifsc_code, branch_name, account_type, aadhaar_linked, account_number_last4',
  );
  if (!bank.ok) return { ok: false, error: bank.error };

  return {
    ok: true,
    data: profileResult.data as ApplicantProfileRecord,
    ...(degraded.length > 0 ? { pendingLocally: degraded as ('aadhaar' | 'account')[] } : {}),
  };
}

/* -------------------------------------------------------------------------- */
/* 2. Address Information                                                     */
/* -------------------------------------------------------------------------- */

export async function saveAddressSection(
  applicantId: string,
  rowId: string | null,
  values: AddressFormValues,
): Promise<ServiceResult<AddressDetailsRecord>> {
  const correspondence = values.same_as_permanent
    ? {
        // One source of truth: the permanent address is mirrored rather than
        // copied, so the two can never drift apart.
        correspondence_address: values.permanent_address.trim() || null,
        correspondence_village: values.permanent_village.trim() || null,
        correspondence_state: text(values.permanent_state),
        correspondence_district: text(values.permanent_district),
        correspondence_taluka: text(values.permanent_taluka),
        correspondence_pincode: text(values.permanent_pincode),
      }
    : {
        correspondence_address: text(values.correspondence_address),
        correspondence_village: text(values.correspondence_village),
        correspondence_state: text(values.correspondence_state),
        correspondence_district: text(values.correspondence_district),
        correspondence_taluka: text(values.correspondence_taluka),
        correspondence_pincode: text(values.correspondence_pincode),
      };

  return upsertOne<AddressDetailsRecord>(ADDRESS_TABLE, applicantId, rowId, {
    permanent_address: text(values.permanent_address),
    permanent_village: text(values.permanent_village),
    permanent_state: text(values.permanent_state),
    permanent_district: text(values.permanent_district),
    permanent_taluka: text(values.permanent_taluka),
    permanent_pincode: text(values.permanent_pincode),
    same_as_permanent: values.same_as_permanent,
    ...correspondence,
  });
}

/* -------------------------------------------------------------------------- */
/* 3. Other Information                                                       */
/* -------------------------------------------------------------------------- */

export async function saveOtherInfoSection(
  applicantId: string,
  rowId: string | null,
  values: OtherInfoFormValues,
): Promise<ServiceResult<ParentGuardianDetailsRecord>> {
  return upsertOne<ParentGuardianDetailsRecord>(PARENTS_TABLE, applicantId, rowId, {
    father_alive: values.father_alive,
    father_name: values.father_alive ? text(values.father_name) : null,
    father_occupation: values.father_alive ? text(values.father_occupation) : null,
    father_salaried: values.father_alive ? values.father_salaried : null,
    mother_alive: values.mother_alive,
    mother_name: values.mother_alive ? text(values.mother_name) : null,
    mother_occupation: values.mother_alive ? text(values.mother_occupation) : null,
    mother_salaried: values.mother_alive ? values.mother_salaried : null,
    guardian_required: values.guardian_required,
    guardian_name: values.guardian_required ? text(values.guardian_name) : null,
    guardian_relationship: values.guardian_required ? text(values.guardian_relationship) : null,
    guardian_occupation: values.guardian_required ? text(values.guardian_occupation) : null,
    guardian_mobile: values.guardian_required ? text(values.guardian_mobile) : null,
  });
}

/* -------------------------------------------------------------------------- */
/* 4. Current Course                                                          */
/* -------------------------------------------------------------------------- */

export async function saveCurrentCourseSection(
  applicantId: string,
  rowId: string | null,
  values: CurrentCourseFormValues,
): Promise<ServiceResult<CurrentCoursesRecord>> {
  return upsertOne<CurrentCoursesRecord>(COURSE_TABLE, applicantId, rowId, {
    academic_year: text(values.academic_year),
    course_level: text(values.course_level),
    course_name: text(values.course_name),
    degree: text(values.degree),
    branch: text(values.branch),
    year_of_study: int(values.year_of_study),
    semester: int(values.semester),
    institution_name: text(values.institution_name),
    board_university: text(values.board_university),
    admission_date: date(values.admission_date),
    admission_type: text(values.admission_type),
    mode_of_study: text(values.mode_of_study),
    course_duration_months: int(values.course_duration_months),
    is_professional: values.is_professional,
    cap_admission: values.cap_admission,
    cap_application_number: values.cap_admission ? text(values.cap_application_number) : null,
    seat_type: text(values.seat_type),
    institute_state: text(values.institute_state),
    institute_district: text(values.institute_district),
    institute_taluka: text(values.institute_taluka),
  });
}

/* -------------------------------------------------------------------------- */
/* 5. Past Qualification                                                      */
/* -------------------------------------------------------------------------- */

function qualificationPayload(values: QualificationFormValues) {
  return {
    qualification_type: text(values.qualification_type),
    degree: text(values.degree),
    board_university: text(values.board_university),
    passing_year: int(values.passing_year),
    percentage: num(values.percentage),
    class_grade: text(values.class_grade),
    status: text(values.status),
  };
}

export async function saveQualificationsSection(
  applicantId: string,
  values: QualificationFormValues[],
): Promise<ServiceResult<ApplicantQualificationRecord[]>> {
  const client = requireClient();

  const incomingIds = values.map((row) => row.id).filter((id): id is string => Boolean(id));

  // Delete the rows the applicant removed on the form. Only ever scoped to this
  // applicant's own ids, and RLS independently rejects anything else.
  if (incomingIds.length > 0) {
    const { error } = await client
      .from(QUAL_TABLE)
      .delete()
      .eq('applicant_id', applicantId)
      .not('id', 'in', `(${incomingIds.join(',')})`);
    if (error) return { ok: false, error: messageFromError(error, 'Could not remove a qualification.') };
  } else {
    const { error } = await client.from(QUAL_TABLE).delete().eq('applicant_id', applicantId);
    if (error) return { ok: false, error: messageFromError(error, 'Could not remove a qualification.') };
  }

  for (const row of values) {
    const payload = qualificationPayload(row);
    const { error } = row.id
      ? await client
          .from(QUAL_TABLE)
          .update(payload)
          .eq('id', row.id)
          .eq('applicant_id', applicantId)
      : await client.from(QUAL_TABLE).insert({ ...payload, applicant_id: applicantId });

    if (error) {
      return { ok: false, error: messageFromError(error, 'Could not save your qualifications.') };
    }
  }

  const { data, error } = await client
    .from(QUAL_TABLE)
    .select('*')
    .eq('applicant_id', applicantId)
    .order('passing_year', { ascending: false });

  if (error) return { ok: false, error: messageFromError(error, 'Could not save your qualifications.') };
  return { ok: true, data: (data as ApplicantQualificationRecord[] | null) ?? [] };
}

/* -------------------------------------------------------------------------- */
/* 6. Hostel Details                                                          */
/* -------------------------------------------------------------------------- */

export async function saveHostelSection(
  applicantId: string,
  rowId: string | null,
  values: HostelFormValues,
  certificateDocumentId: string | null = null,
): Promise<ServiceResult<HostelDetailsRecord>> {
  const isHosteller = values.beneficiary_category.trim().toLowerCase() === 'hosteller';

  return upsertOne<HostelDetailsRecord>(HOSTEL_TABLE, applicantId, rowId, {
    beneficiary_category: text(values.beneficiary_category),
    // Hostel location only means anything for a hosteller. Storing it for a day
    // scholar would keep dead rows in the completeness calculation.
    state: isHosteller ? text(values.state) : null,
    district: isHosteller ? text(values.district) : null,
    taluka: isHosteller ? text(values.taluka) : null,
    hostel_type: isHosteller ? text(values.hostel_type) : null,
    hostel_name: isHosteller ? text(values.hostel_name) : null,
    is_aided: isHosteller ? values.is_aided : null,
    hostel_address: isHosteller ? text(values.hostel_address) : null,
    admission_date: isHosteller ? date(values.admission_date) : null,
    mess_available: isHosteller ? values.mess_available : null,
    rent_per_month: isHosteller ? num(values.rent_per_month) : null,
    certificate_document_id: isHosteller ? certificateDocumentId : null,
  });
}

/* -------------------------------------------------------------------------- */
/* Completeness                                                               */
/* -------------------------------------------------------------------------- */

export async function fetchCompleteness(): Promise<ServiceResult<ProfileCompleteness>> {
  const client = requireClient();

  const { data, error } = await client.rpc('applicant_profile_completeness');

  if (error) {
    return { ok: false, error: messageFromError(error, 'Could not calculate profile completeness.') };
  }

  if (!data || typeof data !== 'object') {
    return { ok: true, data: EMPTY_PROFILE_COMPLETENESS };
  }

  const raw = data as Partial<ProfileCompleteness>;
  const sections = (raw.sections ?? {}) as Record<string, number>;

  return {
    ok: true,
    data: {
      overall: clampPercent(raw.overall),
      status: raw.status === 'complete' ? 'complete' : 'incomplete',
      complete_sections: Number(raw.complete_sections ?? 0),
      section_count: Number(raw.section_count ?? 6),
      sections: {
        personal: clampPercent(sections.personal),
        address: clampPercent(sections.address),
        other: clampPercent(sections.other),
        current_course: clampPercent(sections.current_course),
        past_qualification: clampPercent(sections.past_qualification),
        hostel: clampPercent(sections.hostel),
      },
      missing: Array.isArray(raw.missing) ? raw.missing : [],
    },
  };
}

function clampPercent(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, Math.round(parsed)));
}

/** Ask the database to refresh the cached percentage on the profile row. */
export async function refreshCachedCompleteness(): Promise<void> {
  const client = requireClient();
  await client.rpc('refresh_applicant_completeness');
}