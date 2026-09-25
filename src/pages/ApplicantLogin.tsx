import { AuthPageLayout } from '../components/auth/AuthPageLayout';
import { LoginForm } from '../components/auth/LoginForm';
import { Button } from '../components/ui/Button';
import { ROUTES } from '../lib/constants';

export function ApplicantLogin() {
  return (
    <AuthPageLayout
      variant="applicant"
      eyebrow="Applicant Portal"
      title="Applicant Login"
      description="Sign in to access your scholarship and fellowship applications."
    >
      <LoginForm
        formId="applicant-login"
        identifierLabel="Email / Mobile Number"
        identifierPlaceholder="Email address or mobile number"
        identifierMode="emailOrMobile"
      />

      <div className="mt-6 border-t border-slate-200 pt-5 text-center">
        <p className="text-sm text-slate-600">New to the scholarship portal?</p>
        <Button
          className="mt-2 justify-center rounded"
          size="md"
          to={ROUTES.applicant.register}
          variant="outline"
        >
          Create Account / Register
        </Button>
      </div>
    </AuthPageLayout>
  );
}
