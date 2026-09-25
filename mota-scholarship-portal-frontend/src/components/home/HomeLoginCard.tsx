import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, RefObject } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApplicantAuth } from '../../context/useApplicantAuth';
import { useAdminAuth } from '../../context/useAdminAuth';
import { ADMIN_DEMO_IDENTIFIER, ADMIN_DEMO_PASSWORD } from '../../services/adminAuth';
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

interface HomeLoginCardProps {
  onModeChange?: (mode: HomeAuthMode) => void;
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

function getRequestedHomeAuthMode(state: unknown, pathname: string): HomeAuthMode | null {
  if (typeof state === 'object' && state !== null) {
    const requestedMode = (state as Partial<HomeAuthNavigationState>).homeAuthMode;

    if (requestedMode === 'applicant' || requestedMode === 'admin' || requestedMode === 'registration') {
      return requestedMode;
    }
  }

  if (pathname === ROUTES.applicant.login) {
    return 'applicant';
  }

  if (pathname === ROUTES.applicant.register) {
    return 'registration';
  }

  if (pathname === ROUTES.admin.login) {
    return 'admin';
  }

  return null;
}

function getLoginUsernameError(username: string) {
  const value = username.trim();

  if (!value) {
    return 'Enter your email address.';
  }

  return emailPattern.test(value) ? '' : 'Enter a valid email address.';
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
    return 'Enter your email address.';
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
        <span className="block text-xs font-semibold text-slate-700 mb-1">CAPTCHA</span>
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

export function HomeLoginCard({ onModeChange }: HomeLoginCardProps = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn, signUp, signOut, resetPassword } = useApplicantAuth();
  const { signIn: signInAdmin } = useAdminAuth();
  const requestedMode = getRequestedHomeAuthMode(location.state, location.pathname);
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
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
  const usernameLabel = isAdmin ? 'Admin Email' : 'Email';
  const loginLabel = isAdmin ? 'Admin Login' : 'Login Here';
  const passwordStrength = getPasswordStrength(registrationValues.password);
  const showUsernameGuidance =
    registrationValues.username.trim().length > 0 && Boolean(getRegistrationUsernameError(registrationValues.username));
  const showPasswordGuidance = registrationValues.password.length > 0 && passwordStrength.score < 4;
  const cardClassName = `bg-white/95 text-slate-900 rounded-lg shadow-lg border border-slate-200 scroll-mt-24 ${
    isRegistration
      ? 'p-3 lg:col-span-6 lg:h-auto lg:overflow-visible lg:flex lg:flex-col'
      : 'p-4 lg:col-span-4 lg:h-auto lg:overflow-visible lg:flex lg:flex-col'
  }`;

  useEffect(() => {
    onModeChange?.(mode);
  }, [mode, onModeChange]);

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
    const isAuthRoute =
      location.pathname === ROUTES.home ||
      location.pathname === ROUTES.applicant.login ||
      location.pathname === ROUTES.applicant.register ||
      location.pathname === ROUTES.admin.login;

    if (!isAuthRoute || !requestedMode || handledLocationKeyRef.current === location.key) {
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

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: LoginErrors = {
      username: getLoginUsernameError(loginUsername),
      password: loginPassword ? '' : 'Enter your password.',
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

    setIsSubmitting(true);

    try {
      if (isAdmin) {
        setIsAuthenticating(true);
        setStatus('Checking admin credentials…');

        try {
          const result = await signInAdmin(loginUsername, loginPassword, true);

          if (!result.ok) {
            setStatus(result.message ?? 'The admin ID or password is incorrect.');
            return;
          }

          navigate(ROUTES.admin.dashboard);
        } finally {
          setIsAuthenticating(false);
        }

        return;
      }

      const result = await signIn(loginUsername, loginPassword);

      if (!result.success) {
        setStatus(result.error ?? 'The email or password is incorrect.');
        return;
      }

      if (result.role !== 'applicant') {
        await signOut();
        setStatus('This account is not authorized for applicant access.');
        return;
      }

      navigate(ROUTES.applicant.dashboard);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDemoAdminLogin() {
    setIsSubmitting(true);
    setIsAuthenticating(true);
    setStatus('Signing in as Demo Admin…');

    try {
      const result = await signInAdmin(ADMIN_DEMO_IDENTIFIER, ADMIN_DEMO_PASSWORD, true);

      if (!result.ok) {
        setStatus(result.message ?? 'The admin ID or password is incorrect.');
        return;
      }

      navigate(ROUTES.admin.dashboard);
    } finally {
      setIsAuthenticating(false);
      setIsSubmitting(false);
    }
  }

  async function handleRegistrationSubmit(event: FormEvent<HTMLFormElement>) {
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

    setIsSubmitting(true);

    try {
      const result = await signUp({
        email: registrationValues.email,
        password: registrationValues.password,
        fullName: registrationValues.applicantName,
        username: registrationValues.username,
        mobile: registrationValues.mobile,
      });

      if (!result.success) {
        setStatus(result.error ?? 'Registration could not be completed. Please try again.');
        return;
      }

      setRegistrationValues((current) => ({ ...current, password: '', confirmPassword: '' }));
      setShowRegistrationPassword(false);
      setShowConfirmPassword(false);

      if (result.requiresEmailConfirmation) {
        setStatus('Account created. Check your email to confirm your address before signing in.');
        return;
      }

      if (result.role !== 'applicant') {
        await signOut();
        setStatus('This account is not authorized for applicant access.');
        return;
      }

      setStatus('Account created. Redirecting to your dashboard.');
      navigate(ROUTES.applicant.dashboard);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    const email = loginUsername.trim();
    const emailError = getLoginUsernameError(email);

    if (emailError) {
      setLoginErrors((current) => ({ ...current, username: emailError }));
      loginUsernameRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await resetPassword(email);

      if (!result.success) {
        setStatus(result.error ?? 'Password reset could not be requested. Please try again.');
        return;
      }

      setStatus('If an account exists for this email, a password reset link has been sent.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      id="home-login"
      className={cardClassName}
      data-purpose="home-login-card"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-1.5 mb-2 lg:shrink-0">
        <h3
          ref={headingRef}
          id="home-authentication-card-heading"
          tabIndex={-1}
          className="text-sm font-bold text-gov-blue-dark focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {heading}
        </h3>
        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
          Supabase Auth
        </span>
      </div>

      {isRegistration ? (
        <form
          className="grid gap-2 md:grid-cols-2 lg:min-h-0 lg:overflow-visible"
          aria-labelledby="home-authentication-card-heading"
          noValidate
          onSubmit={handleRegistrationSubmit}
        >
          <p className="rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-[10px] leading-snug text-amber-900 md:col-span-2">
            Your account is secured by Supabase Auth. Email confirmation is required when enabled by the project administrator.
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
              aria-invalid={Boolean(registrationErrors.username) || showUsernameGuidance}
              aria-describedby={describeIds(
                showUsernameGuidance ? 'home-registration-username-help' : undefined,
                registrationErrors.username ? 'home-registration-username-error' : undefined,
              )}
              onChange={(event) => updateRegistrationField('username', event.target.value)}
              className={getInputClass(Boolean(registrationErrors.username) || showUsernameGuidance)}
            />
            {showUsernameGuidance ? (
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500" id="home-registration-username-help">
                This display name is stored in your Supabase user metadata; it is not a public username service.
              </p>
            ) : null}
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
                aria-invalid={Boolean(registrationErrors.password) || showPasswordGuidance}
                aria-describedby={describeIds(
                  showPasswordGuidance ? 'home-registration-password-help' : undefined,
                  registrationErrors.password ? 'home-registration-password-error' : undefined,
                )}
                onChange={(event) => updateRegistrationField('password', event.target.value)}
                className={getInputClass(Boolean(registrationErrors.password) || showPasswordGuidance, 'pr-20')}
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
            {showPasswordGuidance ? (
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
            ) : null}
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
              Email ID <span className="font-normal text-slate-500">(Required)</span>
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
                ? 'We will send a Supabase confirmation link to this address.'
                : 'Enter the email address you will use to sign in.'}
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
                ? 'This number is stored in your Supabase user metadata. OTP verification is not configured.'
                : 'Optional. Mobile verification is not configured in this authentication phase.'}
            </p>
            {registrationErrors.mobile ? (
              <p className="mt-1 text-[11px] font-medium text-red-700" id="home-registration-mobile-error">
                {registrationErrors.mobile}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
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
          </div>

          {status ? (
            <p className="rounded border border-blue-200 bg-blue-50 px-2.5 py-2 text-[11px] leading-relaxed text-blue-900 md:col-span-2" role="status">
              {status}
            </p>
          ) : null}

          <Button className="w-full justify-center rounded md:col-span-2" disabled={isSubmitting} size="md" type="submit">
            {isSubmitting ? 'Creating account…' : 'Register'}
          </Button>
        </form>
      ) : (
        <form
          className="space-y-2 lg:min-h-0 lg:overflow-visible"
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
              placeholder={isAdmin ? 'Admin email' : 'Email address'}
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

          <Button className="w-full justify-center rounded" disabled={isSubmitting || isAuthenticating} size="md" type="submit">
            {isSubmitting || isAuthenticating ? 'Signing in…' : loginLabel}
          </Button>

          {isAdmin ? (
            <div className="pt-2 border-t border-slate-200">
              <Button
                className="w-full justify-center rounded bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold border border-amber-600 shadow-xs"
                disabled={isSubmitting || isAuthenticating}
                size="md"
                type="button"
                onClick={handleDemoAdminLogin}
              >
                {isSubmitting || isAuthenticating ? 'Accessing Demo Admin…' : 'Login as Demo Admin (View All Data)'}
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
            <button
              className="min-h-11 px-1.5 font-semibold text-gov-blue underline underline-offset-2 hover:text-gov-saffron"
              type="button"
              disabled={isSubmitting}
              onClick={handleForgotPassword}
            >
              Forgot Password
            </button>
            <button
              className="min-h-11 px-1.5 font-semibold text-gov-blue underline underline-offset-2 hover:text-gov-saffron"
              type="button"
              onClick={() => setStatus('Username recovery is not available. Use your email address to sign in.')}
            >
              Forgot Username
            </button>
          </div>
        </form>
      )}

      <div className={`${isRegistration ? 'mt-2 pt-2' : 'mt-1 pt-1'} border-t border-slate-200 lg:shrink-0`}>
        {isRegistration ? (
          <div className={isRegistration ? 'space-y-1.5' : 'space-y-2'}>
            <p className="text-center text-[11px] font-medium text-slate-600">Already have an account?</p>
            <div className="grid gap-0 sm:grid-cols-2">
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
