/**
 * Section 4 — Current Course.
 *
 * Institution, board and university master tables are intentionally empty, so
 * each of those controls is a select-with-free-text. The CAP application number
 * only appears once the applicant confirms a CAP admission, matching the
 * `cap_admission` condition in profile_completeness_rules.
 */

import { FORM_GRID_CLASS, Fieldset, SelectField, TextField, YesNoField } from '../ProfileFields';
import {
  ADMISSION_TYPE_OPTIONS,
  MODE_OF_STUDY_OPTIONS,
} from '../../../lib/profileValidation';
import type { CurrentCourseFormValues, ProfileMasterData } from '../../../types/profile';

export interface CurrentCourseSectionProps {
  values: CurrentCourseFormValues;
  onChange: (patch: Partial<CurrentCourseFormValues>) => void;
  errors: Record<string, string>;
  master: ProfileMasterData;
}

const CURRENT_YEAR = new Date().getFullYear();

export function CurrentCourseSection({ values, onChange, errors, master }: CurrentCourseSectionProps) {
  const levelOptions = master.courseLevels.map((row) => ({ value: row.name, label: row.name }));

  return (
    <div className="space-y-6">
      <Fieldset legend="Course">
        <div className={FORM_GRID_CLASS}>
          <TextField
            error={errors.academic_year}
            hint="For example 2026-27."
            label="Academic year"
            onChange={(value) => onChange({ academic_year: value })}
            placeholder="2026-27"
            required
            value={values.academic_year}
          />
          <SelectField
            allowCustom
            error={errors.course_level}
            label="Course level"
            onChange={(value) => onChange({ course_level: value })}
            options={levelOptions}
            required
            value={values.course_level}
          />
          <SelectField
            allowCustom
            error={errors.course_name}
            hint="No course list is pre-loaded; type the course name."
            label="Course name"
            onChange={(value) => onChange({ course_name: value })}
            options={[]}
            placeholder="Type or select"
            required
            value={values.course_name}
          />
          <TextField
            error={errors.degree}
            label="Course / degree"
            onChange={(value) => onChange({ degree: value })}
            placeholder="e.g. B.Sc., B.Com., B.A., BCA"
            required
            value={values.degree}
          />
          <TextField
            error={errors.branch}
            label="Branch / specialisation"
            onChange={(value) => onChange({ branch: value })}
            placeholder="e.g. Computer Science"
            required
            value={values.branch}
          />
          <SelectField
            error={errors.mode_of_study}
            label="Mode of study"
            onChange={(value) => onChange({ mode_of_study: value })}
            options={MODE_OF_STUDY_OPTIONS.map((option) => ({ value: option, label: option }))}
            required
            value={values.mode_of_study}
          />
          <TextField
            error={errors.year_of_study}
            inputMode="numeric"
            label="Year of study"
            maxLength={2}
            onChange={(value) => onChange({ year_of_study: value.replace(/\D/g, '').slice(0, 2) })}
            required
            value={values.year_of_study}
          />
          <TextField
            error={errors.semester}
            inputMode="numeric"
            label="Semester"
            maxLength={2}
            onChange={(value) => onChange({ semester: value.replace(/\D/g, '').slice(0, 2) })}
            required
            value={values.semester}
          />
          <TextField
            error={errors.course_duration_months}
            hint="Total duration in months."
            inputMode="numeric"
            label="Course duration (months)"
            maxLength={3}
            onChange={(value) => onChange({ course_duration_months: value.replace(/\D/g, '').slice(0, 3) })}
            required
            value={values.course_duration_months}
          />
          <YesNoField
            error={errors.is_professional}
            label="Is this a professional course?"
            onChange={(value) => onChange({ is_professional: value })}
            required
            value={values.is_professional}
          />
        </div>
      </Fieldset>

      <Fieldset legend="Institution">
        <div className={FORM_GRID_CLASS}>
          <SelectField
            allowCustom
            className="sm:col-span-2 lg:col-span-3"
            error={errors.institution_name}
            hint="No institution list is pre-loaded; type the college or institute name."
            label="College / institute"
            onChange={(value) => onChange({ institution_name: value })}
            options={[]}
            placeholder="Type or select"
            required
            value={values.institution_name}
          />
          <SelectField
            allowCustom
            error={errors.board_university}
            hint="The University if the course is a degree, otherwise the Board."
            label="University / board"
            onChange={(value) => onChange({ board_university: value })}
            options={[]}
            placeholder="Type or select"
            required
            value={values.board_university}
          />
          <TextField
            error={errors.admission_date}
            label="Admission date"
            onChange={(value) => onChange({ admission_date: value })}
            required
            type="date"
            value={values.admission_date}
            hint={`Must be on or before today (${CURRENT_YEAR}).`}
          />
          <SelectField
            allowCustom
            error={errors.admission_type}
            label="Admission type"
            onChange={(value) => onChange({ admission_type: value })}
            options={ADMISSION_TYPE_OPTIONS.map((option) => ({ value: option, label: option }))}
            required
            value={values.admission_type}
          />
          <TextField
            error={errors.seat_type}
            label="Seat type / category"
            onChange={(value) => onChange({ seat_type: value })}
            placeholder="e.g. Open, Reserved, EWS"
            required
            value={values.seat_type}
          />
        </div>
      </Fieldset>

      <Fieldset legend="CAP admission">
        <div className={FORM_GRID_CLASS}>
          <YesNoField
            error={errors.cap_admission}
            hint="CAP is the centralised admission process run by the State Common Entrance Test Cell."
            label="Was this admission through CAP?"
            onChange={(value) => onChange({ cap_admission: value, cap_application_number: '' })}
            required
            value={values.cap_admission}
          />
          {values.cap_admission ? (
            <TextField
              error={errors.cap_application_number}
              label="CAP application number"
              onChange={(value) => onChange({ cap_application_number: value })}
              required
              value={values.cap_application_number}
            />
          ) : null}
        </div>
      </Fieldset>

      <Fieldset legend="Institute location">
        <div className={FORM_GRID_CLASS}>
          <SelectField
            allowCustom
            error={errors.institute_state}
            label="Institute state"
            onChange={(value) => onChange({ institute_state: value })}
            options={master.states.map((row) => ({ value: row.name, label: row.name }))}
            required
            value={values.institute_state}
          />
          <SelectField
            allowCustom
            error={errors.institute_district}
            label="Institute district"
            onChange={(value) => onChange({ institute_district: value })}
            options={[]}
            placeholder="Type or select"
            required
            value={values.institute_district}
          />
          <SelectField
            allowCustom
            error={errors.institute_taluka}
            label="Institute taluka"
            onChange={(value) => onChange({ institute_taluka: value })}
            options={[]}
            placeholder="Type or select"
            required
            value={values.institute_taluka}
          />
        </div>
      </Fieldset>
    </div>
  );
}
