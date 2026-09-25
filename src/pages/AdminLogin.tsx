import { AuthPageLayout } from '../components/auth/AuthPageLayout';
import { LoginForm } from '../components/auth/LoginForm';

export function AdminLogin() {
  return (
    <AuthPageLayout
      variant="admin"
      eyebrow="Administration Portal"
      title="Admin Login"
      description="Authorized personnel only. Sign in to access the administration portal."
    >
      <LoginForm
        formId="admin-login"
        identifierLabel="Official Email / Username"
        identifierPlaceholder="Official email or username"
        identifierMode="emailOrUsername"
      />
    </AuthPageLayout>
  );
}
