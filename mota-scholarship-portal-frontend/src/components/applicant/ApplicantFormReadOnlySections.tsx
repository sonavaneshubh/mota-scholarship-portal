/**
 * Read-only display of data the form does not own.
 *
 * Every field in sections 1 and 2 of the form comes from My Profile, and none of
 * them is editable here. That is a deliberate architecture decision, not a
 * limitation:
 *
 *  - Two copies of the same fact drift. If the application held its own name and
 *    the applicant later corrected their profile, the two would disagree and
 *    there would be no principled way to decide which is right.
 *  - Officers verify documents against the profile. An application that could
 *    assert a different identity than the verified profile would undermine the
 *    whole check.
 *
 * So these sections render profile data as text with a route to change it. A
 * missing value says so honestly rather than showing an empty box that looks
 * like something to fill in here.
 */

import type { ReactNode } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ROUTES } from '../../lib/constants';
import type { ProfileData } from '../../types/profile';

const NOT_PROVIDED = 'Not provided';

const value = (input: string | number | null | undefined): string => {
  if (input === null || input === undefined) return NOT_PROVIDED;
  const text = String(input).trim();
  return text === '' ? NOT_PROVIDED : text;
};

function formatDate(input: string | null | undefined): string {
  const text = value(input);
  if (text === NOT_PROVIDED) return text;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function yesNo(input: boolean | null | undefined): string {
  if (input === true) return 'Yes';
  if (input === false) return 'No';
  return NOT_PROVIDED;
}

function joinAddress(parts: Array<string | null | undefined>, separator = ', '): string {
  const kept = parts.map((part) => value(part)).filter((part) => part !== NOT_PROVIDED);
  return kept.length > 0 ? kept.join(separator) : NOT_PROVIDED;
}

interface ReadOnlyGridProps {
  profile: ProfileData;
}

interface FieldSpec {
  label: string;
  value: string;
}

function FieldGrid({ fields }: { fields: FieldSpec[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((field) => (
        <div className="min-w-0" key={field.label}>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{field.label}</dt>
          <dd
            className={`mt-0.5 break-words text-[13px] ${
              field.value === NOT_PROVIDED ? 'text-slate-400 italic' : 'text-slate-800'
            }`}
          >
            {field.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2.5 text-[12px] font-bold uppercase tracking-wide text-gov-blue-dark">{children}</h3>
  );
}

/**
 * Section 1 — applicant information, straight from My Profile.
 */
export function ApplicantInformationSection({ profile }: ReadOnlyGridProps) {
  const { profile: anchor, address, caste, domicile, parents, bank } = profile;

  return (
    <div className="space-y-5">
      <div>
        <SubHeading>Personal</SubHeading>
        <FieldGrid
          fields={[
            { label: 'Full name', value: value(anchor?.full_name) },
            { label: 'Name as per marksheet', value: value(anchor?.applicant_full_name_as_per_marksheet) },
            { label: 'Date of birth', value: formatDate(anchor?.date_of_birth) },
            { label: 'Gender', value: value(anchor?.gender) },
            { label: 'Religion', value: value(anchor?.religion) },
            { label: 'Marital status', value: value(anchor?.marital_status) },
            { label: 'Mobile', value: value(anchor?.mobile_number) },
            { label: 'Email', value: value(anchor?.email) },
            // The full Aadhaar is write-only by design: the server only ever
            // returns a mask, so this shows what is genuinely held.
            { label: 'Aadhaar', value: value(anchor?.aadhaar_masked ?? anchor?.aadhaar_last4) },
            { label: 'Category', value: value(caste?.category) },
            { label: 'Caste', value: value(caste?.caste) },
            { label: 'Caste certificate held', value: yesNo(caste?.has_caste_certificate) },
            { label: 'Maharashtra domicile', value: yesNo(domicile?.is_maharashtra_domicile) },
          ]}
        />
      </div>

      <div>
        <SubHeading>Address</SubHeading>
        <FieldGrid
          fields={[
            { label: 'Permanent address', value: joinAddress([address?.permanent_address]) },
            { label: 'Village', value: value(address?.permanent_village) },
            { label: 'Taluka', value: value(address?.permanent_taluka) },
            { label: 'District', value: value(address?.permanent_district) },
            { label: 'State', value: value(address?.permanent_state) },
            { label: 'Pincode', value: value(address?.permanent_pincode) },
          ]}
        />
      </div>

      <div>
        <SubHeading>Parent or guardian</SubHeading>
        <FieldGrid
          fields={[
            { label: "Father's name", value: value(parents?.father_name) },
            { label: "Mother's name", value: value(parents?.mother_name) },
            { label: 'Guardian', value: value(parents?.guardian_name) },
            { label: 'Guardian mobile', value: value(parents?.guardian_mobile) },
          ]}
        />
      </div>

      <div>
        <SubHeading>Bank account</SubHeading>
        <FieldGrid
          fields={[
            { label: 'Bank', value: value(bank?.bank_name) },
            { label: 'Account holder', value: value(bank?.account_holder_name) },
            // Only the last four are readable. bank_details grants privileges per
            // column and locks the plaintext account number to NULL, so the full
            // number cannot be fetched, let alone displayed.
            { label: 'Account ending', value: value(bank?.account_number_last4) },
            { label: 'IFSC', value: value(bank?.ifsc_code) },
          ]}
        />
      </div>

      <ProfileEditNotice />
    </div>
  );
}

/**
 * Section 2 — academic information, also from the profile.
 */
export function AcademicInformationSection({ profile }: ReadOnlyGridProps) {
  const { course, qualifications } = profile;

  return (
    <div className="space-y-5">
      <div>
        <SubHeading>Current course</SubHeading>
        <FieldGrid
          fields={[
            { label: 'Course', value: value(course?.course_name) },
            { label: 'Degree', value: value(course?.degree) },
            { label: 'Branch', value: value(course?.branch) },
            { label: 'Level', value: value(course?.course_level) },
            { label: 'Year of study', value: value(course?.year_of_study) },
            { label: 'Semester', value: value(course?.semester) },
            { label: 'Institution', value: value(course?.institution_name) },
            { label: 'Board / University', value: value(course?.board_university ?? course?.university_name) },
            { label: 'Mode of study', value: value(course?.mode_of_study) },
            { label: 'Admission type', value: value(course?.admission_type) },
            { label: 'Admission date', value: formatDate(course?.admission_date) },
            { label: 'Academic year', value: value(course?.academic_year) },
          ]}
        />
      </div>

      <div>
        <SubHeading>Past qualifications</SubHeading>
        {qualifications.length === 0 ? (
          <p className="text-[13px] italic text-slate-400">
            No qualifications recorded yet. Add them in My Profile so they can be carried into this application.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-semibold" scope="col">Qualification</th>
                  <th className="py-2 pr-3 font-semibold" scope="col">Degree</th>
                  <th className="py-2 pr-3 font-semibold" scope="col">Board / University</th>
                  <th className="py-2 pr-3 font-semibold" scope="col">Year</th>
                  <th className="py-2 pr-3 font-semibold" scope="col">Percentage</th>
                  <th className="py-2 font-semibold" scope="col">Class</th>
                </tr>
              </thead>
              <tbody>
                {qualifications.map((record) => (
                  <tr className="border-b border-slate-100 last:border-0" key={record.id}>
                    <td className="py-2 pr-3 font-medium text-slate-800">{value(record.qualification_type)}</td>
                    <td className="py-2 pr-3 text-slate-700">{value(record.degree)}</td>
                    <td className="py-2 pr-3 text-slate-700">{value(record.board_university)}</td>
                    <td className="py-2 pr-3 text-slate-700">{value(record.passing_year)}</td>
                    <td className="py-2 pr-3 text-slate-700">{value(record.percentage)}</td>
                    <td className="py-2 text-slate-700">{value(record.class_grade)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProfileEditNotice />
    </div>
  );
}

function ProfileEditNotice() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-blue-200 bg-blue-50 px-3 py-2.5">
      <p className="text-[12px] leading-snug text-slate-700">
        This section is filled from My Profile and is not editable here, so your application can never disagree with
        your verified profile.
      </p>
      <Button size="sm" to={ROUTES.applicant.profile} variant="outline">
        Edit My Profile
      </Button>
    </div>
  );
}

/** Completion nudges, shown as a warning strip rather than inline per field. */
export function ProfileGapsNotice({ profile }: ReadOnlyGridProps) {
  const missing: string[] = [];

  if (!profile.profile?.full_name?.trim()) missing.push('name');
  if (!profile.profile?.date_of_birth?.trim()) missing.push('date of birth');
  if (!profile.profile?.mobile_number?.trim()) missing.push('mobile number');
  if (!profile.profile?.email?.trim()) missing.push('email address');
  if (!profile.address?.permanent_pincode?.trim()) missing.push('address');
  if (profile.qualifications.length === 0) missing.push('past qualifications');
  if (!profile.course?.course_name?.trim() && !profile.course?.degree?.trim()) missing.push('current course');

  if (missing.length === 0) return null;

  return (
    <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2.5" role="status">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] leading-snug text-amber-900">
          <span className="font-semibold">Your profile is incomplete.</span> These are still blank, and a blank in
          your profile becomes a question on this form: {missing.join(', ')}.
        </p>
        <Badge tone="amber">{missing.length} missing</Badge>
      </div>
    </div>
  );
}
