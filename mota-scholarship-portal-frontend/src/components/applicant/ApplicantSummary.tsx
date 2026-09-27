/**
 * Compact applicant summary for the application form.
 *
 * The application form must not become a second copy of My Profile. It needs
 * only enough to identify the applicant on an official record and to let them
 * confirm nothing is obviously wrong before submitting. Everything not shown
 * here stays in My Profile, which remains the single source of truth.
 *
 * That is why this is deliberately short. The full profile is one click away
 * via Review, which is where an applicant looks when they want to read every
 * field rather than glance at the essentials.
 */

import type { ProfileData } from '../../types/profile';
import { ROUTES } from '../../lib/constants';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

const NOT_PROVIDED = 'Not provided';

function value(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return NOT_PROVIDED;
  const text = String(input).trim();
  return text === '' ? NOT_PROVIDED : text;
}

function formatDate(input: string | null | undefined): string {
  const text = value(input);
  if (text === NOT_PROVIDED) return text;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function join(parts: Array<string | null | undefined>, separator = ' '): string {
  const kept = parts.map(value).filter((part) => part !== NOT_PROVIDED);
  return kept.length > 0 ? kept.filter(Boolean).join(separator) : NOT_PROVIDED;
}

interface SummaryField {
  label: string;
  value: string;
}

/** How many of the essential identity fields are still blank in the profile. */
function missingEssentials(profile: ProfileData): string[] {
  const missing: string[] = [];
  if (!profile.profile?.full_name?.trim()) missing.push('name');
  if (!profile.profile?.mobile_number?.trim()) missing.push('mobile number');
  if (!profile.profile?.email?.trim()) missing.push('email address');
  if (!profile.profile?.date_of_birth?.trim()) missing.push('date of birth');
  return missing;
}

interface ApplicantSummaryProps {
  profile: ProfileData;
}

export function ApplicantSummary({ profile }: ApplicantSummaryProps) {
  const { profile: anchor, caste, address, bank, course, qualifications } = profile;
  const missing = missingEssentials(profile);

  const fields: SummaryField[] = [
    { label: 'Full name', value: value(anchor?.full_name) },
    {
      label: 'Date of birth',
      value: join([formatDate(anchor?.date_of_birth), value(anchor?.gender)], ' · '),
    },
    { label: 'Mobile', value: value(anchor?.mobile_number) },
    { label: 'Email', value: value(anchor?.email) },
    // The full Aadhaar is write-only by design: the server only ever returns a
    // mask, so this shows what is genuinely held rather than a placeholder.
    { label: 'Aadhaar', value: value(anchor?.aadhaar_masked ?? anchor?.aadhaar_last4) },
    { label: 'Category', value: value(caste?.category) },
    {
      label: 'District',
      value: join([address?.permanent_district, address?.permanent_state], ', '),
    },
    {
      label: 'Course',
      value: join(
        [
          course?.course_name,
          join([course?.degree, course?.branch], ', '),
          value(course?.year_of_study),
        ],
        ' · ',
      ),
    },
    {
      label: 'Institution',
      value: join([course?.institution_name, course?.board_university ?? course?.university_name], ', '),
    },
    {
      // qualifications arrive newest-first (ordered by passing_year desc), so the
      // first entry is the most recent, not the highest. Labelled accordingly
      // rather than claiming to be the highest qualification.
      label: qualifications.length > 1 ? 'Latest qualification' : 'Qualification',
      value:
        qualifications.length === 0
          ? NOT_PROVIDED
          : join(
              [
                value(qualifications[0].qualification_type),
                value(qualifications[0].degree),
                value(qualifications[0].board_university),
                value(qualifications[0].passing_year),
              ],
              ' · ',
            ),
    },
    {
      label: 'Bank account',
      value: join([bank?.bank_name, value(bank?.account_number_last4)], ' · '),
    },
  ];

  return (
    <div className="space-y-4">
      {missing.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-amber-300 bg-amber-50 px-3 py-2.5" role="status">
          <p className="text-[12px] leading-snug text-amber-900">
            <span className="font-semibold">Some basics are still missing from your profile:</span>{' '}
            {missing.join(', ')}. Officers verify against these, so it is worth completing them.
          </p>
          <Button size="sm" to={ROUTES.applicant.profile} variant="outline">
            Complete in My Profile
          </Button>
        </div>
      ) : null}

      <dl className="grid gap-x-6 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">
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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-blue-200 bg-blue-50 px-3 py-2.5">
        <p className="text-[12px] leading-snug text-slate-700">
          These details come from My Profile and are not edited here, so your application can never disagree with your
          verified profile.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="slate">From My Profile</Badge>
          <Button size="sm" to={ROUTES.applicant.profile} variant="outline">
            Edit My Profile
          </Button>
        </div>
      </div>
    </div>
  );
}
