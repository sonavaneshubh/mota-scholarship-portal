/**
 * Section 6 — Hostel Details.
 *
 * "Beneficiary category" is the gate. A day scholar is not a hostel beneficiary, so
 * the whole hostel block is hidden for them and the corresponding columns are
 * written as NULL on save. That is what keeps the conditional completeness rules
 * honest: the hostel section is complete the moment the category is answered,
 * and the location questions only become required for someone who actually stays
 * in a hostel.
 */

import { FORM_GRID_CLASS, Fieldset, SelectField, TextAreaField, TextField, YesNoField } from '../ProfileFields';
import { BENEFICIARY_CATEGORY_OPTIONS, HOSTEL_TYPE_OPTIONS } from '../../../lib/profileValidation';
import type { HostelFormValues, ProfileMasterData } from '../../../types/profile';
import type { ApplicantDocumentRecord } from '../../../types/profile';
import { DocumentUploadField } from '../DocumentUploadField';

export interface HostelSectionProps {
  values: HostelFormValues;
  onChange: (patch: Partial<HostelFormValues>) => void;
  errors: Record<string, string>;
  master: ProfileMasterData;
  applicantId: string;
  certificate: ApplicantDocumentRecord | null;
  onCertificateChange: (document: ApplicantDocumentRecord | null) => void;
  onUploadBusyChange: (busy: boolean) => void;
}

export function HostelSection({
  values,
  onChange,
  errors,
  master,
  applicantId,
  certificate,
  onCertificateChange,
  onUploadBusyChange,
}: HostelSectionProps) {
  const isHosteller = values.beneficiary_category.trim().toLowerCase() === 'hosteller';
  const stateOptions = master.states.map((row) => ({ value: row.name, label: row.name }));

  return (
    <div className="space-y-6">
      <Fieldset
        description="Hostel details are only relevant if you live in a hostel. Answer the category question first."
        legend="Beneficiary category"
      >
        <div className={FORM_GRID_CLASS}>
          <SelectField
            error={errors.beneficiary_category}
            label="Beneficiary category"
            onChange={(value) => onChange({ beneficiary_category: value })}
            options={BENEFICIARY_CATEGORY_OPTIONS.map((option) => ({ value: option, label: option }))}
            required
            value={values.beneficiary_category}
          />
        </div>
      </Fieldset>

      {isHosteller ? (
        <>
          <Fieldset legend="Hostel location">
            <div className={FORM_GRID_CLASS}>
              <SelectField
                allowCustom
                error={errors.state}
                label="State"
                onChange={(value) => onChange({ state: value })}
                options={stateOptions}
                required
                value={values.state}
              />
              <SelectField
                allowCustom
                error={errors.district}
                label="District"
                onChange={(value) => onChange({ district: value })}
                options={[]}
                placeholder="Type or select"
                required
                value={values.district}
              />
              <SelectField
                allowCustom
                error={errors.taluka}
                label="Taluka / block"
                onChange={(value) => onChange({ taluka: value })}
                options={[]}
                placeholder="Type or select"
                required
                value={values.taluka}
              />
            </div>
          </Fieldset>

          <Fieldset legend="Hostel">
            <div className={FORM_GRID_CLASS}>
              <SelectField
                allowCustom
                className="sm:col-span-2 lg:col-span-3"
                error={errors.hostel_name}
                label="Hostel name"
                onChange={(value) => onChange({ hostel_name: value })}
                options={[]}
                placeholder="Type or select"
                required
                value={values.hostel_name}
              />
              <SelectField
                allowCustom
                error={errors.hostel_type}
                label="Hostel type"
                onChange={(value) => onChange({ hostel_type: value })}
                options={HOSTEL_TYPE_OPTIONS.map((option) => ({ value: option, label: option }))}
                required
                value={values.hostel_type}
              />
              <YesNoField
                error={errors.is_aided}
                label="Is the hostel aided?"
                onChange={(value) => onChange({ is_aided: value })}
                required
                value={values.is_aided}
              />
              <TextField
                error={errors.admission_date}
                label="Hostel admission date"
                onChange={(value) => onChange({ admission_date: value })}
                required
                type="date"
                value={values.admission_date}
              />
            </div>

            <TextAreaField
              error={errors.hostel_address}
              label="Hostel address"
              onChange={(value) => onChange({ hostel_address: value })}
              required
              value={values.hostel_address}
            />
          </Fieldset>

          <Fieldset legend="Mess and rent">
            <div className={FORM_GRID_CLASS}>
              <YesNoField
                error={errors.mess_available}
                label="Is a mess available at the hostel?"
                onChange={(value) => onChange({ mess_available: value })}
                required
                value={values.mess_available}
              />
              <TextField
                error={errors.rent_per_month}
                hint="Leave blank if the hostel charges nothing."
                inputMode="decimal"
                label="Rent per month (Rs.)"
                onChange={(value) => onChange({ rent_per_month: value.replace(/[^\d.]/g, '') })}
                required
                value={values.rent_per_month}
              />
            </div>

            <DocumentUploadField
              applicantId={applicantId}
              document={certificate}
              documentCode="hostel_certificate"
              error={errors.certificate_document}
              hint="Hostel admission letter or allotment order."
              label="Hostel admission certificate"
              onBusyChange={onUploadBusyChange}
              onChange={onCertificateChange}
            />
          </Fieldset>
        </>
      ) : null}
    </div>
  );
}
