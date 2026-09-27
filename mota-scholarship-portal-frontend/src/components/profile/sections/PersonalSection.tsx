/**
 * Section 1 — Personal Information (complete).
 *
 * All personal information fields from the profile form:
 * - Full Name
 * - Email
 * - Mobile Number
 * - Date of Birth
 * - Gender
 * - Religion
 * - Marital Status
 * - Name as per marksheet
 * - Parent/guardian mobile
 * - Aadhaar number (write-only)
 * - Maharashtra domicile
 * - Domicile certificate
 * - Family annual income
 * - Income certificate
 * - Salaried status
 * - Disability status
 * - Siblings count
 * - Caste category
 * - Caste
 * - Caste certificate
 * - Bank details
 */

import {
  FORM_GRID_CLASS,
  Fieldset,
  SelectField,
  TextField,
  YesNoField,
  MaskedSecretField,
} from '../ProfileFields';
import { GENDER_OPTIONS, MARITAL_STATUS_OPTIONS, CERTIFICATE_SOURCE_OPTIONS, ACCOUNT_TYPE_OPTIONS } from '../../../lib/profileValidation';
import type { ProfileFormValues, ProfileMasterData } from '../../../types/profile';

export interface PersonalSectionProps {
  values: ProfileFormValues;
  onChange: (patch: Partial<ProfileFormValues>) => void;
  errors: Record<string, string>;
  master: ProfileMasterData;
}

