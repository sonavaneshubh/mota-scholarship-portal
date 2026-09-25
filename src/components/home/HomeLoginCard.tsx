import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../ui/Button';

type LoginMode = 'applicant' | 'admin';

interface LoginErrors {
  username?: string;
  password?: string;
  captcha?: string;
}

const captchaAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createCaptchaCode() {
  const values = globalThis.crypto.getRandomValues(new Uint32Array(6));
  return Array.from(values, (value) => captchaAlphabet[value % captchaAlphabet.length]).join('');
}

function getUsernameError(username: string) {
  const value = username.trim();

  if (!value) {
    return 'Enter your username or email.';
  }

  if (value.includes('@') && !emailPattern.test(value)) {
    return 'Enter a valid email or username.';
  }

  return '';
}

export function HomeLoginCard() {
  const [mode, setMode] = useState<LoginMode>('applicant');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaCode, setCaptchaCode] = useState(createCaptchaCode);
  const [captchaInput, setCaptchaInput] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [status, setStatus] = useState('');
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const captchaRef = useRef<HTMLInputElement>(null);

  const isAdmin = mode === 'admin';
  const heading = isAdmin ? 'Admin Login Here' : 'Applicant Login Here';
  const usernameLabel = isAdmin ? 'Admin Username / Email' : 'Username / Email';
  const loginLabel = isAdmin ? 'Admin Login' : 'Login Here';

  function updateUsername(value: string) {
    setUsername(value);
    setErrors((current) => ({ ...current, username: '' }));
    setStatus('');
  }

  function updatePassword(value: string) {
    setPassword(value);
    setErrors((current) => ({ ...current, password: '' }));
    setStatus('');
  }

  function updateCaptcha(value: string) {
    setCaptchaInput(value.toUpperCase());
    setErrors((current) => ({ ...current, captcha: '' }));
    setStatus('');
  }

  function refreshCaptcha() {
    setCaptchaCode(createCaptchaCode());
    setCaptchaInput('');
    setErrors((current) => ({ ...current, captcha: '' }));
    setStatus('CAPTCHA refreshed.');
  }

  function switchMode(nextMode: LoginMode) {
    setMode(nextMode);
    setUsername('');
    setPassword('');
    setCaptchaCode(createCaptchaCode());
    setCaptchaInput('');
    setErrors({});
    setStatus('');
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: LoginErrors = {
      username: getUsernameError(username),
      password: password.trim() ? '' : 'Enter your password.',
      captcha: captchaInput.trim()
        ? captchaInput.trim().toUpperCase() === captchaCode
          ? ''
          : 'Enter the CAPTCHA code shown.'
        : 'Enter the CAPTCHA code.',
    };

    setErrors(nextErrors);

    if (nextErrors.username) {
      usernameRef.current?.focus();
      return;
    }

    if (nextErrors.password) {
      passwordRef.current?.focus();
      return;
    }

    if (nextErrors.captcha) {
      captchaRef.current?.focus();
      return;
    }

    setStatus('This phase does not include authentication. We did not submit your details.');
  }

  return (
    <div
      className="lg:col-span-4 bg-white/95 text-slate-900 p-4 rounded-lg shadow-lg border border-slate-200"
      data-purpose="home-login-card"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-1.5 mb-3">
        <h3 className="text-sm font-bold text-gov-blue-dark">{heading}</h3>
        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
          UI Only
        </span>
      </div>

      <form className="space-y-3" noValidate onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="home-login-username">
            {usernameLabel}
          </label>
          <input
            ref={usernameRef}
            id="home-login-username"
            name="username"
            type="text"
            value={username}
            placeholder={isAdmin ? 'Admin username or email' : 'Username or email'}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={Boolean(errors.username)}
            aria-describedby={errors.username ? 'home-login-username-error' : undefined}
            onChange={(event) => updateUsername(event.target.value)}
            className={`w-full text-xs px-2.5 py-2 border rounded bg-white focus:outline-none focus:ring-2 ${
              errors.username
                ? 'border-red-600 focus:border-red-600 focus:ring-red-200'
                : 'border-slate-300 focus:border-gov-blue focus:ring-blue-100'
            }`}
          />
          {errors.username ? (
            <p className="mt-1 text-[11px] font-medium text-red-700" id="home-login-username-error">
              {errors.username}
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="home-login-password">
            Password
          </label>
          <input
            ref={passwordRef}
            id="home-login-password"
            name="password"
            type="password"
            value={password}
            placeholder="Enter your password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'home-login-password-error' : undefined}
            onChange={(event) => updatePassword(event.target.value)}
            className={`w-full text-xs px-2.5 py-2 border rounded bg-white focus:outline-none focus:ring-2 ${
              errors.password
                ? 'border-red-600 focus:border-red-600 focus:ring-red-200'
                : 'border-slate-300 focus:border-gov-blue focus:ring-blue-100'
            }`}
          />
          {errors.password ? (
            <p className="mt-1 text-[11px] font-medium text-red-700" id="home-login-password-error">
              {errors.password}
            </p>
          ) : null}
        </div>

        <div>
          <span className="block text-xs font-semibold text-slate-700 mb-1">CAPTCHA (Demo)</span>
          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center justify-center rounded border border-slate-300 bg-slate-100 px-3 py-2">
              <span
                className="font-mono text-sm font-bold tracking-[0.3em] text-gov-blue-dark"
                id="home-login-captcha-code"
                aria-live="polite"
              >
                {captchaCode}
              </span>
            </div>
            <Button
              className="min-h-11 flex-shrink-0 rounded px-3 text-[11px]"
              onClick={refreshCaptcha}
              size="md"
              type="button"
              variant="outline"
            >
              Refresh CAPTCHA
            </Button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="home-login-captcha">
            Enter CAPTCHA
          </label>
          <input
            ref={captchaRef}
            id="home-login-captcha"
            name="captcha"
            type="text"
            value={captchaInput}
            placeholder="Enter the 6-character code"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={6}
            aria-invalid={Boolean(errors.captcha)}
            aria-describedby={`home-login-captcha-code${errors.captcha ? ' home-login-captcha-error' : ''}`}
            onChange={(event) => updateCaptcha(event.target.value)}
            className={`w-full text-xs px-2.5 py-2 border rounded bg-white uppercase tracking-wider focus:outline-none focus:ring-2 ${
              errors.captcha
                ? 'border-red-600 focus:border-red-600 focus:ring-red-200'
                : 'border-slate-300 focus:border-gov-blue focus:ring-blue-100'
            }`}
          />
          {errors.captcha ? (
            <p className="mt-1 text-[11px] font-medium text-red-700" id="home-login-captcha-error">
              {errors.captcha}
            </p>
          ) : null}
        </div>

        {status ? (
          <p className="rounded border border-blue-200 bg-blue-50 px-2.5 py-2 text-[11px] leading-relaxed text-blue-900" role="status">
            {status}
          </p>
        ) : null}

        <Button className="w-full justify-center rounded" size="md" type="submit">
          {loginLabel}
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
          <button
            className="min-h-11 px-1.5 font-semibold text-gov-blue underline underline-offset-2 hover:text-gov-saffron"
            type="button"
            onClick={() => setStatus('Password recovery will come in a later phase.')}
          >
            Forgot Password
          </button>
          <button
            className="min-h-11 px-1.5 font-semibold text-gov-blue underline underline-offset-2 hover:text-gov-saffron"
            type="button"
            onClick={() => setStatus('Username recovery will come in a later phase.')}
          >
            Forgot Username
          </button>
        </div>
      </form>

      <div className="mt-4 border-t border-slate-200 pt-3">
        <Button
          className="w-full justify-center rounded"
          onClick={() => switchMode(isAdmin ? 'applicant' : 'admin')}
          size="md"
          type="button"
          variant="outline"
        >
          {isAdmin ? 'Applicant Login' : 'Admin Login'}
        </Button>
      </div>
    </div>
  );
}
