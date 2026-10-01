import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, RefObject } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApplicantAuth } from '../../context/useApplicantAuth';
import { useAdminAuth } from '../../context/useAdminAuth';
import { ROUTES } from '../../lib/constants';
import { isSupabaseConfigured, supabaseConfigNotice } from '../../lib/supabase';
import {
  getRegistrationErrors,
  isValidOtp,
  isValidUsername,
  OTP_LENGTH,
  RESEND_COOLDOWN_SECONDS,
} from '../../lib/registrationConfig';
import { completeRegistration, resendOtp, startRegistration, verifyOtp } from '../../services/auth/registrationOtpService';
import type { RegistrationChannel, StartRegistrationData } from '../../services/auth/registrationOtpService';
import { signInDemoApplicant } from '../../services/demoApplicantAuth';
import type { HomeAuthMode, HomeAuthNavigationState } from '../../types';
import { Button } from '../ui/Button';
import { OtpInput } from '../auth/OtpInput';

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

/** Styling for the single status line, kept in one place so the two forms match. */
function getStatusClass(tone: 'info' | 'error') {
  return tone === 'error'
    ? 'rounded border border-red-300 bg-red-50 px-2.5 py-2 text-[11px] font-medium leading-relaxed text-red-800'
    : 'rounded border border-blue-200 bg-blue-50 px-2.5 py-2 text-[11px] leading-relaxed text-blue-900';
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

  return null;
}

function getLoginUsernameError(username: string) {
  const value = username.trim();

  if (!value) {
    return 'Enter your email address.';
  }

  return emailPattern.test(value) ? '' : 'Enter a valid email address.';
}