export function PersonalSection({
  values,
  onChange,
  errors,
  master,
}: PersonalSectionProps) {
  const genderOptions = GENDER_OPTIONS.map((option) => ({ value: option, label: option }));
  const maritalStatusOptions = MARITAL_STATUS_OPTIONS.map((option) => ({ value: option, label: option }));
  const certificateSourceOptions = CERTIFICATE_SOURCE_OPTIONS.map((option) => ({ value: option, label: option }));
  const accountTypeOptions = ACCOUNT_TYPE_OPTIONS.map((option) => ({ value: option, label: option }));
  const casteCategoryOptions = master.casteCategories.map((category) => ({ value: category, label: category }));

  return (
    <div className="space-y-6">
      <Fieldset legend="Personal Information">
        <div className={FORM_GRID_CLASS}>
          <TextField
            autoComplete="name"
            error={errors.full_name}
            label="Full name"
            onChange={(value) => onChange({ full_name: value })}
            required
            value={values.full_name}
          />
          <TextField
            autoComplete="email"
            error={errors.email}
            inputMode="email"
            label="Email ID"
            onChange={(value) => onChange({ email: value })}
            required
            value={values.email}
          />
          <TextField
            error={errors.mobile_number}
            inputMode="tel"
            label="Mobile number"
            maxLength={10}
            onChange={(value) => onChange({ mobile_number: value.replace(/\D/g, '').slice(0, 10) })}
            placeholder="10-digit mobile number"
            required
            value={values.mobile_number}
          />
          <TextField
            error={errors.date_of_birth}
            label="Date of birth"
            onChange={(value) => onChange({ date_of_birth: value })}
            required
            type="date"
            value={values.date_of_birth}
          />
          <SelectField
            error={errors.gender}
            label="Gender"
            onChange={(value) => onChange({ gender: value })}
            options={genderOptions}
            required
            value={values.gender}
          />
          <SelectField
            error={errors.religion}
            label="Religion"
            onChange={(value) => onChange({ religion: value })}
            options={master.religions.map((r) => ({ value: r.name, label: r.name }))}
            placeholder="Select religion"
            required
            value={values.religion}
          />
          <SelectField
            error={errors.marital_status}
            label="Marital status"
            onChange={(value) => onChange({ marital_status: value })}
            options={maritalStatusOptions}
            required
            value={values.marital_status}
          />
          <TextField
            error={errors.applicant_full_name_as_per_marksheet}
            label="Name as per marksheet"
            onChange={(value) => onChange({ applicant_full_name_as_per_marksheet: value })}
            required
            value={values.applicant_full_name_as_per_marksheet}
          />
          <TextField
            error={errors.parent_guardian_mobile}
            inputMode="tel"
            label="Parent/guardian mobile"
            maxLength={10}
            onChange={(value) => onChange({ parent_guardian_mobile: value.replace(/\D/g, '').slice(0, 10) })}
            placeholder="10-digit mobile number"
            required
            value={values.parent_guardian_mobile}
          />
        </div>
      </Fieldset>

      <Fieldset legend="Aadhaar (write-only — never displayed in full)">
        <div className={FORM_GRID_CLASS}>
          <MaskedSecretField
            error={errors.aadhaar}
            hint="12 digits. Stored as masked value (XXXX XXXX 1234) and fingerprint only."
            label="Aadhaar number"
            onChange={(value) => onChange({ aadhaar: value.replace(/\D/g, '').slice(0, 12) })}
            placeholder="Enter to save securely"
            required={!values.aadhaar_last4}
            storedMask={values.aadhaar_last4 ? `XXXX XXXX ${values.aadhaar_last4}` : null}
            maxLength={12}
            inputMode="numeric"
            value={values.aadhaar}
          />
        </div>
      </Fieldset>

      <Fieldset legend="Domicile">
        <div className={FORM_GRID_CLASS}>
          <YesNoField
            error={errors.is_maharashtra_domicile}
            label="Do you have Maharashtra domicile?"
            onChange={(value) => onChange({ is_maharashtra_domicile: value, has_domicile_certificate: null })}
            required
            value={values.is_maharashtra_domicile}
          />
          {values.is_maharashtra_domicile ? (
            <>
              <YesNoField
                error={errors.has_domicile_certificate}
                label="Do you have a domicile certificate?"
                onChange={(value) => onChange({ has_domicile_certificate: value })}
                required
                value={values.has_domicile_certificate}
              />
              {values.has_domicile_certificate && (
                <>
                  <SelectField
                    allowCustom
                    error={errors.domicile_certificate_source}
                    label="Certificate source"
                    onChange={(value) => onChange({ domicile_certificate_source: value })}
                    options={certificateSourceOptions}
                    required
                    value={values.domicile_certificate_source}
                  />
                  <TextField
                    error={errors.domicile_certificate_holder_name}
                    label="Certificate holder name"
                    onChange={(value) => onChange({ domicile_certificate_holder_name: value })}
                    required
                    value={values.domicile_certificate_holder_name}
                  />
                  <TextField
                    error={errors.domicile_certificate_number}
                    label="Certificate number"
                    onChange={(value) => onChange({ domicile_certificate_number: value })}
                    required
                    value={values.domicile_certificate_number}
                  />
                  <TextField
                    error={errors.domicile_issuing_authority}
                    label="Issuing authority"
                    onChange={(value) => onChange({ domicile_issuing_authority: value })}
                    required
                    value={values.domicile_issuing_authority}
                  />
                  <TextField
                    error={errors.domicile_date_of_issue}
                    label="Date of issue"
                    onChange={(value) => onChange({ domicile_date_of_issue: value })}
                    required
                    type="date"
                    value={values.domicile_date_of_issue}
                  />
                </>
              )}
            </>
          ) : null}
        </div>
      </Fieldset>

      <Fieldset legend="Family Income">
        <div className={FORM_GRID_CLASS}>
          <TextField
            error={errors.annual_income}
            hint="Annual family income in rupees."
            inputMode="numeric"
            label="Family annual income (₹)"
            onChange={(value) => onChange({ annual_income: value.replace(/[^\d]/g, '') })}
            required
            value={values.annual_income}
          />
          <YesNoField
            error={errors.has_income_certificate}
            label="Do you have an income certificate?"
            onChange={(value) => onChange({ has_income_certificate: value })}
            required
            value={values.has_income_certificate}
          />
          {values.has_income_certificate && (
            <>
              <SelectField
                allowCustom
                error={errors.income_certificate_source}
                label="Certificate source"
                onChange={(value) => onChange({ income_certificate_source: value })}
                options={certificateSourceOptions}
                required
                value={values.income_certificate_source}
              />
              <TextField
                error={errors.income_certificate_number}
                label="Certificate number"
                onChange={(value) => onChange({ income_certificate_number: value })}
                required
                value={values.income_certificate_number}
              />
              <TextField
                error={errors.income_certificate_date}
                label="Certificate date"
                onChange={(value) => onChange({ income_certificate_date: value })}
                required
                type="date"
                value={values.income_certificate_date}
              />
              <TextField
                error={errors.income_issuing_authority}
                label="Issuing authority"
                onChange={(value) => onChange({ income_issuing_authority: value })}
                required
                value={values.income_issuing_authority}
              />
              <TextField
                error={errors.income_barcode}
                label="Barcode (if any)"
                onChange={(value) => onChange({ income_barcode: value })}
                value={values.income_barcode}
              />
            </>
          )}
        </div>
      </Fieldset>

      <Fieldset legend="Employment">
        <div className={FORM_GRID_CLASS}>
          <YesNoField
            error={errors.is_salaried}
            label="Are you salaried?"
            onChange={(value) => onChange({ is_salaried: value, job_type: '' })}
            required
            value={values.is_salaried}
          />
          {values.is_salaried && (
            <TextField
              error={errors.job_type}
              label="Job type"
              onChange={(value) => onChange({ job_type: value })}
              required
              value={values.job_type}
            />
          )}
        </div>
      </Fieldset>

      <Fieldset legend="Disability">
        <div className={FORM_GRID_CLASS}>
          <YesNoField
            error={errors.is_disabled}
            label="Do you have a disability?"
            onChange={(value) => onChange({ is_disabled: value, disability_type: '', has_disability_certificate: null })}
            required
            value={values.is_disabled}
          />
          {values.is_disabled && (
            <>
              <TextField
                error={errors.disability_type}
                label="Disability type"
                onChange={(value) => onChange({ disability_type: value })}
                required
                value={values.disability_type}
              />
              <YesNoField
                error={errors.has_disability_certificate}
                label="Do you have a disability certificate?"
                onChange={(value) => onChange({ has_disability_certificate: value })}
                required
                value={values.has_disability_certificate}
              />
              {values.has_disability_certificate && (
                <TextField
                  error={errors.disability_certificate_number}
                  label="Certificate number"
                  onChange={(value) => onChange({ disability_certificate_number: value })}
                  required
                  value={values.disability_certificate_number}
                />
              )}
            </>
          )}
        </div>
      </Fieldset>

      <Fieldset legend="Siblings">
        <div className={FORM_GRID_CLASS}>
          <TextField
            error={errors.siblings_count}
            inputMode="numeric"
            label="Number of siblings"
            maxLength={2}
            onChange={(value) => onChange({ siblings_count: value.replace(/\D/g, '').slice(0, 2) })}
            required
            value={values.siblings_count}
          />
        </div>
      </Fieldset>

      <Fieldset legend="Caste / Category">
        <div className={FORM_GRID_CLASS}>
          <SelectField
            allowCustom
            error={errors.category}
            label="Category"
            onChange={(value) => onChange({ category: value })}
            options={casteCategoryOptions}
            placeholder="Select category"
            required
            value={values.category}
          />
          <TextField
            error={errors.caste}
            label="Caste"
            onChange={(value) => onChange({ caste: value })}
            required
            value={values.caste}
          />
          <TextField
            error={errors.sub_caste}
            label="Sub-caste"
            onChange={(value) => onChange({ sub_caste: value })}
            value={values.sub_caste}
          />
          <YesNoField
            error={errors.has_caste_certificate}
            label="Do you have a caste certificate?"
            onChange={(value) => onChange({ has_caste_certificate: value })}
            required
            value={values.has_caste_certificate}
          />
          {values.has_caste_certificate && (
            <>
              <SelectField
                allowCustom
                error={errors.caste_certificate_source}
                label="Certificate source"
                onChange={(value) => onChange({ caste_certificate_source: value })}
                options={certificateSourceOptions}
                required
                value={values.caste_certificate_source}
              />
              <TextField
                error={errors.caste_certificate_holder_name}
                label="Certificate holder name"
                onChange={(value) => onChange({ caste_certificate_holder_name: value })}
                required
                value={values.caste_certificate_holder_name}
              />
              <TextField
                error={errors.caste_certificate_number}
                label="Certificate number"
                onChange={(value) => onChange({ caste_certificate_number: value })}
                required
                value={values.caste_certificate_number}
              />
              <TextField
                error={errors.caste_issuing_authority}
                label="Issuing authority"
                onChange={(value) => onChange({ caste_issuing_authority: value })}
                required
                value={values.caste_issuing_authority}
              />
              <TextField
                error={errors.caste_date_of_issue}
                label="Date of issue"
                onChange={(value) => onChange({ caste_date_of_issue: value })}
                required
                type="date"
                value={values.caste_date_of_issue}
              />
            </>
          )}
        </div>
      </Fieldset>

      <Fieldset legend="Bank Account">
        <div className={FORM_GRID_CLASS}>
          <TextField
            error={errors.bank_name}
            label="Bank name"
            onChange={(value) => onChange({ bank_name: value })}
            required
            value={values.bank_name}
          />
          <TextField
            error={errors.account_holder_name}
            label="Account holder name"
            onChange={(value) => onChange({ account_holder_name: value })}
            required
            value={values.account_holder_name}
          />
          <MaskedSecretField
            error={errors.account_number}
            hint="6–20 digits. Stored encrypted; only last 4 digits shown."
            label="Bank account number"
            onChange={(value) => onChange({ account_number: value.replace(/\D/g, '') })}
            placeholder="Enter to save securely"
            required={!values.account_number_last4}
            storedMask={values.account_number_last4 ? `•••• ${values.account_number_last4}` : null}
            maxLength={20}
            inputMode="numeric"
            value={values.account_number}
          />
          <TextField
            error={errors.ifsc_code}
            label="IFSC code"
            onChange={(value) => onChange({ ifsc_code: value.toUpperCase() })}
            maxLength={11}
            required
            value={values.ifsc_code}
          />
          <TextField
            error={errors.branch_name}
            label="Branch name"
            onChange={(value) => onChange({ branch_name: value })}
            required
            value={values.branch_name}
          />
          <SelectField
            error={errors.account_type}
            label="Account type"
            onChange={(value) => onChange({ account_type: value })}
            options={accountTypeOptions}
            required
            value={values.account_type}
          />
          <YesNoField
            error={errors.aadhaar_linked}
            label="Is Aadhaar linked?"
            onChange={(value) => onChange({ aadhaar_linked: value })}
            required
            value={values.aadhaar_linked}
          />
        </div>
      </Fieldset>
    </div>
  );
}