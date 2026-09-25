import { useApplicantAuth } from '../context/useApplicantAuth';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ROUTES } from '../lib/constants';
import { calculateApplicantProfileCompletion, getApplicantProfileSections } from '../lib/applicantProfile';

export function ApplicantProfilePage() {
  const { session } = useApplicantAuth();

  if (!session) {
    return null;
  }

  const profile = session.user;
  const completion = calculateApplicantProfileCompletion(profile);
  const sections = getApplicantProfileSections(profile);
  const details = [
    ['Full name', profile.name],
    ['Email', profile.email],
    ['Mobile', profile.mobile],
    ['State', profile.state],
    ['District', profile.district],
    ['Category', profile.category],
    ['Current course', profile.course],
    ['Institution', profile.institution],
  ];

  return (
    <div className="space-y-6 py-1 sm:py-2">
      <ApplicantPageHeader
        action={<Button size="md" to={ROUTES.applicant.dashboard} variant="outline">Back to dashboard</Button>}
        description="Review the sample profile used in this applicant workspace. Editing and verification are not connected."
        eyebrow="Applicant workspace"
        title="My profile"
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-xl font-bold text-gov-saffron-dark">{profile.avatarInitials}</span>
            <div>
              <h2 className="text-xl font-bold text-gov-blue-dark">{profile.name}</h2>
              <p className="mt-1 text-sm text-slate-500">Applicant ID: {profile.id}</p>
              <div className="mt-2"><Badge tone="blue">Demo profile</Badge></div>
            </div>
          </div>
          <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {details.map(([label, value]) => <div key={label}><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd></div>)}
          </dl>
          <div className="mt-6 rounded border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
            Profile editing and identity verification are not connected. Do not enter real personal or financial information in this demo.
          </div>
        </Card>
        <Card className="h-fit p-5" accentClass="border-l-4 border-gov-saffron">
          <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Calculated profile status</p>
          <p className="mt-2 text-3xl font-bold text-gov-blue-dark">{completion}%</p>
          <div
            aria-label={`Core profile fields ${completion} percent complete`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={completion}
            className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
          >
            <div className="h-full rounded-full bg-gov-saffron" style={{ width: `${completion}%` }} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">This value is calculated from the non-empty profile fields in the current session.</p>
          <ul className="mt-4 space-y-3" aria-label="Profile section completion">
            {sections.map((section) => (
              <li className="flex items-center justify-between gap-3 text-xs" key={section.id}>
                <span className="text-slate-600">{section.label}</span>
                <span className={section.complete ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>
                  {section.complete ? 'Complete' : `${section.completed}/${section.total}`}
                </span>
              </li>
            ))}
          </ul>
          <Button className="mt-5 w-full" size="md" to={ROUTES.applicant.documents} variant="primary">Review documents</Button>
        </Card>
      </div>
    </div>
  );
}
