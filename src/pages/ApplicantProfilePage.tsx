import { useApplicantAuth } from '../context/useApplicantAuth';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ROUTES } from '../lib/constants';

export function ApplicantProfilePage() {
  const { session } = useApplicantAuth();

  if (!session) {
    return null;
  }

  const profile = session.user;
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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <ApplicantPageHeader
        action={<Button size="md" to={ROUTES.applicant.dashboard} variant="outline">Back to dashboard</Button>}
        description="Review the sample profile used in this applicant workspace. Editing and verification are not connected."
        eyebrow="Applicant workspace"
        title="My profile"
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2" accentClass="">
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
        </Card>
        <Card className="h-fit p-5" accentClass="">
          <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Profile strength</p>
          <p className="mt-2 text-3xl font-bold text-gov-blue-dark">{profile.profileCompletion}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gov-saffron" style={{ width: `${profile.profileCompletion}%` }} /></div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">Complete the remaining profile fields in a future phase to improve application readiness.</p>
          <Button className="mt-5 w-full" size="md" to={ROUTES.applicant.documents} variant="primary">Review documents</Button>
        </Card>
      </div>
    </div>
  );
}
