import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, RefObject } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApplicantAuth } from '../../context/useApplicantAuth';
import { ROUTES } from '../../lib/constants';
import type { HomeAuthMode, HomeAuthNavigationState } from '../../types';
import { Button } from '../ui/Button';

interface LoginErrors {
  username?: string;
  password?: string;
  captcha?: string;
}

interface RegistrationErrors {
  applicantName?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
  email?: string;
  mobile?: string;
  captcha?: string;
}

interface RegistrationValues {
  applicantName: string;
  username: string;
  password: string;
  confirmPassword: string;
  email: string;
  mobile: string;
}

interface CaptchaFieldsProps {
  code: string;
  value: string;
  codeId: string;
  inputId: string;
  error?: string;
  inputRef: RefObject<HTMLInputElement>;
  onChange: (value: string) => void;
  onRefresh: () => void;
}

const captchaAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const usernamePattern = /^[A-Za-z][A-Za-z0-9._]{3,31}$/;

function createCaptchaCode() {
  const values = globalThis.crypto.getRandomValues(new Uint32Array(6));
  return Array.from(values, (value) => captchaAlphabet[value % captchaAlphabet.length]).join('');
}

function createRegistrationValues(): RegistrationValues {
  return {
    applicantName: '',
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    mobile: '',
  };
}

function describeIds(...ids: Array<string | undefined>) {
  return ids.filter(Boolean).join(' ') || undefined;
}

function getInputClass(hasError: boolean, extraClass = '') {
  return `w-full min-w-0 rounded border bg-white px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 ${extraClass} ${
    hasError
      ? 'border-red-600 focus:border-red-600 focus:ring-red-200'
      : 'border-slate-300 focus:border-gov-blue focus:ring-blue-100'
  }`;
}

function getRequestedHomeAuthMode(state: unknown): HomeAuthMode | null {
  if (typeof state !== 'object' || state === null) {
    return null;
  }

  const requestedMode = (state as Partial<HomeAuthNavigationState>).homeAuthMode;
  return requestedMode === 'applicant' || requestedMode === 'admin' || requestedMode === 'registration'
    ? requestedMode
    : null;
}

function getLoginUsernameError(username: string) {
  const value = username.trim();

  if (!value) {
    return 'Enter your username or email.';
  }

  if (value.includes('@') && !emailPattern.test(value)) {
    return 'Enter a valid email or username.';
  }

  return '';
}

function getApplicantNameError(applicantName: string) {
  const value = applicantName.trim().replace(/\s+/g, ' ');

  if (!value) {
    return 'Enter the applicant name.';
  }

  if (value.length < 2) {
    return 'Enter the full applicant name.';
  }

  if (value.length > 80) {
    return 'Enter an applicant name within 80 characters.';
  }

  return '';
}

function getRegistrationUsernameError(username: string) {
  const value = username.trim();

  if (!value) {
    return 'Enter a username.';
  }

  if (!usernamePattern.test(value)) {
    return 'Use 4–32 characters, start with a letter, and include only letters, numbers, dots, or underscores.';
  }

  return '';
}

function getRegistrationPasswordError(password: string) {
  if (!password) {
    return 'Enter a password.';
  }

  const valid =
    password.length >= 10 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9\s]/.test(password);

  return valid ? '' : 'Use at least 10 characters with uppercase, lowercase, number, and symbol.';
}

function getEmailError(email: string) {
  const value = email.trim();

  if (!value) {
    return '';
  }

  return emailPattern.test(value) ? '' : 'Enter a valid Email ID.';
}

function getMobileError(mobile: string) {
  const value = mobile.trim();

  if (!value) {
    return '';
  }

  const normalized = value.replace(/[\s()-]/g, '');
  return /^\+?[0-9]{10,15}$/.test(normalized) ? '' : 'Enter a valid mobile number with country code if needed.';
}

function getCaptchaError(value: string, code: string) {
  if (!value.trim()) {
    return 'Enter the CAPTCHA code.';
  }

  return value.trim().toUpperCase() === code ? '' : 'Enter the CAPTCHA code shown.';
}

