import { SCHEMES } from '../data/mockData';
import {
  APPLICANT_APPLICATIONS,
  APPLICANT_NOTIFICATIONS,
  APPLICANT_QUICK_ACTIONS,
  APPLICANT_REQUIRED_ACTIONS,
} from '../data/applicantData';
import { useApplicantAuth } from '../context/useApplicantAuth';
import { ApplicationCard } from '../components/applicant/ApplicationCard';
import { ApplicantSchemeCard } from '../components/applicant/ApplicantSchemeCard';
import { NotificationItem } from '../components/applicant/NotificationItem';
import { OverviewCard } from '../components/applicant/OverviewCard';
import { QuickActionCard } from '../components/applicant/QuickActionCard';
import { RequiredAction } from '../components/applicant/RequiredAction';
import { WelcomeSection } from '../components/applicant/WelcomeSection';
import { Button } from '../components/ui/Button';
import { ROUTES } from '../lib/constants';

export function ApplicantDashboard() {
  const { session } = useApplicantAuth();

  if (!session) {
    return null;
  }

  const underReview = APPLICANT_APPLICATIONS.filter((application) => application.status === 'under-review').length;
  const actionRequired = APPLICANT_APPLICATIONS.filter((application) => application.status === 'action-required').length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <WelcomeSection profile={session.user} />

      <section aria-labelledby="overview-heading" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <h2 className="sr-only" id="overview-heading">Application overview</h2>
        <OverviewCard detail="All submitted applications" label="Applications" tone="blue" value={String(APPLICANT_APPLICATIONS.length)} />
        <OverviewCard detail="Currently being reviewed" label="In review" tone="purple" value={String(underReview)} />
        <OverviewCard detail="Needs your attention" label="Action required" tone="amber" value={String(actionRequired)} />
        <OverviewCard detail="Your profile is almost ready" label="Profile" tone="green" value={`${session.user.profileCompletion}%`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2" aria-labelledby="recent-applications-heading">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Your workspace</p>
              <h2 className="mt-1 text-xl font-bold text-gov-blue-dark" id="recent-applications-heading">Recent applications</h2>
            </div>
            <Button size="sm" to={ROUTES.applicant.applications} variant="outline">View all</Button>
          </div>
          <div className="grid gap-4">
            {APPLICANT_APPLICATIONS.map((application) => <ApplicationCard application={application} key={application.id} />)}
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="actions-heading">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Next steps</p>
            <h2 className="mt-1 text-xl font-bold text-gov-blue-dark" id="actions-heading">Required actions</h2>
          </div>
          {APPLICANT_REQUIRED_ACTIONS.map((action) => <RequiredAction action={action} key={action.id} />)}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-bold text-slate-800">Quick access</p>
            <div className="mt-3 space-y-2">
              {APPLICANT_QUICK_ACTIONS.map((action) => <QuickActionCard action={action} key={action.id} />)}
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5" aria-labelledby="schemes-heading">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Recommended</p>
              <h2 className="mt-1 text-lg font-bold text-gov-blue-dark" id="schemes-heading">Explore sample schemes</h2>
            </div>
            <Button size="sm" to={ROUTES.applicant.schemes} variant="ghost">Browse</Button>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {SCHEMES.slice(0, 2).map((scheme) => <ApplicantSchemeCard key={scheme.id} scheme={scheme} />)}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5" aria-labelledby="notifications-heading">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Updates</p>
              <h2 className="mt-1 text-lg font-bold text-gov-blue-dark" id="notifications-heading">Recent notifications</h2>
            </div>
            <Button size="sm" to={ROUTES.applicant.notifications} variant="ghost">View all</Button>
          </div>
          <div className="mt-2">
            {APPLICANT_NOTIFICATIONS.slice(0, 3).map((notification) => <NotificationItem key={notification.id} notification={notification} />)}
          </div>
        </section>
      </div>
    </div>
  );
}
