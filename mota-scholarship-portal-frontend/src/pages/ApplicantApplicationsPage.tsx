import { useApplicantApplications } from '../hooks/useApplicantRecords';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { ApplicationTable } from '../components/applicant/ApplicationTable';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ROUTES } from '../lib/constants';

export function ApplicantApplicationsPage() {
  const { items, status, error } = useApplicantApplications();

  return (
    <div className="space-y-6 py-2 sm:py-4">
      <ApplicantPageHeader
        action={<Button size="md" to={ROUTES.applicant.schemes} variant="primary">Explore schemes</Button>}
        description="Track the status of your submitted scholarship and fellowship applications."
        eyebrow="Applicant workspace"
        title="My applications"
      />

      <Card className="min-w-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-lg font-bold text-gov-blue-dark">Submitted applications</h2>
            {status === 'ready' ? (
              <p className="mt-1 text-sm text-slate-600">
                {items.length} application{items.length === 1 ? '' : 's'} on record
              </p>
            ) : null}
          </div>
          <Button size="sm" to={ROUTES.applicant.history} variant="outline">View history</Button>
        </div>

        {status === 'loading' ? (
          <div aria-busy="true" className="space-y-2 p-5" role="status">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="h-10 animate-pulse rounded bg-slate-100" key={index} />
            ))}
            <span className="sr-only">Loading your applications</span>
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="px-5 py-8 text-center">
            <h3 className="text-base font-bold text-gov-blue-dark">Applications could not be loaded</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
              {error ?? 'Please try again later.'}
            </p>
          </div>
        ) : null}

        {status === 'unavailable' ? (
          <div className="px-5 py-10 text-center">
            <h3 className="text-lg font-bold text-gov-blue-dark">No applications yet</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              You have not submitted any application. Browse the published schemes to find one you are
              eligible for.
            </p>
            <Button className="mt-5 rounded" size="md" to={ROUTES.applicant.schemes} variant="primary">
              Explore schemes
            </Button>
          </div>
        ) : null}

        {status === 'ready' && items.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <h3 className="text-lg font-bold text-gov-blue-dark">No applications yet</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              You have not submitted any application. Browse the published schemes to find one you are
              eligible for.
            </p>
            <Button className="mt-5 rounded" size="md" to={ROUTES.applicant.schemes} variant="primary">
              Explore schemes
            </Button>
          </div>
        ) : null}

        {status === 'ready' && items.length > 0 ? (
          <ApplicationTable applications={items} caption="My submitted scholarship and fellowship applications" />
        ) : null}
      </Card>
    </div>
  );
}
