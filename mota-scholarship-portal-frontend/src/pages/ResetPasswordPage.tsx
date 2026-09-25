import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApplicantAuth } from '../context/useApplicantAuth';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ROUTES } from '../lib/constants';

function getPasswordError(password: string) {
  if (!password) {
    return 'Enter a new password.';
  }

  if (password.length < 10 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9\s]/.test(password)) {
    return 'Use at least 10 characters with uppercase, lowercase, number, and symbol.';
  }

  return '';
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { session, loading, updatePassword } = useApplicantAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextPasswordError = getPasswordError(password);
    const nextConfirmPasswordError = !confirmPassword
      ? 'Confirm your new password.'
      : confirmPassword === password
        ? ''
        : 'Passwords do not match.';

    setPasswordError(nextPasswordError);
    setConfirmPasswordError(nextConfirmPasswordError);

    if (nextPasswordError || nextConfirmPasswordError) {
      return;
    }

    setIsSubmitting(true);
    setStatus('');

    try {
      const result = await updatePassword(password);

      if (!result.success) {
        setStatus(result.error ?? 'Password could not be updated. Please try again.');
        return;
      }

      setPassword('');
      setConfirmPassword('');
      setStatus('Your password has been updated. You can now sign in with the new password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="mx-auto flex min-h-[50vh] max-w-xl items-center justify-center px-4 py-12">
        <p className="text-sm text-slate-600" role="status">Checking your password reset link…</p>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="mx-auto max-w-xl px-4 py-12">
        <Card className="p-6" accentClass="">
          <h1 className="text-2xl font-bold text-gov-blue-dark">Password reset link unavailable</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">This reset link is invalid or has expired. Request a new link from the login page.</p>
          <Button className="mt-6" onClick={() => navigate(ROUTES.applicant.login)} size="md">Back to login</Button>
        </Card>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-12">
      <Card className="p-6" accentClass="">
        <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Secure account recovery</p>
        <h1 className="mt-2 text-2xl font-bold text-gov-blue-dark">Create a new password</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">Use a strong password you do not reuse on another service.</p>
        <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="reset-password">New password</label>
            <input
              autoComplete="new-password"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-gov-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
              id="reset-password"
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordError('');
                setStatus('');
              }}
              type="password"
              value={password}
            />
            {passwordError ? <p className="mt-1 text-xs font-medium text-red-700" role="alert">{passwordError}</p> : null}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700" htmlFor="reset-confirm-password">Confirm new password</label>
            <input
              autoComplete="new-password"
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-gov-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
              id="reset-confirm-password"
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setConfirmPasswordError('');
                setStatus('');
              }}
              type="password"
              value={confirmPassword}
            />
            {confirmPasswordError ? <p className="mt-1 text-xs font-medium text-red-700" role="alert">{confirmPasswordError}</p> : null}
          </div>
          {status ? <p className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900" role="status">{status}</p> : null}
          <Button className="w-full justify-center" disabled={isSubmitting} size="md" type="submit">
            {isSubmitting ? 'Updating password…' : 'Update password'}
          </Button>
        </form>
      </Card>
    </section>
  );
}
