/**
 * Section 3 — Other Information (parents and guardian).
 *
 * Every question is a tri-state Yes/No. A deceased parent's block is not shown,
 * and its columns are written as NULL rather than left stale, so switching an
 * answer from Yes to No actually clears the data instead of leaving it in the
 * database to be picked up by a scheme's eligibility query.
 */

import { FORM_GRID_CLASS, Fieldset, TextField, YesNoField } from '../ProfileFields';
import type { OtherInfoFormValues } from '../../../types/profile';

export interface OtherInfoSectionProps {
  values: OtherInfoFormValues;
  onChange: (patch: Partial<OtherInfoFormValues>) => void;
  errors: Record<string, string>;
}

export function OtherInfoSection({ values, onChange, errors }: OtherInfoSectionProps) {
  return (
    <div className="space-y-6">
      <Fieldset legend="Father">
        <div className={FORM_GRID_CLASS}>
          <YesNoField
            error={errors.father_alive}
            label="Is the applicant's father alive?"
            onChange={(value) =>
              onChange({ father_alive: value, father_name: '', father_occupation: '', father_salaried: null })
            }
            required
            value={values.father_alive}
          />

          {values.father_alive ? (
            <>
              <TextField
                error={errors.father_name}
                label="Father's name"
                onChange={(value) => onChange({ father_name: value })}
                required
                value={values.father_name}
              />
              <TextField
                error={errors.father_occupation}
                label="Father's occupation"
                onChange={(value) => onChange({ father_occupation: value })}
                required
                value={values.father_occupation}
              />
              <YesNoField
                error={errors.father_salaried}
                label="Is the father salaried?"
                onChange={(value) => onChange({ father_salaried: value })}
                required
                value={values.father_salaried}
              />
            </>
          ) : null}
        </div>
      </Fieldset>

      <Fieldset legend="Mother">
        <div className={FORM_GRID_CLASS}>
          <YesNoField
            error={errors.mother_alive}
            label="Is the applicant's mother alive?"
            onChange={(value) =>
              onChange({ mother_alive: value, mother_name: '', mother_occupation: '', mother_salaried: null })
            }
            required
            value={values.mother_alive}
          />

          {values.mother_alive ? (
            <>
              <TextField
                error={errors.mother_name}
                label="Mother's name"
                onChange={(value) => onChange({ mother_name: value })}
                required
                value={values.mother_name}
              />
              <TextField
                error={errors.mother_occupation}
                label="Mother's occupation"
                onChange={(value) => onChange({ mother_occupation: value })}
                required
                value={values.mother_occupation}
              />
              <YesNoField
                error={errors.mother_salaried}
                label="Is the mother salaried?"
                onChange={(value) => onChange({ mother_salaried: value })}
                required
                value={values.mother_salaried}
              />
            </>
          ) : null}
        </div>
      </Fieldset>

      <Fieldset
        description="Answer Yes if the applicant is a minor, or if no parent is alive or able to act as guardian."
        legend="Guardian"
      >
        <div className={FORM_GRID_CLASS}>
          <YesNoField
            error={errors.guardian_required}
            label="Is a guardian required for this applicant?"
            onChange={(value) => onChange({ guardian_required: value })}
            required
            value={values.guardian_required}
          />

          {values.guardian_required ? (
            <>
              <TextField
                error={errors.guardian_name}
                label="Guardian's name"
                onChange={(value) => onChange({ guardian_name: value })}
                required
                value={values.guardian_name}
              />
              <TextField
                error={errors.guardian_relationship}
                label="Relationship with the applicant"
                onChange={(value) => onChange({ guardian_relationship: value })}
                placeholder="e.g. Grandmother, Uncle"
                required
                value={values.guardian_relationship}
              />
              <TextField
                error={errors.guardian_occupation}
                label="Guardian's occupation"
                onChange={(value) => onChange({ guardian_occupation: value })}
                required
                value={values.guardian_occupation}
              />
              <TextField
                error={errors.guardian_mobile}
                inputMode="tel"
                label="Guardian's mobile"
                maxLength={10}
                onChange={(value) => onChange({ guardian_mobile: value.replace(/\D/g, '').slice(0, 10) })}
                required
                value={values.guardian_mobile}
              />
            </>
          ) : null}
        </div>
      </Fieldset>
    </div>
  );
}
