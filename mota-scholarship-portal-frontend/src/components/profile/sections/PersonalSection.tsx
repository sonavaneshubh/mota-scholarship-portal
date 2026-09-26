/**
 * Section 1 — Personal Information.
 *
 * Spans seven tables (the applicant anchor row plus domicile, income,
 * employment/disability, caste and bank details) because that is how the data is
 * normalised, but it is presented to the applicant as one coherent form with one
 * Save button. The two sensitive values — Aadhaar and account number — are
 * routed to their SECURITY DEFINER writers and are never part of a column
 * payload.
 */

import {
  FORM_GRID_CLASS,
  Fieldset,
  MaskedSecretField,
  SelectField,
  TextField,
  YesNoField,
} from '../ProfileFields';
import { DocumentUploadField } from '../DocumentUploadField';
import {
  ACCOUNT_TYPE_OPTIONS,
  CERTIFICATE_SOURCE_OPTIONS,
  GENDER_OPTIONS,
  MARITAL_STATUS_OPTIONS,
} from '../../../lib/profileValidation';
import type { ApplicantDocumentRecord, ProfileFormValues, ProfileMasterData } from '../../../types/profile';

export type CertificateSlot = 'domicile' | 'income' | 'caste' | 'disability';

export interface PersonalSectionProps {
  values: ProfileFormValues;
  onChange: (patch: Partial<ProfileFormValues>) => void;
  errors: Record<string, string>;
  master: ProfileMasterData;
  certificates: Record<CertificateSlot, ApplicantDocumentRecord | null>;
  onCertificateChange: (slot: CertificateSlot, document: ApplicantDocumentRecord | null) => void;
  onUploadBusyChange: (busy: boolean) => void;
  applicantId: string;
  aadhaarMask: string | null;
  accountMask: string | null;
}