function getRegistrationUsernameError(username: string) {
  const value = username.trim();

  if (!value) {
    return 'Enter a username.';
  }

  // The rule itself lives in registrationConfig, beside the copy the server
  // applies, so the guidance shown while typing cannot drift from the rule that
  // is actually enforced.
  if (!isValidUsername(value)) {
    return 'Use 4–32 characters, start with a letter, and include only letters, numbers, dots, or underscores.';
  }

  return '';
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
    /*
     * The code and the field that types it share one row from sm up. Stacked,
     * these two blocks cost 58px + 52px plus a gap; side by side they cost one
     * 40px control row, which is where most of this card's height saving comes
     * from. It needs the card to be a col-span-5 (about 514px) rather than
     * col-span-4 (about 405px) - at 405 the code box, the refresh button and the
     * input cannot share a row without squeezing the 6-character code.
     *
     * The refresh button keeps its full accessible name via aria-label/title
     * while the visible text shortens to "Refresh", which is what makes the row
     * fit; it sits directly under a "CAPTCHA" label, so the context is there.
     * Below sm the grid collapses back to one column and nothing is lost.
     */
    <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
      <div>
        <span className="block text-xs font-semibold text-slate-700 mb-0.5">CAPTCHA</span>
        <div className="flex items-center gap-2">

          {/* h-[34px] matches getInputClass exactly (px-2.5 py-2 text-xs =
              8 + 8 + 16 + 2px border). The code box was 38px and the button
              40px, so the three controls in this row were visibly ragged; all
              three now sit on the same 34px line as the email and password
              inputs above them. */}
          <div className="flex h-[34px] min-w-0 flex-1 items-center justify-center rounded border border-slate-300 bg-slate-100 px-2">
            <span
              className="font-mono text-sm font-bold tracking-[0.3em] text-gov-blue-dark"
              id={codeId}
              aria-live="polite"
            >
              {code}
            </span>
          </div>
          <Button
            aria-label="Refresh CAPTCHA"
            className="h-[34px] flex-shrink-0 rounded px-2 text-[11px]"
            onClick={onRefresh}
            size="md"
            title="Refresh CAPTCHA"
            type="button"
            variant="outline"
          >
            Refresh
          </Button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-0.5" htmlFor={inputId}>
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
          className={`${getInputClass(Boolean(error), 'h-[34px]')} uppercase tracking-wider`}
        />
        {error ? (
          <p className="mt-1 text-[11px] font-medium text-red-700" id={errorId}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function HomeLoginCard({ onModeChange }: HomeLoginCardProps = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn, signOut, resetPassword } = useApplicantAuth();
  const { signIn: signInAdmin, signInDemo } = useAdminAuth();
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
  /**
   * Non-null once the form has been accepted and both codes are on their way.
   * Its presence is what swaps the registration form for the two verification
   * steps, so the applicant cannot go back to editing a submission that has
   * already been sent.
   */
  const [pendingAttempt, setPendingAttempt] = useState<StartRegistrationData | null>(null);
  /**
   * The chosen password, held for the length of the verification steps and sent
   * once, when the applicant completes registration. Deliberately React state
   * and nothing else: it is never written to localStorage or sessionStorage, so
   * a refresh loses it and the final step asks for it again rather than leaving
   * a plaintext copy in browser storage.
   */
  const [pendingPassword, setPendingPassword] = useState('');
  /**
   * The two codes, entered side by side on this same registration page.
   *
   * They are deliberately both visible at once rather than one channel at a
   * time. The applicant already has both messages on their phone, and making
   * them retype one code, wait for a panel swap, and then find the second box
   * is the part of this flow that used to be the most confusing. The server is
   * still the authority: `completeRegistration` refuses unless both proofs are
   * already recorded, so showing both boxes decides nothing.
   */
  const [emailOtp, setEmailOtp] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [emailOtpVerified, setEmailOtpVerified] = useState(false);
  const [mobileOtpVerified, setMobileOtpVerified] = useState(false);
  const [otpErrors, setOtpErrors] = useState<{ email?: string; mobile?: string }>({});
  const [otpNotice, setOtpNotice] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isCompletingRegistration, setIsCompletingRegistration] = useState(false);
  const [resendCooldownUntil, setResendCooldownUntil] = useState(0);
  // Drives the countdown label. One timer for both channels, cleared when the
  // wait is over, rather than one per resend.
  const [resendTick, setResendTick] = useState(() => Date.now());
  const [status, setStatus] = useState('');
  /**
   * Whether `status` reports a failure or a neutral notice.
   *
   * A rejected sign-in has to be unmistakable. While both kinds shared one
   * informational blue box, a failed login looked like the form had simply done
   * nothing, which is exactly how the deployed portal presented a missing
   * environment variable: no error, no navigation, no network request.
   */
  const [statusTone, setStatusTone] = useState<'info' | 'error'>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isDemoSubmitting, setIsDemoSubmitting] = useState(false);
  const [demoAdminError, setDemoAdminError] = useState('');
  // Separate from isDemoSubmitting: the two demo buttons are independent of each
  // other, and one being busy must not grey out the other.
  const [isDemoApplicantSubmitting, setIsDemoApplicantSubmitting] = useState(false);
  const [demoApplicantError, setDemoApplicantError] = useState('');
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
      : /*
          lg:max-w-[440px] trims the card from the 515px that col-span-5 gives
          at 1366px, and justify-self-end keeps its right edge on the
          container's right edge, so the space that comes back falls in the gap
          between the two columns instead of dangling off the page margin.
          Below ~1000px the column is already narrower than 440px, the cap does
          not bite, and the card just fills the track.

          440px is the floor while the CAPTCHA row stays on one line: it leaves
          (440 - 24px padding - 12px gutter) / 2 = 202px per column, and the
          code box plus the Refresh button need about 166px of that. The code
          box is min-w-0 flex-1, so below this width the code would start to
          compress against the button rather than the layout overflowing.
        */
        'p-3 lg:col-span-5 lg:col-start-8 lg:max-w-[440px] lg:justify-self-end lg:h-auto lg:overflow-visible lg:flex lg:flex-col'
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
    setStatusTone('info');
    setDemoAdminError('');
    setIsDemoSubmitting(false);
    setDemoApplicantError('');
    setIsDemoApplicantSubmitting(false);
    setPendingAttempt(null);
    setPendingPassword('');
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

  useEffect(() => {
    if (resendCooldownUntil <= Date.now()) {
      return;
    }

    const timer = window.setInterval(() => setResendTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldownUntil]);

  function switchMode(nextMode: HomeAuthMode) {
    resetCard(nextMode);
    focusCardHeading(false);
  }

  /**
   * Abandons an in-flight registration and returns to the form.
   *
   * The attempt itself is left to expire on the server, which is what releases
   * the email address and the mobile number for a genuine second try. Deleting
   * it here would let anyone cancel somebody else's attempt by guessing an id,
   * and would free the number while the codes are still deliverable.
   */
  function handleRegistrationRestart() {
    setPendingAttempt(null);
    setPendingPassword('');
    setEmailOtp('');
    setMobileOtp('');
    setEmailOtpVerified(false);
    setMobileOtpVerified(false);
    setOtpErrors({});
    setOtpNotice('');
    setResendCooldownUntil(0);
    setCaptchaCode(createCaptchaCode());
    setCaptchaInput('');
    setRegistrationErrors({});
    setStatus('');
    setStatusTone('info');
    focusCardHeading(true);
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
    /*
      Deliberately silent. This used to set "CAPTCHA refreshed.", which pushed a
      status paragraph into the form between the CAPTCHA row and the Login
      button and shoved the button down every time the code was refreshed. The
      code visibly changing is the whole feedback, so the status line is only
      cleared here, never written.
    */
    setStatus('');
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
        setStatusTone('info');
        setStatus('Checking admin credentials…');

        try {
          const result = await signInAdmin(loginUsername, loginPassword, true);

          if (!result.ok) {
            setStatusTone('error');
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
        // The reason is always shown, including the "not connected to the
        // authentication service" case. Swallowing it is what made a correctly
        // filled form appear to do nothing on the deployed site.
        setStatusTone('error');
        setStatus(result.error ?? 'Invalid email or password.');
        return;
      }

      if (result.role !== 'applicant') {
        await signOut();
        setStatusTone('error');
        setStatus('This account is not authorized for applicant access.');
        return;
      }

      navigate(ROUTES.applicant.dashboard);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegistrationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: RegistrationErrors = {
      ...getRegistrationErrors(registrationValues),
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
    setStatus('');
    setStatusTone('info');

    try {
      /*
       * Nothing is created here. This call only asks the server to open an
       * attempt and send the two codes, and it is the server that checks the
       * address and the number against the registered applicants. A duplicate
       * therefore comes back as a message on this form, before anything has
       * been sent and before any account exists.
       */
      const result = await startRegistration({
        email: registrationValues.email,
        mobile: registrationValues.mobile,
        fullName: registrationValues.applicantName,
        username: registrationValues.username,
        password: registrationValues.password,
      });

      if (!result.ok) {
        setStatusTone('error');
        setStatus(result.message);

        // The server is the authority on which field is the problem, so its
        // answer is mapped back onto the field it belongs to.
        if (result.code === 'EMAIL_TAKEN' || result.code === 'INVALID_EMAIL') {
          setRegistrationErrors((current) => ({ ...current, email: result.message }));
          emailRef.current?.focus();
        }

        if (result.code === 'MOBILE_TAKEN' || result.code === 'INVALID_MOBILE') {
          setRegistrationErrors((current) => ({ ...current, mobile: result.message }));
          mobileRef.current?.focus();
        }

        if (result.code === 'WEAK_PASSWORD') {
          setRegistrationErrors((current) => ({ ...current, password: result.message }));
          registrationPasswordRef.current?.focus();
        }

        if (result.code === 'INVALID_USERNAME') {
          setRegistrationErrors((current) => ({ ...current, username: result.message }));
          registrationUsernameRef.current?.focus();
        }

        return;
      }

      // The codes are away. From here the password is no longer on the form, so
      // it moves out of the inputs and into the single piece of state the
      // verification steps need, and out of the two password inputs below.
      setPendingPassword(registrationValues.password);
      setRegistrationValues((current) => ({ ...current, password: '', confirmPassword: '' }));
      setShowRegistrationPassword(false);
      setShowConfirmPassword(false);
      setPendingAttempt(result);
    } finally {
      setIsSubmitting(false);
    }
  }

  const resendSecondsLeft = Math.max(0, Math.ceil((resendCooldownUntil - resendTick) / 1000));
  const isOtpBusy = isVerifyingOtp || isCompletingRegistration;

  function startResendCooldown(seconds?: number) {
    const wait = seconds && seconds > 0 ? seconds : RESEND_COOLDOWN_SECONDS;
    setResendCooldownUntil(Date.now() + wait * 1000);
    setResendTick(Date.now());
  }

  function clearOtpError(channel: RegistrationChannel) {
    setOtpErrors((current) => (channel === 'email' ? { ...current, email: '' } : { ...current, mobile: '' }));
  }

  /**
   * Sends a fresh code for one channel, subject to the server's cooldown.
   *
   * The code already typed into that box is dropped, because a resent code
   * invalidates the one it replaces and leaving it in place invites a second,
   * avoidable wrong-code failure.
   */
  async function handleResendOtp(channel: RegistrationChannel) {
    if (!pendingAttempt || resendSecondsLeft > 0 || isOtpBusy) {
      return;
    }

    setIsVerifyingOtp(true);
    clearOtpError(channel);
    setOtpNotice('');

    try {
      const result = await resendOtp(pendingAttempt.attemptId, channel);

      if (!result.ok) {
        if (result.code === 'RESEND_COOLDOWN') {
          startResendCooldown(result.retryAfterSeconds);
        }

        setOtpErrors((current) =>
          channel === 'email' ? { ...current, email: result.message } : { ...current, mobile: result.message },
        );
        return;
      }

      startResendCooldown(result.resendCooldownSeconds);

      if (channel === 'email') {
        setEmailOtp('');
      } else {
        setMobileOtp('');
      }

      setOtpNotice(
        `A new code was sent to ${channel === 'email' ? pendingAttempt.maskedEmail : pendingAttempt.maskedMobile}.`,
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  }

  /**
   * Verifies one channel and records the outcome.
   *
   * The failure message is returned rather than thrown so the caller can put it
   * under the box it belongs to, instead of reporting one channel's problem as a
   * generic failure of the whole form.
   */
  async function verifyOtpChannel(
    attempt: StartRegistrationData,
    channel: RegistrationChannel,
    token: string,
  ): Promise<string> {
    const result = await verifyOtp(attempt.attemptId, channel, token);

    if (!result.ok) {
      if (result.code === 'OTP_EXPIRED' || result.code === 'OTP_LOCKED') {
        startResendCooldown(RESEND_COOLDOWN_SECONDS);
      }

      return result.message;
    }

    // The server reports the state of both proofs, so a channel that was proven
    // in another tab, or before a refresh, is credited here rather than being
    // asked for a second time.
    if (channel === 'email') {
      setEmailOtpVerified(true);
    } else {
      setMobileOtpVerified(true);
    }

    if (result.emailVerified) {
      setEmailOtpVerified(true);
    }

    if (result.mobileVerified) {
      setMobileOtpVerified(true);
    }

    return '';
  }

  /**
   * Checks the outstanding codes on this page, then finishes the registration,
   * then sends the applicant straight to the login page.
   *
   * The channels are verified in one pass, in the order they appear on the form,
   * and the account is completed only once the server has recorded every proof
   * the attempt needs. The local "already verified" flags decide which codes
   * still need checking; they never decide the outcome, because
   * `completeRegistration` is refused by the server unless the database agrees.
   *
   * Which proofs are needed comes from `attempt.mobileRequired`, which the
   * server sent. An applicant who gave no number has one proof to give, and this
   * form asks for exactly that one.
   */
  async function handleOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const attempt = pendingAttempt;

    if (!attempt) {
      return;
    }

    const password = pendingPassword;

    if (!password) {
      // The password is held in memory only, so a refresh loses it. It is asked
      // for again here rather than written anywhere to survive a reload.
      setOtpErrors({ email: 'Enter the password you chose to finish registration.', mobile: '' });
      document.getElementById('home-registration-otp-password')?.focus();
      return;
    }

    // Every channel that is not already proven needs a well-formed code, and the
    // applicant is told which box is at fault before anything is sent. The mobile
    // box is only in play when the attempt owes a mobile proof, so a
    // registration with no number on it is never held up waiting for a code that
    // was never sent.
    const nextErrors: { email?: string; mobile?: string } = {};
    let firstInvalidChannel: RegistrationChannel | null = null;

    if (!emailOtpVerified && !isValidOtp(emailOtp)) {
      nextErrors.email = `Enter the ${OTP_LENGTH}-digit code sent to ${attempt.maskedEmail}.`;
      firstInvalidChannel = firstInvalidChannel ?? 'email';
    }

    if (attempt.mobileRequired && !mobileOtpVerified && !isValidOtp(mobileOtp)) {
      nextErrors.mobile = `Enter the ${OTP_LENGTH}-digit code sent to ${attempt.maskedMobile}.`;
      firstInvalidChannel = firstInvalidChannel ?? 'mobile';
    }

    setOtpErrors(nextErrors);
    setOtpNotice('');

    if (firstInvalidChannel) {
      const firstBoxId = firstInvalidChannel === 'email' ? 'home-registration-email-otp' : 'home-registration-mobile-otp';
      const firstBox = document.getElementById(`${firstBoxId}-0`);
      firstBox?.scrollIntoView({ block: 'center' });
      firstBox?.focus();
      return;
    }

    setIsVerifyingOtp(true);

    try {
      if (!emailOtpVerified) {
        const failure = await verifyOtpChannel(attempt, 'email', emailOtp.trim());

        if (failure) {
          setOtpErrors((current) => ({ ...current, email: failure }));
          return;
        }
      }

      if (attempt.mobileRequired && !mobileOtpVerified) {
        const failure = await verifyOtpChannel(attempt, 'mobile', mobileOtp.trim());

        if (failure) {
          setOtpErrors((current) => ({ ...current, mobile: failure }));
          return;
        }
      }

      setIsVerifyingOtp(false);
      setIsCompletingRegistration(true);
      setOtpNotice(
        attempt.mobileRequired ? 'Both codes accepted. Creating your account…' : 'Code accepted. Creating your account…',
      );

      const result = await completeRegistration(attempt.attemptId, password);

      if (!result.ok) {
        setOtpNotice('');

        if (result.code === 'NOT_VERIFIED') {
          // The server is the authority on which proof is missing. Trusting it
          // over the local flags is what stops a tampered flag from completing
          // this form.
          setEmailOtpVerified(Boolean((result as { emailVerified?: boolean }).emailVerified));
          setMobileOtpVerified(Boolean((result as { mobileVerified?: boolean }).mobileVerified));

          // It also says whether a mobile proof is owed at all. Taken from the
          // server so a form that somehow believes a mobile is required is
          // corrected rather than left waiting for a code that was never sent.
          if (!(result as { mobileRequired?: boolean }).mobileRequired) {
            setOtpErrors((current) => ({ ...current, mobile: '' }));
          }
        }

        setOtpErrors({ email: result.message, mobile: '' });
        return;
      }

      setOtpNotice('Registration successful. Taking you to Login…');

      // Straight to the login page, as a completed registration should. Not to
      // the dashboard: there is no session yet, because nothing has been signed
      // in, and the applicant is expected to prove they know the password they
      // just chose.
      window.setTimeout(() => navigate(ROUTES.applicant.login, { replace: true }), 900);
    } finally {
      setIsVerifyingOtp(false);
      setIsCompletingRegistration(false);
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
        setStatusTone('error');
        setStatus(result.error ?? 'Password reset could not be requested. Please try again.');
        return;
      }

      setStatusTone('info');
      setStatus('If an account exists for this email, a password reset link has been sent.');
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * One-click Demo Admin entry. The browser asks the deployed
   * `demo-admin-session` Edge Function for a session on the read-only account -
   * no credential is collected here, so nothing secret reaches the card. On
   * failure only the one generic message is shown.
   */
  /**
   * One-click sign-in as the seeded demo applicant.
   *
   * The session is established through the broker, which holds the credential,
   * so the browser is never given a password. The applicant context listens to
   * Supabase's auth state, so the new session is already in place by the time
   * this navigates -- there is nothing to hand over explicitly.
   */
  async function handleOpenDemoApplicant() {
    setStatus('');
    setStatusTone('info');
    setDemoApplicantError('');
    setIsDemoApplicantSubmitting(true);

    try {
      const result = await signInDemoApplicant();

      if (!result.ok) {
        setDemoApplicantError(result.error);
        return;
      }

      navigate(ROUTES.applicant.dashboard);
    } finally {
      setIsDemoApplicantSubmitting(false);
    }
  }

  async function handleOpenDemoAdmin() {
    setStatus('');
    setStatusTone('info');
    setDemoAdminError('');
    setIsDemoSubmitting(true);

    try {
      const result = await signInDemo(true);

      if (!result.ok) {
        setDemoAdminError('Unable to open Demo Admin. Please try again.');
        return;
      }

      navigate(ROUTES.admin.dashboard);
    } finally {
      setIsDemoSubmitting(false);
    }
  }

  return (
    <div
      id="home-login"
      className={cardClassName}
      data-purpose="home-login-card"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-1 mb-1.5 lg:shrink-0">
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

      {/*
        A build with no Supabase client cannot authenticate anybody, so it says so
        on the form rather than accepting a click that leads nowhere. The admin
        panel has its own, entirely separate sign-in, so it is not shown there.
      */}
      {!isAdmin && !isSupabaseConfigured ? (
        <p
          className="mb-2 rounded border border-amber-300 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900"
          role="alert"
        >
          {supabaseConfigNotice}
        </p>
      ) : null}

      {isRegistration ? (
          <form
            className="grid gap-2 md:grid-cols-2 lg:min-h-0 lg:overflow-visible"
            aria-labelledby="home-authentication-card-heading"
            noValidate
            onSubmit={pendingAttempt ? handleOtpSubmit : handleRegistrationSubmit}
          >
            <p className="rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-[10px] leading-snug text-amber-900 md:col-span-2">
              Your account is secured by Supabase Auth. We will send a verification code to your email address
              and a second code to your mobile number. Both must be entered here before the account is
              created, so there is no confirmation link to click and no email to open after registering.
            </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-0.5" htmlFor="home-registration-name">
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
              disabled={Boolean(pendingAttempt)}
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
            <label className="block text-xs font-semibold text-slate-700 mb-0.5" htmlFor="home-registration-username">
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
              disabled={Boolean(pendingAttempt)}
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

          {pendingAttempt ? null : (
            <>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-0.5" htmlFor="home-registration-password">
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
            <label className="block text-xs font-semibold text-slate-700 mb-0.5" htmlFor="home-registration-confirm-password">
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
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-0.5" htmlFor="home-registration-email">
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
              disabled={Boolean(pendingAttempt)}
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
            <label className="block text-xs font-semibold text-slate-700 mb-0.5" htmlFor="home-registration-mobile">
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
              Optional. Your account is created once your email is verified, so you can leave this blank. If
              you do enter a number we will send a verification code to it by SMS and will not create your
              account until it is entered. Enter a 10-digit number, or the full number with its country
              code.
            </p>
            {registrationErrors.mobile ? (
              <p className="mt-1 text-[11px] font-medium text-red-700" id="home-registration-mobile-error">
                {registrationErrors.mobile}
              </p>
            ) : null}
          </div>

          {pendingAttempt ? null : (
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
          )}

          {status ? (
            <p className={`${getStatusClass(statusTone)} md:col-span-2`} role={statusTone === 'error' ? 'alert' : 'status'}>
              {status}
            </p>
          ) : null}

            {pendingAttempt ? (
              <div className="space-y-3 rounded border border-blue-200 bg-blue-50 p-2.5 md:col-span-2">
                <p className="text-[11px] leading-relaxed text-slate-700">
                  {pendingAttempt.mobileRequired
                    ? 'Enter both codes here. Your account is created as soon as the email and the mobile code are accepted, and you will go straight to the login page.'
                    : 'Enter the code sent to your email. Your account is created as soon as it is accepted, and you will go straight to the login page.'}
                </p>

                {pendingPassword ? null : (
                  <div>
                    <label className="mb-0.5 block text-xs font-semibold text-slate-700" htmlFor="home-registration-otp-password">
                      Password
                    </label>
                    <input
                      id="home-registration-otp-password"
                      name="otpPassword"
                      type="password"
                      value={pendingPassword}
                      autoComplete="current-password"
                      aria-describedby="home-registration-otp-password-help"
                      onChange={(event) => setPendingPassword(event.target.value)}
                      className={getInputClass(false)}
                    />
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500" id="home-registration-otp-password-help">
                      Re-enter the password you chose, to finish creating the account.
                    </p>
                  </div>
                )}

                <div>
                  <OtpInput
                    id="home-registration-email-otp"
                    label={`Email code sent to ${pendingAttempt.maskedEmail}`}
                    value={emailOtp}
                    onChange={(value) => {
                      setEmailOtp(value);
                      clearOtpError('email');
                    }}
                    length={OTP_LENGTH}
                    invalid={Boolean(otpErrors.email)}
                    disabled={isOtpBusy}
                    autoFocus
                    describedBy={otpErrors.email ? 'home-registration-email-otp-error' : undefined}
                  />
                  {otpErrors.email ? (
                    <p className="mt-1 text-[11px] font-medium text-red-700" id="home-registration-email-otp-error">
                      {otpErrors.email}
                    </p>
                  ) : null}
                  {emailOtpVerified ? (
                    <p className="mt-1 text-[11px] font-semibold text-emerald-700">Email code accepted</p>
                  ) : null}
                  <div className="mt-1 flex items-center justify-end">
                    <Button
                      className="rounded"
                      size="sm"
                      variant="outline"
                      disabled={isOtpBusy || resendSecondsLeft > 0}
                      onClick={() => handleResendOtp('email')}
                    >
                      Resend email code
                    </Button>
                  </div>
                </div>

                {/*
                 * Only drawn when the attempt actually owes a mobile proof. When
                 * no number was given, no SMS was sent, so a box here would ask
                 * for a code that can never arrive and block a registration the
                 * server is willing to complete.
                 */}
                {pendingAttempt.mobileRequired ? (
                  <div>
                    <OtpInput
                      id="home-registration-mobile-otp"
                      label={`Mobile code sent to ${pendingAttempt.maskedMobile}`}
                      value={mobileOtp}
                      onChange={(value) => {
                        setMobileOtp(value);
                        clearOtpError('mobile');
                      }}
                      length={OTP_LENGTH}
                      invalid={Boolean(otpErrors.mobile)}
                      disabled={isOtpBusy}
                      describedBy={otpErrors.mobile ? 'home-registration-mobile-otp-error' : undefined}
                    />
                    {otpErrors.mobile ? (
                      <p className="mt-1 text-[11px] font-medium text-red-700" id="home-registration-mobile-otp-error">
                        {otpErrors.mobile}
                      </p>
                    ) : null}
                    {mobileOtpVerified ? (
                      <p className="mt-1 text-[11px] font-semibold text-emerald-700">Mobile code accepted</p>
                    ) : null}
                    <div className="mt-1 flex items-center justify-end">
                      <Button
                        className="rounded"
                        size="sm"
                        variant="outline"
                        disabled={isOtpBusy || resendSecondsLeft > 0}
                        onClick={() => handleResendOtp('mobile')}
                      >
                        Resend mobile code
                      </Button>
                    </div>
                  </div>
                ) : null}

                {resendSecondsLeft > 0 ? (
                  <p className="text-[11px] leading-relaxed text-slate-500" role="status">
                    You can request a new code in {resendSecondsLeft} seconds.
                  </p>
                ) : null}

                {otpNotice ? (
                  <p className={getStatusClass('info')} role="status">
                    {otpNotice}
                  </p>
                ) : null}

                <p className="text-[11px] leading-relaxed text-slate-500">
                  {pendingAttempt.mobileRequired
                    ? 'Each code expires shortly and can only be used once. Your account is created only after both are accepted.'
                    : 'This code expires shortly and can only be used once.'}
                </p>

                <button
                  type="button"
                  className="w-full rounded text-[11px] font-semibold text-gov-blue underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  onClick={handleRegistrationRestart}
                >
                  Start registration again
                </button>
              </div>
            ) : null}

            <Button
              className="w-full justify-center rounded md:col-span-2"
              disabled={isSubmitting || isOtpBusy}
              size="md"
              type="submit"
            >
              {pendingAttempt
                ? isCompletingRegistration
                  ? 'Creating your account…'
                  : isVerifyingOtp
                    ? 'Checking codes…'
                    : 'Verify Codes & Create Account'
                : isSubmitting
                  ? 'Sending verification codes…'
                  : 'Register'}
            </Button>
          </form>
      ) : (
        <form
          className="space-y-1 lg:min-h-0 lg:overflow-visible"
          aria-labelledby="home-authentication-card-heading"
          noValidate
          onSubmit={handleLoginSubmit}
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-0.5" htmlFor="home-login-username">
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
            <label className="block text-xs font-semibold text-slate-700 mb-0.5" htmlFor="home-login-password">
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
            <p className={getStatusClass(statusTone)} role={statusTone === 'error' ? 'alert' : 'status'}>
              {status}
            </p>
          ) : null}

          {/*
            The sign-in row, split into two halves of one control.

            The left half is the real sign-in and stays a submit button, so the
            form still works by pressing Enter in any field. The right half is the
            seeded demo applicant, which must NOT submit: it takes no credential
            and must not run the form's own handler, so it is type="button".

            They share one rounded container with a divider rather than sitting as
            two separate buttons, because they are alternatives to each other --
            "sign in as yourself, or look around as a demo applicant" -- and a
            shared edge makes that relationship legible. Each half is still a real
            <button>, so both are keyboard reachable and independently focusable;
            a single button with a click handler inspecting a coordinate would have
            thrown that away.
          */}
          <div className="flex overflow-hidden rounded shadow">
            <Button
              className="min-w-0 flex-1 justify-center rounded-none"
              disabled={isSubmitting || isAuthenticating || isDemoApplicantSubmitting}
              size="md"
              type="submit"
            >
              {isSubmitting || isAuthenticating ? 'Signing in…' : loginLabel}
            </Button>

            {!isAdmin ? (
              <Button
                aria-label="Open the applicant demo account without signing in"
                className="min-w-0 flex-1 justify-center rounded-none border-l-2 border-white/40"
                disabled={isSubmitting || isAuthenticating || isDemoApplicantSubmitting}
                onClick={handleOpenDemoApplicant}
                size="md"
                type="button"
                variant="accent"
              >
                {isDemoApplicantSubmitting ? 'Opening…' : 'Demo Applicant'}
              </Button>
            ) : null}
          </div>

          {demoApplicantError && !isAdmin ? (
            <p
              className="rounded border border-red-300 bg-red-50 px-2 py-1.5 text-[11px] font-medium leading-relaxed text-red-800"
              role="alert"
            >
              {demoApplicantError}
            </p>
          ) : null}

          {isAdmin ? (
            <p className="pt-2 border-t border-slate-200 text-xs text-slate-500">
              Administrator accounts sign in on the admin portal.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
            {/* min-h-7 rather than min-h-9: these are inline text links, and
                the old 36px box around 11px text left the row 36px tall - more
                dead space than the links themselves. 28px still clears the
                WCAG 2.2 24x24 minimum target. */}
            <button
              className="min-h-7 px-1.5 font-semibold text-gov-blue underline underline-offset-2 hover:text-gov-saffron"
              type="button"
              disabled={isSubmitting}
              onClick={handleForgotPassword}
            >
              Forgot Password
            </button>
            <button
              className="min-h-7 px-1.5 font-semibold text-gov-blue underline underline-offset-2 hover:text-gov-saffron"
              type="button"
              onClick={() => setStatus('Username recovery is not available. Use your email address to sign in.')}
            >
              Forgot Username
            </button>
          </div>
        </form>
      )}

      {/* mt-0 pt-0.5 on the login card: the form's own space-y-1 already
          supplies 4px above the divider, and the old mt-1 pt-1 stacked another
          8px on top of it, which is what left the visible gap between the
          forgot-password links and this section. Registration keeps the
          roomier spacing because it is a long scrolling form. */}
      <div className={`${isRegistration ? 'mt-2 pt-2' : 'mt-0 pt-0.5'} border-t border-slate-200 lg:shrink-0`}>
        {isRegistration ? (
          <div className="space-y-1.5">
            <p className="text-center text-[11px] font-medium text-slate-600">Already have an account?</p>
            <Button
              className="w-full justify-center rounded"
              onClick={() => switchMode('applicant')}
              size="md"
              type="button"
            >
              Applicant Login
            </Button>
          </div>
        ) : (
          /*
           * Demo Admin lives here, inside the same card and directly below the
           * applicant controls, in the slot the "Admin Login" button used to
           * occupy. It is a section of this page, not a second page: no route
           * change, no separate layout, and the real applicant form above is
           * untouched. The button still signs in through demoAdminAuth.ts.
           */
          <>
            {/*
              The "Demo Admin / Read-Only" heading row was removed on request -
              it was the only two-line element in this section and the
              "Read-Only Evaluation Access" label below already says the same
              thing, so the section is now one line shorter. The button, the
              description and the read-only footnote are all unchanged, and
              demoAdminAuth.ts is untouched.
            */}

            {/* Same type treatment as the "Applicant Login Here" h3 above:
                text-sm font-bold text-gov-blue-dark, no uppercase, no amber.
                h4 keeps the document outline correct under that h3. */}
            <h4 className="text-sm font-bold text-gov-blue-dark">
              Read-Only Evaluation Access
            </h4>

            <p className="mt-0.5 text-[12px] leading-snug text-slate-600">
              Explore submitted applications and supporting documents in a read-only demo environment.
            </p>

            <div className="mt-1.5">
              <Button
                className="w-full justify-center rounded"
                disabled={isDemoSubmitting}
                onClick={handleOpenDemoAdmin}
                size="md"
                type="button"
                variant="accent"
              >
                {isDemoSubmitting ? 'Opening Demo Admin…' : 'View Demo Admin'}
              </Button>
            </div>

            <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Read-only access • No changes to applicant records
            </p>

            {demoAdminError ? (
              <p
                className="mt-1.5 rounded border border-red-300 bg-red-50 px-2 py-1.5 text-[11px] font-medium leading-relaxed text-red-800"
                role="alert"
              >
                {demoAdminError}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
