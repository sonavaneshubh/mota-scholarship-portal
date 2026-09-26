/**
 * Section 5 — Past Qualification.
 *
 * Repeatable rows rather than a fixed triple of "10th / 12th / diploma" inputs,
 * because the set of qualifications an applicant holds varies (a diploma holder
 * may have no 12th, a lateral-entry student may have both). Each row carries its
 * own stable `id` once saved, so editing one row never rewrites the others, and
 * removing a row deletes exactly that row.
 */

import { FORM_GRID_CLASS, Fieldset, SelectField, TextField } from '../ProfileFields';
import { QUALIFICATION_STATUS_OPTIONS, QUALIFICATION_TYPE_OPTIONS } from '../../../lib/profileValidation';
import { emptyQualification } from '../../../lib/profileFormMappers';
import type { QualificationFormValues } from '../../../types/profile';

export interface PastQualificationSectionProps {
  values: QualificationFormValues[];
  onChange: (values: QualificationFormValues[]) => void;
  errors: Record<string, string>;
}

export function PastQualificationSection({ values, onChange, errors }: PastQualificationSectionProps) {
  const rows = values.length > 0 ? values : [emptyQualification()];

  function patchRow(index: number, patch: Partial<QualificationFormValues>) {
    onChange(rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([...rows, emptyQualification()]);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_row, rowIndex) => rowIndex !== index));
  }

  const hasQualificationError = errors.has_qualification;

  return (
    <div className="space-y-4">
      <Fieldset
        description="Add every qualification you have completed, or are currently appearing for. Each entry needs a type, the board or university, the year of passing and the percentage."
        legend="Qualifications"
      >
        {hasQualificationError ? (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-700" role="alert">
            {hasQualificationError}
          </p>
        ) : null}

        <div className="space-y-4">
          {rows.map((row, index) => {
            const key = row.id ?? `new-${index}`;

            return (
              <div className="rounded border border-slate-200 bg-slate-50/60 p-3" key={key}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-[12px] font-bold text-gov-blue-dark">
                    Qualification {index + 1}
                    {row.id ? <span className="ml-1.5 font-normal text-emerald-700">(saved)</span> : null}
                  </h3>
                  {rows.length > 1 ? (
                    <button
                      className="rounded border border-red-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                      onClick={() => removeRow(index)}
                      type="button"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <div className={FORM_GRID_CLASS}>
                  <SelectField
                    allowCustom
                    error={errors[`qualification_type_${index + 1}`] ?? errors.qualification_type}
                    label="Qualification"
                    onChange={(value) => patchRow(index, { qualification_type: value })}
                    options={QUALIFICATION_TYPE_OPTIONS.map((option) => ({ value: option, label: option }))}
                    required
                    value={row.qualification_type}
                  />
                  <TextField
                    error={errors[`degree_${index + 1}`] ?? errors.degree}
                    label="Degree / stream"
                    onChange={(value) => patchRow(index, { degree: value })}
                    value={row.degree}
                  />
                  <TextField
                    error={errors[`board_university_${index + 1}`] ?? errors.board_university}
                    label="Board / university"
                    onChange={(value) => patchRow(index, { board_university: value })}
                    required
                    value={row.board_university}
                  />
                  <TextField
                    error={errors[`passing_year_${index + 1}`] ?? errors.passing_year}
                    inputMode="numeric"
                    label="Year of passing"
                    maxLength={4}
                    onChange={(value) => patchRow(index, { passing_year: value.replace(/\D/g, '').slice(0, 4) })}
                    required
                    value={row.passing_year}
                  />
                  <TextField
                    error={errors[`percentage_${index + 1}`] ?? errors.percentage}
                    hint="0 to 100, or the grade if your board reports one."
                    inputMode="decimal"
                    label="Percentage"
                    onChange={(value) => patchRow(index, { percentage: value.replace(/[^\d.]/g, '') })}
                    required
                    value={row.percentage}
                  />
                  <TextField
                    label="Class / grade (optional)"
                    onChange={(value) => patchRow(index, { class_grade: value })}
                    value={row.class_grade}
                  />
                  <SelectField
                    error={errors[`status_${index + 1}`] ?? errors.status}
                    label="Status"
                    onChange={(value) => patchRow(index, { status: value })}
                    options={QUALIFICATION_STATUS_OPTIONS.map((option) => ({ value: option, label: option }))}
                    value={row.status}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <button
            className="rounded border border-gov-blue bg-white px-3 py-1.5 text-[12px] font-semibold text-gov-blue hover:bg-gov-blue-ultralight"
            onClick={addRow}
            type="button"
          >
            + Add another qualification
          </button>
        </div>
      </Fieldset>
    </div>
  );
}