function getPasswordStrength(password: string) {
  const score =
    Number(password.length >= 10) +
    Number(/[A-Z]/.test(password) && /[a-z]/.test(password)) +
    Number(/\d/.test(password)) +
    Number(/[^A-Za-z0-9\s]/.test(password));
  const label = score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong';
  const barClass = score <= 1 ? 'bg-red-500' : score === 2 ? 'bg-amber-500' : score === 3 ? 'bg-blue-600' : 'bg-emerald-600';
  const textClass = score <= 1 ? 'text-red-700' : score === 2 ? 'text-amber-700' : score === 3 ? 'text-blue-700' : 'text-emerald-700';

  return { score, label, barClass, textClass };
}

function CaptchaFields({
  code,
  value,
  codeId,
  inputId,
  error,
  inputRef,
  onChange,
  onRefresh,
}: CaptchaFieldsProps) {
  const errorId = `${inputId}-error`;

  return (
    <>
      <div>
        <span className="block text-xs font-semibold text-slate-700 mb-1">CAPTCHA (Demo)</span>
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center justify-center rounded border border-slate-300 bg-slate-100 px-3 py-2">
            <span
              className="font-mono text-sm font-bold tracking-[0.3em] text-gov-blue-dark"
              id={codeId}
              aria-live="polite"
            >
              {code}
            </span>
          </div>
          <Button
            className="min-h-11 flex-shrink-0 rounded px-3 text-[11px]"
            onClick={onRefresh}
            size="md"
            type="button"
            variant="outline"
          >
            Refresh CAPTCHA
          </Button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor={inputId}>
          Enter CAPTCHA
        </label>
        <input
          ref={inputRef}
          id={inputId}
          name="captcha"
          type="text"
          value={value}
          placeholder="Enter the 6-character code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={6}
          aria-invalid={Boolean(error)}
          aria-describedby={describeIds(codeId, error ? errorId : undefined)}
          onChange={(event) => onChange(event.target.value)}
          className={`${getInputClass(Boolean(error))} uppercase tracking-wider`}
        />
        {error ? (
          <p className="mt-1 text-[11px] font-medium text-red-700" id={errorId}>
            {error}
          </p>
        ) : null}
      </div>
    </>
  );
}

