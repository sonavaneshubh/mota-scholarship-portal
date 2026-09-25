import { AuthPageLayout } from '../components/auth/AuthPageLayout';
import { Button } from '../components/ui/Button';
import { ROUTES } from '../lib/constants';

export function ApplicantRegistration() {
  return (
    <AuthPageLayout
      variant="applicant"
      eyebrow="Applicant Portal"
      title="Applicant Registration"
      description="Create an account to apply for scholarships and fellowships."
    >
      <div className="rounded border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <h3 className="text-base font-bold text-slate-900">This phase does not include registration</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          We will add account creation in a later phase. This page collects no information.
        </p>
        <Button
          className="mt-5 justify-center rounded"
          size="md"
          to={ROUTES.applicant.login}
          variant="outline"
        >
          Back to Applicant Login
        </Button>
      </div>
    </AuthPageLayout>
  );
}
