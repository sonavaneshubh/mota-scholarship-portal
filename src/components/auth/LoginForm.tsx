import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../ui/Button';

type IdentifierMode = 'emailOrMobile' | 'emailOrUsername';

interface LoginFormProps {
  formId: string;
  identifierLabel: string;
  identifierPlaceholder: string;
  identifierMode: IdentifierMode;
}

interface FieldErrors {
  identifier?: string;
  password?: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getIdentifierError(identifier: string, mode: IdentifierMode) {
  const value = identifier.trim();

  if (!value) {
    return mode === 'emailOrMobile'
      ? 'Enter your email address or mobile number.'
      : 'Enter your official email or username.';
  }

  if (mode === 'emailOrMobile' && value.includes('@') && !emailPattern.test(value)) {
    return 'Enter a valid email address or mobile number.';
  }

  return '';
}

export function LoginForm({ formId, identifierLabel, identifierPlaceholder, identifierMode }: LoginFormProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const identifierInputId = `${formId}-identifier`;
  const identifierErrorId = `${formId}-identifier-error`;
  const passwordInputId = `${formId}-password`;
  const passwordErrorId = `${formId}-password-error`;
  const noticeId = `${formId}-notice`;

  function updateIdentifier(value: string) {
    setIdentifier(value);
    setErrors((current) => ({ ...current, identifier: '' }));
    setNotice('');
  }

  function updatePassword(value: string) {
    setPassword(value);
    setErrors((current) => ({ ...current, password: '' }));
    setNotice('');
  }

  function handleIdentifierBlur() {
    setErrors((current) => ({
      ...current,
      identifier: getIdentifierError(identifier, identifierMode),
    }));
  }

  function handlePasswordBlur() {
    setErrors((current) => ({
      ...current,
      password: password.trim() ? '' : 'Enter your password.',
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors = {
      identifier: getIdentifierError(identifier, identifierMode),
      password: password.trim() ? '' : 'Enter your password.',
    };

    setErrors(nextErrors);

    if (nextErrors.identifier) {
      identifierRef.current?.focus();
      return;
    }

    if (nextErrors.password) {
      passwordRef.current?.focus();
      return;
    }

    setNotice('This phase does not include authentication. We did not submit your details.');
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700" htmlFor={identifierInputId}>
            {identifierLabel}
          </label>
          <input
            ref={identifierRef}
            id={identifierInputId}
            name="identifier"
            type="text"
            value={identifier}
            placeholder={identifierPlaceholder}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="next"
            aria-invalid={Boolean(errors.identifier)}
            aria-describedby={errors.identifier ? identifierErrorId : undefined}
            onBlur={handleIdentifierBlur}
            onChange={(event) => updateIdentifier(event.target.value)}
            className={`w-full rounded border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
              errors.identifier
                ? 'border-red-600 focus:border-red-600 focus:ring-red-200'
                : 'border-slate-300 focus:border-gov-blue focus:ring-blue-100'
            }`}
          />
          {errors.identifier ? (
            <p className="mt-1.5 text-xs font-medium text-red-700" id={identifierErrorId}>
              {errors.identifier}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700" htmlFor={passwordInputId}>
            Password
          </label>
          <div className="relative">
            <input
              ref={passwordRef}
              id={passwordInputId}
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              placeholder="Enter your password"
              autoComplete="current-password"
              enterKeyHint="go"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? passwordErrorId : undefined}
              onBlur={handlePasswordBlur}
              onChange={(event) => updatePassword(event.target.value)}
              className={`w-full rounded border bg-white px-3 py-2.5 pr-20 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                errors.password
                  ? 'border-red-600 focus:border-red-600 focus:ring-red-200'
                  : 'border-slate-300 focus:border-gov-blue focus:ring-blue-100'
              }`}
            />
            <button
              type="button"
              className="absolute right-1 top-1/2 min-h-11 -translate-y-1/2 rounded px-3 text-xs font-semibold text-gov-blue hover:bg-blue-50 hover:text-gov-saffron"
              aria-controls={passwordInputId}
              aria-pressed={showPassword}
              onClick={() => {
                setShowPassword((current) => !current);
                setNotice('');
              }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.password ? (
            <p className="mt-1.5 text-xs font-medium text-red-700" id={passwordErrorId}>
              {errors.password}
            </p>
          ) : null}
        </div>
      </div>

      {notice ? (
        <p className="mt-4 rounded border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm text-blue-900" id={noticeId} role="status">
          {notice}
        </p>
      ) : null}

      <Button className="mt-5 w-full justify-center rounded text-sm" size="lg" type="submit">
        Login
      </Button>

      <div className="mt-3 text-center">
        <button
          type="button"
          className="min-h-11 text-sm font-semibold text-gov-blue underline underline-offset-2 hover:text-gov-saffron"
          onClick={() => setNotice('Password recovery will come in a later phase.')}
        >
          Forgot Password?
        </button>
      </div>
    </form>
  );
}
