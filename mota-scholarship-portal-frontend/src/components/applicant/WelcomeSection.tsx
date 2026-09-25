import { ROUTES } from '../../lib/constants';
import type { ApplicantProfile } from '../../types';
import { Button } from '../ui/Button';

interface WelcomeSectionProps {
  profile: ApplicantProfile;
}

export function WelcomeSection({ profile }: WelcomeSectionProps) {
  const firstName = profile.name.trim().split(/\s+/)[0] || profile.name;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Applicant dashboard · Current scholarship cycle</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gov-blue-dark">Welcome back, {firstName}!</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
            Track your scholarship applications, review profile readiness, and continue to the schemes and documents that need your attention.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button size="md" to={`${ROUTES.applicant.schemes}?view=suggested`} variant="primary">Explore schemes</Button>
          <Button size="md" to={ROUTES.applicant.applications} variant="outline">View applications</Button>
        </div>
      </div>
    </section>
  );
}
