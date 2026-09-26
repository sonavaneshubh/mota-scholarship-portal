import { ROUTES } from '../../lib/constants';
import type { ApplicantProfile } from '../../types';
import { Button } from '../ui/Button';

interface WelcomeSectionProps {
  profile: ApplicantProfile;
}

export function WelcomeSection({ profile }: WelcomeSectionProps) {
  const firstName = profile.name.trim().split(/\s+/)[0] || profile.name;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-[#0B2A4A]">Welcome, {firstName} 👋</h1>
          <p className="mt-1 text-slate-600">
            Access and manage your scholarships, applications and related services from here.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-3">
          <Button size="md" to={`${ROUTES.applicant.schemes}?view=suggested`} variant="primary">
            Explore Schemes
          </Button>
          <Button size="md" to={ROUTES.applicant.applications} variant="outline">
            View Applications
          </Button>
        </div>
      </div>
    </section>
  );
}