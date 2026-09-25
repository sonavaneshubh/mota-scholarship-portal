import { Link } from 'react-router-dom';
import type { ApplicantProfile } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ROUTES } from '../../lib/constants';

interface WelcomeSectionProps {
  profile: ApplicantProfile;
}

export function WelcomeSection({ profile }: WelcomeSectionProps) {
  return (
    <Card className="overflow-hidden border-blue-100 bg-gradient-to-br from-white via-white to-blue-50" accentClass="">
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Applicant dashboard</p>
          <h1 className="mt-2 text-2xl font-bold text-gov-blue-dark sm:text-3xl">Welcome, {profile.name.split(' ')[0]}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Review your applications, explore sample schemes, and keep your documents ready for the next step.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="md" to={ROUTES.applicant.schemes} variant="primary">
              Explore schemes
            </Button>
            <Button size="md" to={ROUTES.applicant.applications} variant="outline">
              View applications
            </Button>
          </div>
        </div>
        <div className="w-full max-w-xs rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-slate-700">Profile completion</span>
            <span className="text-sm font-bold text-gov-blue">{profile.profileCompletion}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gov-saffron" style={{ width: `${profile.profileCompletion}%` }} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">Complete your profile to make future applications faster.</p>
          <Link className="mt-3 inline-flex min-h-11 items-center text-xs font-bold text-gov-blue underline underline-offset-2 hover:text-gov-saffron" to={ROUTES.applicant.profile}>
            Review profile →
          </Link>
        </div>
      </div>
    </Card>
  );
}