export function HomeLoginCard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn } = useApplicantAuth();
  const requestedMode = getRequestedHomeAuthMode(location.state);
  const [mode, setMode] = useState<HomeAuthMode>(() => requestedMode ?? 'applicant');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registrationValues, setRegistrationValues] = useState<RegistrationValues>(createRegistrationValues);
  const [showRegistrationPassword, setShowRegistrationPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaCode, setCaptchaCode] = useState(createCaptchaCode);
  const [captchaInput, setCaptchaInput] = useState('');
  const [loginErrors, setLoginErrors] = useState<LoginErrors>({});
  const [registrationErrors, setRegistrationErrors] = useState<RegistrationErrors>({});
  const [status, setStatus] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const loginUsernameRef = useRef<HTMLInputElement>(null);
  const loginPasswordRef = useRef<HTMLInputElement>(null);
  const applicantNameRef = useRef<HTMLInputElement>(null);
  const registrationUsernameRef = useRef<HTMLInputElement>(null);
  const registrationPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const captchaRef = useRef<HTMLInputElement>(null);
  const handledLocationKeyRef = useRef<string | null>(null);

  const isAdmin = mode === 'admin';
  const isRegistration = mode === 'registration';
  const heading = isRegistration ? 'Applicant Registration' : isAdmin ? 'Admin Login Here' : 'Applicant Login Here';
  const usernameLabel = isAdmin ? 'Admin Username / Email' : 'Username / Email';
  const loginLabel = isAdmin ? 'Admin Login' : 'Login Here';
  const passwordStrength = getPasswordStrength(registrationValues.password);

  const resetCard = useCallback((nextMode: HomeAuthMode) => {
    setMode(nextMode);
    setLoginUsername('');
    setLoginPassword('');
    setRegistrationValues(createRegistrationValues());
    setShowRegistrationPassword(false);
    setShowConfirmPassword(false);
    setCaptchaCode(createCaptchaCode());
    setCaptchaInput('');
    setLoginErrors({});
    setRegistrationErrors({});
    setStatus('');
  }, []);

  const focusCardHeading = useCallback((shouldScroll: boolean) => {
    window.requestAnimationFrame(() => {
      const headingElement = headingRef.current;

      if (!headingElement) {
        return;
      }

      if (shouldScroll) {
        headingElement.scrollIntoView({ block: 'center' });
      }

      headingElement.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    if (
      location.pathname !== ROUTES.home ||
      !requestedMode ||
      handledLocationKeyRef.current === location.key
    ) {
      return;
    }

    handledLocationKeyRef.current = location.key;
    resetCard(requestedMode);
    focusCardHeading(true);
  }, [focusCardHeading, location.key, location.pathname, requestedMode, resetCard]);

  function switchMode(nextMode: HomeAuthMode) {
    resetCard(nextMode);
    focusCardHeading(false);
  }

  function updateLoginUsername(value: string) {
    setLoginUsername(value);
    setLoginErrors((current) => ({ ...current, username: '' }));
    setStatus('');
  }

  function updateLoginPassword(value: string) {
    setLoginPassword(value);
    setLoginErrors((current) => ({ ...current, password: '' }));
    setStatus('');
  }

  function updateRegistrationField(field: keyof RegistrationValues, value: string) {
    setRegistrationValues((current) => ({ ...current, [field]: value }));
    setRegistrationErrors((current) => ({ ...current, [field]: '' }));
    setStatus('');
  }

  function updateCaptcha(value: string) {
    setCaptchaInput(value.toUpperCase());
    setLoginErrors((current) => ({ ...current, captcha: '' }));
    setRegistrationErrors((current) => ({ ...current, captcha: '' }));
    setStatus('');
  }

  function refreshCaptcha() {
    setCaptchaCode(createCaptchaCode());
    setCaptchaInput('');
    setLoginErrors((current) => ({ ...current, captcha: '' }));
    setRegistrationErrors((current) => ({ ...current, captcha: '' }));
    setStatus('CAPTCHA refreshed.');
  }

  function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: LoginErrors = {
      username: getLoginUsernameError(loginUsername),
      password: loginPassword.trim() ? '' : 'Enter your password.',
      captcha: getCaptchaError(captchaInput, captchaCode),
    };

    setLoginErrors(nextErrors);

    if (nextErrors.username) {
      loginUsernameRef.current?.focus();
      return;
    }

    if (nextErrors.password) {
      loginPasswordRef.current?.focus();
      return;
    }

    if (nextErrors.captcha) {
      captchaRef.current?.focus();
      return;
    }

    if (isAdmin) {
      setStatus('Admin authentication will be connected in a later phase.');
      return;
    }

    signIn(loginUsername);
    navigate(ROUTES.applicant.dashboard);
  }

  function handleRegistrationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: RegistrationErrors = {
      applicantName: getApplicantNameError(registrationValues.applicantName),
      username: getRegistrationUsernameError(registrationValues.username),
      password: getRegistrationPasswordError(registrationValues.password),
      confirmPassword: !registrationValues.confirmPassword
        ? 'Confirm the password.'
        : registrationValues.confirmPassword === registrationValues.password
          ? ''
          : 'Passwords do not match.',
      email: getEmailError(registrationValues.email),
      mobile: getMobileError(registrationValues.mobile),
      captcha: getCaptchaError(captchaInput, captchaCode),
    };

    setRegistrationErrors(nextErrors);

    if (nextErrors.applicantName) {
      applicantNameRef.current?.focus();
      return;
    }

    if (nextErrors.username) {
      registrationUsernameRef.current?.focus();
      return;
    }

    if (nextErrors.password) {
      registrationPasswordRef.current?.focus();
      return;
    }

    if (nextErrors.confirmPassword) {
      confirmPasswordRef.current?.focus();
      return;
    }

    if (nextErrors.email) {
      emailRef.current?.focus();
      return;
    }

    if (nextErrors.mobile) {
      mobileRef.current?.focus();
      return;
    }

    if (nextErrors.captcha) {
      captchaRef.current?.focus();
      return;
    }

    setRegistrationValues((current) => ({ ...current, password: '', confirmPassword: '' }));
    setShowRegistrationPassword(false);
    setShowConfirmPassword(false);
    setStatus(
      'Registration cannot continue. We created no account. The service did not check username availability. It did not verify any email or mobile number.',
    );
  }

  return (
    <div
      id="home-login"
      className="lg:col-span-4 lg:h-[34rem] lg:overflow-hidden lg:flex lg:flex-col bg-white/95 text-slate-900 p-4 rounded-lg shadow-lg border border-slate-200 scroll-mt-24"
      data-purpose="home-login-card"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-1.5 mb-3 lg:shrink-0">
        <h3
          ref={headingRef}
          id="home-authentication-card-heading"
          tabIndex={-1}
          className="text-sm font-bold text-gov-blue-dark focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {heading}
        </h3>
        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
          Demo Access
        </span>
      </div>

      {isRegistration ? (
        <form
          className="space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1"
          aria-labelledby="home-authentication-card-heading"
          noValidate
          onSubmit={handleRegistrationSubmit}
        >
          <p className="rounded border border-amber-300 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900">
            This frontend scaffold cannot create accounts or check usernames. It cannot send email or mobile verification. Use test data only.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="home-registration-name">
              Applicant Name
            </label>
            <input
              ref={applicantNameRef}
              id="home-registration-name"
              name="applicantName"
              type="text"
              value={registrationValues.applicantName}
              placeholder="Enter full applicant name"
              autoComplete="name"
              required
              aria-invalid={Boolean(registrationErrors.applicantName)}
              aria-describedby={registrationErrors.applicantName ? 'home-registration-name-error' : undefined}
              onChange={(event) => updateRegistrationField('applicantName', event.target.value)}
              className={getInputClass(Boolean(registrationErrors.applicantName))}
            />
            {registrationErrors.applicantName ? (
              <p className="mt-1 text-[11px] font-medium text-red-700" id="home-registration-name-error">
                {registrationErrors.applicantName}
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="home-registration-username">
              Username
            </label>
            <input
              ref={registrationUsernameRef}
              id="home-registration-username"
              name="username"
              type="text"
              value={registrationValues.username}
              placeholder="Create a username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              aria-invalid={Boolean(registrationErrors.username)}
              aria-describedby={describeIds(
                'home-registration-username-help',
                registrationErrors.username ? 'home-registration-username-error' : undefined,
              )}
              onChange={(event) => updateRegistrationField('username', event.target.value)}
              className={getInputClass(Boolean(registrationErrors.username))}
            />
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500" id="home-registration-username-help">
              Use 4–32 characters. The registration service will check availability after it connects.
            </p>
            {registrationErrors.username ? (
              <p className="mt-1 text-[11px] font-medium text-red-700" id="home-registration-username-error">
                {registrationErrors.username}
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="home-registration-password">
              Password
            </label>
            <div className="relative">
              <input
                ref={registrationPasswordRef}
                id="home-registration-password"
                name="password"
                type={showRegistrationPassword ? 'text' : 'password'}
                value={registrationValues.password}
                placeholder="Create a secure password"
                autoComplete="new-password"
                required
                aria-invalid={Boolean(registrationErrors.password)}
                aria-describedby={describeIds(
                  'home-registration-password-help',
                  registrationErrors.password ? 'home-registration-password-error' : undefined,
                )}
                onChange={(event) => updateRegistrationField('password', event.target.value)}
                className={getInputClass(Boolean(registrationErrors.password), 'pr-20')}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex min-w-16 items-center justify-center rounded-r px-2 text-[11px] font-semibold text-gov-blue hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200"
                aria-label={`${showRegistrationPassword ? 'Hide' : 'Show'} password`}
                aria-pressed={showRegistrationPassword}
                onClick={() => setShowRegistrationPassword((current) => !current)}
              >
                {showRegistrationPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="mt-1.5" aria-live="polite">
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className={passwordStrength.textClass}>{passwordStrength.label}</span>
                <span className="text-slate-500">{passwordStrength.score}/4</span>
              </div>
              <div
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200"
                role="meter"
                aria-label="Password strength"
                aria-valuemin={0}
                aria-valuemax={4}
                aria-valuenow={passwordStrength.score}
                aria-valuetext={passwordStrength.label}
              >
                <div
                  className={`h-full rounded-full ${passwordStrength.barClass}`}
                  style={{ width: `${passwordStrength.score * 25}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500" id="home-registration-password-help">
                Use 10 or more characters. Include uppercase, lowercase, number, and symbol.
              </p>
            </div>
            {registrationErrors.password ? (
              <p className="mt-1 text-[11px] font-medium text-red-700" id="home-registration-password-error">
                {registrationErrors.password}
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="home-registration-confirm-password">
              Confirm Password
            </label>
            <div className="relative">
              <input
                ref={confirmPasswordRef}
                id="home-registration-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={registrationValues.confirmPassword}
                placeholder="Re-enter the password"
                autoComplete="new-password"
                required
                aria-invalid={Boolean(registrationErrors.confirmPassword)}
                aria-describedby={registrationErrors.confirmPassword ? 'home-registration-confirm-password-error' : undefined}
                onChange={(event) => updateRegistrationField('confirmPassword', event.target.value)}
                className={getInputClass(Boolean(registrationErrors.confirmPassword), 'pr-20')}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex min-w-16 items-center justify-center rounded-r px-2 text-[11px] font-semibold text-gov-blue hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-200"
                aria-label={`${showConfirmPassword ? 'Hide' : 'Show'} confirmed password`}
                aria-pressed={showConfirmPassword}
                onClick={() => setShowConfirmPassword((current) => !current)}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {registrationErrors.confirmPassword ? (
              <p className="mt-1 text-[11px] font-medium text-red-700" id="home-registration-confirm-password-error">
                {registrationErrors.confirmPassword}
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="home-registration-email">
              Email ID <span className="font-normal text-slate-500">(Optional)</span>
            </label>
            <input
              ref={emailRef}
              id="home-registration-email"
              name="email"
              type="email"
              value={registrationValues.email}
              placeholder="name@example.com"
              autoComplete="email"
              inputMode="email"
              aria-invalid={Boolean(registrationErrors.email)}
              aria-describedby={describeIds(
                'home-registration-email-help',
                registrationErrors.email ? 'home-registration-email-error' : undefined,
              )}
              onChange={(event) => updateRegistrationField('email', event.target.value)}
              className={getInputClass(Boolean(registrationErrors.email))}
            />
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500" id="home-registration-email-help">
              {registrationValues.email
                ? 'You must verify this email. The email service is unavailable.'
                : 'Optional. You must verify any Email ID before registration.'}
            </p>
            {registrationErrors.email ? (
              <p className="mt-1 text-[11px] font-medium text-red-700" id="home-registration-email-error">
                {registrationErrors.email}
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="home-registration-mobile">
              Mobile Number <span className="font-normal text-slate-500">(Optional)</span>
            </label>
            <input
              ref={mobileRef}
              id="home-registration-mobile"
              name="mobile"
              type="tel"
              value={registrationValues.mobile}
              placeholder="Enter mobile number"
              autoComplete="tel"
              inputMode="tel"
              maxLength={18}
              aria-invalid={Boolean(registrationErrors.mobile)}
              aria-describedby={describeIds(
                'home-registration-mobile-help',
                registrationErrors.mobile ? 'home-registration-mobile-error' : undefined,
              )}
              onChange={(event) => updateRegistrationField('mobile', event.target.value)}
              className={getInputClass(Boolean(registrationErrors.mobile))}
            />
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500" id="home-registration-mobile-help">
              {registrationValues.mobile
                ? 'You must verify this number by OTP. The SMS service is unavailable.'
                : 'Optional. You must verify any mobile number by OTP.'}
            </p>
            {registrationErrors.mobile ? (
              <p className="mt-1 text-[11px] font-medium text-red-700" id="home-registration-mobile-error">
                {registrationErrors.mobile}
              </p>
            ) : null}
          </div>

          <CaptchaFields
            code={captchaCode}
            value={captchaInput}
            codeId="home-registration-captcha-code"
            inputId="home-registration-captcha"
            error={registrationErrors.captcha}
            inputRef={captchaRef}
            onChange={updateCaptcha}
            onRefresh={refreshCaptcha}
          />

          {status ? (
            <p className="rounded border border-blue-200 bg-blue-50 px-2.5 py-2 text-[11px] leading-relaxed text-blue-900" role="status">
              {status}
            </p>
          ) : null}

          <Button className="w-full justify-center rounded" size="md" type="submit">
            Register
          </Button>
        </form>
      ) : (
        <form
          className="space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1"
          aria-labelledby="home-authentication-card-heading"
          noValidate
          onSubmit={handleLoginSubmit}
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="home-login-username">
              {usernameLabel}
            </label>
            <input
              ref={loginUsernameRef}
              id="home-login-username"
              name="username"
              type="text"
              value={loginUsername}
              placeholder={isAdmin ? 'Admin username or email' : 'Username or email'}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={Boolean(loginErrors.username)}
              aria-describedby={loginErrors.username ? 'home-login-username-error' : undefined}
              onChange={(event) => updateLoginUsername(event.target.value)}
              className={getInputClass(Boolean(loginErrors.username))}
            />
            {loginErrors.username ? (
              <p className="mt-1 text-[11px] font-medium text-red-700" id="home-login-username-error">
                {loginErrors.username}
              </p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1" htmlFor="home-login-password">
              Password
            </label>
            <input
              ref={loginPasswordRef}
              id="home-login-password"
              name="password"
              type="password"
              value={loginPassword}
              placeholder="Enter your password"
              autoComplete="current-password"
              aria-invalid={Boolean(loginErrors.password)}
              aria-describedby={loginErrors.password ? 'home-login-password-error' : undefined}
              onChange={(event) => updateLoginPassword(event.target.value)}
              className={getInputClass(Boolean(loginErrors.password))}
            />
            {loginErrors.password ? (
              <p className="mt-1 text-[11px] font-medium text-red-700" id="home-login-password-error">
                {loginErrors.password}
              </p>
            ) : null}
          </div>

          <CaptchaFields
            code={captchaCode}
            value={captchaInput}
            codeId="home-login-captcha-code"
            inputId="home-login-captcha"
            error={loginErrors.captcha}
            inputRef={captchaRef}
            onChange={updateCaptcha}
            onRefresh={refreshCaptcha}
          />

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
      )}

      <div className="mt-4 border-t border-slate-200 pt-3 lg:shrink-0">
        {isRegistration ? (
          <div className="space-y-2">
            <p className="text-center text-[11px] font-medium text-slate-600">Already have an account?</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <Button
                className="w-full justify-center rounded"
                onClick={() => switchMode('applicant')}
                size="md"
                type="button"
              >
                Applicant Login
              </Button>
              <Button
                className="w-full justify-center rounded"
                onClick={() => switchMode('admin')}
                size="md"
                type="button"
                variant="outline"
              >
                Admin Login
              </Button>
            </div>
          </div>
        ) : (
          <Button
            className="w-full justify-center rounded"
            onClick={() => switchMode(isAdmin ? 'applicant' : 'admin')}
            size="md"
            type="button"
            variant="outline"
          >
            {isAdmin ? 'Applicant Login' : 'Admin Login'}
          </Button>
        )}
      </div>
    </div>
  );
}
