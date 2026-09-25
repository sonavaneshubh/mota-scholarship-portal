import { APPLICANT_APPLICATIONS } from '../data/applicantData';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { ApplicationTable } from '../components/applicant/ApplicationTable';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ROUTES } from '../lib/constants';

export function ApplicantApplicationsPage() {
  return (
    <div className="space-y-6 py-1 sm:py-2">
      <ApplicantPageHeader
        action={<Button size="md" to={ROUTES.applicant.schemes} variant="primary">Explore schemes</Button>}
        description="Track the status of your submitted scholarship and fellowship applications. All entries below are sample data."
        eyebrow="Applicant workspace"
        title="My applications"
      />
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
        <span className="font-bold">Prototype notice:</span> Status changes, document submissions, and final decisions are not connected to a live service.
      </div>
      <Card className="min-w-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-lg font-bold text-gov-blue-dark">Submitted applications</h2>
            <p className="mt-1 text-sm text-slate-600">{APPLICANT_APPLICATIONS.length} sample records in this workspace</p>
          </div>
          <Button size="sm" to={ROUTES.applicant.history} variant="outline">View history</Button>
        </div>
        <ApplicationTable applications={APPLICANT_APPLICATIONS} caption="My submitted scholarship and fellowship applications" />
      </Card>
    </div>
  );
}
