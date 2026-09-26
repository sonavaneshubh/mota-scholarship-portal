import { Navigate, useLocation } from 'react-router-dom';
import { useApplicantAuth } from '../context/useApplicantAuth';
import { APPLICANT_APPLICATIONS } from '../data/applicantData';
import { WelcomeSection } from '../components/applicant/WelcomeSection';
import { OverviewCard } from '../components/applicant/OverviewCard';
import { calculateApplicantProfileCompletion, getApplicantProfileSections } from '../lib/applicantProfile';
import { ROUTES } from '../lib/constants';

export function ApplicantDashboard() {
  const { session, user } = useApplicantAuth();
  const location = useLocation();

  if (!session || !user) {
    return (
      <Navigate
        replace
        state={{
          homeAuthMode: 'applicant',
          from: { pathname: location.pathname, search: location.search, hash: location.hash },
        }}
        to={ROUTES.homeLogin}
      />
    );
  }

  if (!user) {
    return null;
  }

  const completion = calculateApplicantProfileCompletion(user);
  const profileSections = getApplicantProfileSections(user);
  const totalFields = profileSections.reduce((sum, s) => sum + s.total, 0);
  const completedFields = profileSections.reduce((sum, s) => sum + s.completed, 0);
  const totalApplications = APPLICANT_APPLICATIONS.length;
  const approvedApplications = APPLICANT_APPLICATIONS.filter((app) => app.status === 'approved' as any).length;
  const pendingApplications = APPLICANT_APPLICATIONS.filter((app) =>
    ['submitted', 'under-scrutiny', 'deficiency-raised'].includes(app.status)
  ).length;
  const notificationsCount = 4;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-full px-3 sm:px-4 lg:px-6 py-6 sm:py-8">
        <WelcomeSection profile={user} />

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <path d="M22 4 12 14.01l-3-3" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Profile Completeness</h2>
                <p className="text-xs text-slate-500">Complete your profile to improve scheme matching</p>
              </div>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="flex-1 min-w-0">
                <div
                  aria-label={`Core profile fields ${completion} percent complete`}
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={completion}
                  className="h-3 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                >
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500" style={{ width: `${completion}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-slate-500">{completedFields} of {totalFields} fields complete</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-2xl font-extrabold text-emerald-600">{completion}%</p>
                <p className="text-xs text-slate-500">Complete</p>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="summary-heading" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <h2 className="sr-only" id="summary-heading">Application summary</h2>
          <OverviewCard
            label="Total Applications"
            value={String(totalApplications)}
            detail="All submitted applications"
            tone="blue"
          />
          <OverviewCard
            label="Approved Applications"
            value={String(approvedApplications)}
            detail="Successfully processed"
            tone="green"
          />
          <OverviewCard
            label="Pending Applications"
            value={String(pendingApplications)}
            detail="Under review or action needed"
            tone="amber"
          />
          <OverviewCard
            label="Notifications"
            value={String(notificationsCount)}
            detail="Unread notifications"
            tone="purple"
          />
        </section>
      </div>
    </div>
  );
}