export function PersonalSection({
  values,
  onChange,
  errors,
  master,
  certificates,
  onCertificateChange,
  onUploadBusyChange,
  applicantId,
  aadhaarMask,
  accountMask,
}: PersonalSectionProps) {
  const genderOptions = GENDER_OPTIONS.map((option) => ({ value: option, label: option }));
  const maritalOptions = MARITAL_STATUS_OPTIONS.map((option) => ({ value: option, label: option }));
  const sourceOptions = CERTIFICATE_SOURCE_OPTIONS.map((option) => ({ value: option, label: option }));

  return (
    <div className="space-y-6">
      <Fieldset legend="Identity and contact">
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
            autoComplete="name"
            error={errors.applicant_full_name_as_per_marksheet}
            hint="Exactly as printed on your marksheet. This is the name certificates are verified against."
            label="Name as per marksheet"
            onChange={(value) => onChange({ applicant_full_name_as_per_marksheet: value })}
            required
            value={values.applicant_full_name_as_per_marksheet}
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
            autoComplete="email"
            error={errors.email}
            inputMode="email"
            label="Email ID"
            onChange={(value) => onChange({ email: value })}
            required
            value={values.email}
          />
          <TextField
            error={errors.parent_guardian_mobile}
            inputMode="tel"
            label="Parent / guardian mobile"
            maxLength={10}
            onChange={(value) => onChange({ parent_guardian_mobile: value.replace(/\D/g, '').slice(0, 10) })}
            required
            value={values.parent_guardian_mobile}
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
            allowCustom
            error={errors.religion}
            label="Religion"
            onChange={(value) => onChange({ religion: value })}
            options={master.religions.map((row) => ({ value: row.name, label: row.name }))}
            required
            value={values.religion}
          />
          <SelectField
            error={errors.marital_status}
            label="Marital status"
            onChange={(value) => onChange({ marital_status: value })}
            options={maritalOptions}
            required
            value={values.marital_status}
          />
        </div>
      </Fieldset>

      <Fieldset
        description="Your Aadhaar is sent once to an encrypted writer, then discarded. Only a masked value and the last four digits are kept, so it cannot be read back or leaked from a backup."
        legend="Aadhaar identification"
      >
        <div className={FORM_GRID_CLASS}>
          <MaskedSecretField
            error={errors.aadhaar}
            hint="Enter the 12-digit Aadhaar of the applicant."
            inputMode="numeric"
            label="Aadhaar number"
            maxLength={14}
            onChange={(value) => onChange({ aadhaar: value })}
            required
            storedMask={aadhaarMask}
            value={values.aadhaar}
          />
        </div>
      </Fieldset>

      <Fieldset legend="Domicile">
        <div className={FORM_GRID_CLASS}>
          <YesNoField
            error={errors.is_maharashtra_domicile}
            hint="Domicile is what makes you eligible for Maharashtra state scholarship schemes."
            label="Are you a domiciled resident of Maharashtra?"
            onChange={(value) => onChange({ is_maharashtra_domicile: value })}
            required
            value={values.is_maharashtra_domicile}
          />
        </div>

        {values.is_maharashtra_domicile ? (
          <div className="space-y-3">
            <div className={FORM_GRID_CLASS}>
              <YesNoField
                error={errors.has_domicile_certificate}
                label="Do you hold a domicile certificate?"
                onChange={(value) => onChange({ has_domicile_certificate: value })}
                required
                value={values.has_domicile_certificate}
              />
              {values.has_domicile_certificate ? (
                <>
                  <SelectField
                    allowCustom
                    label="Certificate obtained through"
                    onChange={(value) => onChange({ domicile_certificate_source: value })}
                    options={sourceOptions}
                    value={values.domicile_certificate_source}
                  />
                  <TextField
                    error={errors.domicile_certificate_number}
                    label="Domicile certificate number"
                    onChange={(value) => onChange({ domicile_certificate_number: value })}
                    required
                    value={values.domicile_certificate_number}
                  />
                  <TextField
                    error={errors.domicile_certificate_holder_name}
                    label="Name on the certificate"
                    onChange={(value) => onChange({ domicile_certificate_holder_name: value })}
                    required
                    value={values.domicile_certificate_holder_name}
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
              ) : null}
            </div>

            {values.has_domicile_certificate ? (
              <DocumentUploadField
                applicantId={applicantId}
                document={certificates.domicile}
                documentCode="domicile_certificate"
                error={errors.domicile_document}
                label="Domicile certificate"
                onBusyChange={onUploadBusyChange}
                onChange={(document) => onCertificateChange('domicile', document)}
              />
            ) : null}
          </div>
        ) : null}
      </Fieldset>

      <Fieldset legend="Family income">
        <div className={FORM_GRID_CLASS}>
          <TextField
            error={errors.annual_income}
            hint="Total annual income of the family, in rupees."
            inputMode="decimal"
            label="Family annual income"
            onChange={(value) => onChange({ annual_income: value.replace(/[^\d.]/g, '') })}
            placeholder="e.g. 250000"
            required
            value={values.annual_income}
          />
          <YesNoField
            error={errors.has_income_certificate}
            label="Do you hold an income certificate?"
            onChange={(value) => onChange({ has_income_certificate: value })}
            required
            value={values.has_income_certificate}
          />
        </div>

        {values.has_income_certificate ? (
          <div className="space-y-3">
            <div className={FORM_GRID_CLASS}>
              <SelectField
                allowCustom
                label="Certificate obtained through"
                onChange={(value) => onChange({ income_certificate_source: value })}
                options={sourceOptions}
                value={values.income_certificate_source}
              />
              <TextField
                error={errors.income_certificate_number}
                label="Income certificate number"
                onChange={(value) => onChange({ income_certificate_number: value })}
                required
                value={values.income_certificate_number}
              />
              <TextField
                error={errors.income_issuing_authority}
                label="Issuing authority"
                onChange={(value) => onChange({ income_issuing_authority: value })}
                required
                value={values.income_issuing_authority}
              />
              <TextField
                error={errors.income_certificate_date}
                label="Date of issue"
                onChange={(value) => onChange({ income_certificate_date: value })}
                required
                type="date"
                value={values.income_certificate_date}
              />
              <TextField
                hint="Printed on the Aaple Sarkar income certificate, if present."
                label="Certificate barcode / reference"
                onChange={(value) => onChange({ income_barcode: value })}
                value={values.income_barcode}
              />
            </div>
            <DocumentUploadField
              applicantId={applicantId}
              document={certificates.income}
              documentCode="income_certificate"
              error={errors.income_document}
              label="Income certificate"
              onBusyChange={onUploadBusyChange}
              onChange={(document) => onCertificateChange('income', document)}
            />
          </div>
        ) : null}
      </Fieldset>

      <Fieldset legend="Employment and disability">
        <div className={FORM_GRID_CLASS}>
          <YesNoField
            error={errors.is_salaried}
            label="Are you currently salaried?"
            onChange={(value) => onChange({ is_salaried: value })}
            required
            value={values.is_salaried}
          />
          {values.is_salaried ? (
            <TextField
              error={errors.job_type}
              label="Job type"
              onChange={(value) => onChange({ job_type: value })}
              placeholder="e.g. Full-time, Part-time, Self-employed"
              required
              value={values.job_type}
            />
          ) : null}

          <YesNoField
            error={errors.is_disabled}
            label="Do you have a disability under the Rights of Persons with Disabilities Act?"
            onChange={(value) => onChange({ is_disabled: value })}
            required
            value={values.is_disabled}
          />
          {values.is_disabled ? (
            <SelectField
              allowCustom
              error={errors.disability_type}
              label="Disability type"
              onChange={(value) => onChange({ disability_type: value })}
              options={master.disabilityTypes.map((row) => ({ value: row, label: row }))}
              required
              value={values.disability_type}
            />
          ) : null}
          {values.is_disabled ? (
            <YesNoField
              error={errors.has_disability_certificate}
              label="Do you hold a disability certificate?"
              onChange={(value) => onChange({ has_disability_certificate: value })}
              required
              value={values.has_disability_certificate}
            />
          ) : null}
          {values.is_disabled && values.has_disability_certificate ? (
            <TextField
              error={errors.disability_certificate_number}
              label="Disability certificate number"
              onChange={(value) => onChange({ disability_certificate_number: value })}
              required
              value={values.disability_certificate_number}
            />
          ) : null}
          {values.is_disabled && values.has_disability_certificate ? (
            <DocumentUploadField
              applicantId={applicantId}
              document={certificates.disability}
              documentCode="disability_certificate"
              error={errors.disability_document}
              label="Disability certificate"
              onBusyChange={onUploadBusyChange}
              onChange={(document) => onCertificateChange('disability', document)}
            />
          ) : null}

          <TextField
            error={errors.siblings_count}
            hint="Include yourself. Enter 0 if you are the only child."
            inputMode="numeric"
            label="Number of siblings"
            maxLength={2}
            onChange={(value) => onChange({ siblings_count: value.replace(/\D/g, '').slice(0, 2) })}
            required
            value={values.siblings_count}
          />
        </div>
      </Fieldset>

      <Fieldset legend="Caste category">
        <div className={FORM_GRID_CLASS}>
          <SelectField
            allowCustom
            error={errors.category}
            label="Category"
            onChange={(value) => onChange({ category: value })}
            options={master.casteCategories.map((category) => ({ value: category, label: category }))}
            placeholder="Select category"
            required
            value={values.category}
          />
          <SelectField
            allowCustom
            error={errors.caste}
            hint="No caste list is pre-loaded, because the list is notified by the government. Type your community name."
            label="Caste / community"
            onChange={(value) => onChange({ caste: value })}
            options={[]}
            placeholder="Type or select"
            required
            value={values.caste}
          />
          <TextField
            label="Sub-caste / jati (optional)"
            onChange={(value) => onChange({ sub_caste: value })}
            value={values.sub_caste}
          />
          <YesNoField
            error={errors.has_caste_certificate}
            label="Do you hold a caste certificate?"
            onChange={(value) => onChange({ has_caste_certificate: value })}
            required
            value={values.has_caste_certificate}
          />
        </div>

        {values.has_caste_certificate ? (
          <div className="space-y-3">
            <div className={FORM_GRID_CLASS}>
              <SelectField
                allowCustom
                label="Certificate obtained through"
                onChange={(value) => onChange({ caste_certificate_source: value })}
                options={sourceOptions}
                value={values.caste_certificate_source}
              />
              <TextField
                error={errors.caste_certificate_number}
                label="Caste certificate number"
                onChange={(value) => onChange({ caste_certificate_number: value })}
                required
                value={values.caste_certificate_number}
              />
              <TextField
                error={errors.caste_certificate_holder_name}
                label="Name on the certificate"
                onChange={(value) => onChange({ caste_certificate_holder_name: value })}
                required
                value={values.caste_certificate_holder_name}
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
            </div>
            <DocumentUploadField
              applicantId={applicantId}
              document={certificates.caste}
              documentCode="caste_certificate"
              error={errors.caste_document}
              label="Caste certificate"
              onBusyChange={onUploadBusyChange}
              onChange={(document) => onCertificateChange('caste', document)}
            />
          </div>
        ) : null}
      </Fieldset>

      <Fieldset
        description="The account number is sent once to an encrypted writer and is never stored in plain text. Only its last four digits are kept for your reference."
        legend="Bank account for scholarship disbursement"
      >
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
            hint="6 to 20 digits. Leave blank to keep the saved number."
            inputMode="numeric"
            label="Account number"
            maxLength={20}
            onChange={(value) => onChange({ account_number: value.replace(/\D/g, '').slice(0, 20) })}
            required
            storedMask={accountMask}
            value={values.account_number}
          />
          <TextField
            error={errors.ifsc_code}
            hint="11 characters, for example HDFC0001234."
            label="IFSC code"
            maxLength={11}
            onChange={(value) => onChange({ ifsc_code: value.toUpperCase().replace(/\s/g, '').slice(0, 11) })}
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
            options={ACCOUNT_TYPE_OPTIONS.map((option) => ({ value: option, label: option }))}
            required
            value={values.account_type}
          />
          <YesNoField
            error={errors.aadhaar_linked}
            hint="Aaple Sarkar requires the applicant's own Aadhaar-seeded account for direct benefit transfer."
            label="Is this account linked to your Aadhaar?"
            onChange={(value) => onChange({ aadhaar_linked: value })}
            required
            value={values.aadhaar_linked}
          />
        </div>
      </Fieldset>
    </div>
  );
}
