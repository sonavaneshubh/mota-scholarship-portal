import { APPLICANT_APPLICATIONS } from '../data/applicantData';
import { ApplicationCard } from '../components/applicant/ApplicationCard';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { Button } from '../components/ui/Button';
import { ROUTES } from '../lib/constants';

export function ApplicantApplicationsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <ApplicantPageHeader
        action={<Button size="md" to={ROUTES.applicant.schemes} variant="primary">Explore schemes</Button>}
        description="Track the status of your submitted scholarship and fellowship applications. All entries below are sample data."
        eyebrow="Applicant workspace"
        title="My applications"
      />
      <section className="grid gap-4" aria-label="Submitted applications">
        {APPLICANT_APPLICATIONS.map((application) => <ApplicationCard application={application} key={application.id} />)}
      </section>
    </div>
  );
}
