import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';
import { OtpInput } from './OtpInput';
import { Button } from '../ui/Button';
import { completeRegistration, resendOtp, verifyOtp } from '../../services/auth/registrationOtpService';
import type { RegistrationChannel, StartRegistrationData } from '../../services/auth/registrationOtpService';
import { OTP_LENGTH, RESEND_COOLDOWN_SECONDS, isValidOtp } from '../../lib/registrationConfig';

/**
 * Where an in-flight registration is parked across a refresh.
 *
 * Only the attempt's opaque id and the two server-owned verification flags are
 * kept, in `sessionStorage` rather than `localStorage`. The id grants nothing:
 * every call that uses it is re-checked against the database, and completing the
 * registration still needs a password and still needs both proofs to be
 * recorded. `sessionStorage` is used deliberately so the entry disappears when
 * the tab does, and it is cleared the moment registration finishes.
 *
 * The password is the one thing that is never written anywhere. It stays in the
 * caller's state for the length of the flow, and if a refresh loses it the
 * applicant is asked for it again on the final step rather than finding a
 * plaintext copy in browser storage.
 */
const RESUME_KEY = 'mota-registration-attempt';

interface ResumeState {
  attemptId: string;
  maskedEmail: string;
  maskedMobile: string;
  emailVerified: boolean;
  mobileVerified: boolean;
  /** Whether this attempt owes a mobile proof. Decides which screen to draw. */
  mobileRequired: boolean;
}

interface RegistrationOtpStepsProps {
  attempt: StartRegistrationData;
  /** Held in memory by the form. Empty after a refresh, and re-asked for then. */
  password: string;
  onRestart: () => void;
}

export function RegistrationOtpSteps({ attempt, password: initialPassword, onRestart }: RegistrationOtpStepsProps) {
  const navigate = useNavigate();
  // The server decides which channels this attempt has. With no mobile number
  // there is no SMS to wait for, so the email step is the only step and the
  // flow is not parked on a screen for a code that was never sent.
  const mobileRequired = attempt.mobileRequired;
  const mobileSent = attempt.channels.mobile?.sent ?? false;

  // Starts on whichever channel is actually outstanding. With no number on the
  // attempt there is no mobile channel, so the email one is the only candidate
  // and is not left to default to 'mobile'.
  const [channel, setChannel] = useState<RegistrationChannel>(() =>
    attempt.channels.email.sent || !attempt.mobileRequired ? 'email' : 'mobile',
  );
  const [emailVerified, setEmailVerified] = useState(false);
  const [mobileVerified, setMobileVerified] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  // Drives the countdown label. One timer for the whole component, cleared when
  // the wait is over, rather than one per resend.
  const [tick, setTick] = useState(() => Date.now());
  const [password, setPassword] = useState(initialPassword);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const maskedEmail = attempt.maskedEmail;
  const maskedMobile = attempt.maskedMobile;
  const attemptId = attempt.attemptId;

  // A dispatch that failed is reported once, on the step it belongs to, rather
  // than as a generic failure on the form the applicant has already left. Only
  // reachable when a number was given, since no SMS is attempted otherwise.
  useEffect(() => {
    if (channel === 'mobile' && mobileRequired && !mobileSent) {
      setError(
        'We could not send a code to your mobile number. You can try again from this screen, but registration cannot be completed until this number is verified.',
      );
    }
  }, [mobileRequired, mobileSent, channel]);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) {
      return;
    }

    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const cooldownSeconds = useMemo(
    () => Math.max(0, Math.ceil((cooldownUntil - tick) / 1000)),
    [cooldownUntil, tick],
  );

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(RESUME_KEY);

      if (!raw) {
        return;
      }

      const saved = JSON.parse(raw) as Partial<ResumeState>;

      if (saved.attemptId !== attemptId) {
        window.sessionStorage.removeItem(RESUME_KEY);
        return;
      }

      // The flags are re-asked of the server on the next call anyway; these only
      // decide which screen to draw on return, so a stale value costs a wrong
      // panel for a moment and never a wrong decision.
      setEmailVerified(Boolean(saved.emailVerified));
      setMobileVerified(Boolean(saved.mobileVerified));
    } catch {
      window.sessionStorage.removeItem(RESUME_KEY);
    }
  }, [attemptId]);

  useEffect(() => {
    if (completed) {
      return;
    }

    try {
      const next: ResumeState = {
        attemptId,
        maskedEmail,
        maskedMobile,
        emailVerified,
        mobileVerified,
        mobileRequired,
      };
      window.sessionStorage.setItem(RESUME_KEY, JSON.stringify(next));
    } catch {
      // A browser with storage disabled still completes the flow; it just
      // cannot be resumed after a refresh.
    }
  }, [attemptId, completed, emailVerified, maskedEmail, maskedMobile, mobileRequired, mobileVerified]);

  // Move to the outstanding step whenever the current one is already proven, so
  // returning to the tab after a refresh lands on the work that is left rather
  // than on a finished screen. With no number on the attempt there is no mobile
  // step to move to, so the email proof alone finishes the flow.
  useEffect(() => {
    if (channel === 'email' && emailVerified && mobileRequired && !mobileVerified) {
      setChannel('mobile');
      // The code that was just entered belongs to the email step, so it is
      // cleared here rather than left sitting in the box for the next one.
      setOtp('');
      setError('');
    }
  }, [channel, emailVerified, mobileRequired, mobileVerified]);

  const bothVerified = emailVerified && (!mobileRequired || mobileVerified);

  const startCooldown = useCallback((seconds?: number) => {
    const wait = seconds && seconds > 0 ? seconds : RESEND_COOLDOWN_SECONDS;
    setCooldownUntil(Date.now() + wait * 1000);
    setTick(Date.now());
  }, []);

  async function handleVerify() {
    if (!isValidOtp(otp)) {
      setError(`Enter the ${OTP_LENGTH}-digit code from the message.`);
      return;
    }

    setBusy(true);
    setError('');
    setStatus('');

    try {
      const result = await verifyOtp(attemptId, channel, otp);

      if (!result.ok) {
        setError(result.message);

        if (result.code === 'OTP_EXPIRED' || result.code === 'OTP_LOCKED') {
          startCooldown(RESEND_COOLDOWN_SECONDS);
        }

        if (result.code === 'ATTEMPT_EXPIRED') {
          setStatus('Start the registration again to request new codes.');
        }

        return;
      }

      setOtp('');

      if (channel === 'email') {
        setEmailVerified(true);

        if (result.mobileVerified) {
          setMobileVerified(true);
          setStatus('Email verified. Mobile number verified.');
        } else if (mobileRequired) {
          setChannel('mobile');
          setStatus('Email verified. Now verify your mobile number.');
        } else {
          setStatus('Email verified. Enter your password to finish registration.');
        }

        return;
      }

      setMobileVerified(true);
      setStatus('Mobile number verified.');
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    if (cooldownSeconds > 0 || busy) {
      return;
    }

    setBusy(true);
    setError('');
    setStatus('');

    try {
      const result = await resendOtp(attemptId, channel);

      if (!result.ok) {
        setError(result.message);

        if (result.code === 'RESEND_COOLDOWN') {
          startCooldown(result.retryAfterSeconds);
        }

        return;
      }

      startCooldown(result.resendCooldownSeconds);
      setOtp('');
      setStatus(`A new code was sent to ${channel === 'email' ? maskedEmail : maskedMobile}.`);
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete() {
    if (!password) {
      setError('Enter your password again to finish registration.');
      return;
    }

    setCompleting(true);
    setError('');

    try {
      const result = await completeRegistration(attemptId, password);

      if (!result.ok) {
        setError(result.message);

        if (result.code === 'NOT_VERIFIED') {
          // The server is the authority on which proof is missing. Trusting it
          // over the local flags is what stops a tampered flag from advancing
          // this form.
          setEmailVerified(Boolean((result as { emailVerified?: boolean }).emailVerified));
          setMobileVerified(Boolean((result as { mobileVerified?: boolean }).mobileVerified));
        }

        if (result.code === 'ATTEMPT_EXPIRED' || result.code === 'ATTEMPT_NOT_FOUND') {
          setStatus('This registration has ended. Start again to register a new account.');
        }

        return;
      }

      setCompleted(true);
      setStatus('Registration successful. Your account has been verified successfully.');

      try {
        window.sessionStorage.removeItem(RESUME_KEY);
      } catch {
        // Nothing to do; the entry is per-tab and this tab is about to change
        // route.
      }

      // Straight to the login page, as a completed registration should. Not to
      // the dashboard: there is no session yet, because nothing has been signed
      // in, and the applicant is expected to prove they know the password they
      // just chose.
      window.setTimeout(() => navigate(ROUTES.applicant.login, { replace: true }), 1800);
    } finally {
      setCompleting(false);
    }
  }

  function handleStartOver() {
    try {
      window.sessionStorage.removeItem(RESUME_KEY);
    } catch {
      // See above.
    }

    onRestart();
  }

  const destination = channel === 'email' ? maskedEmail : maskedMobile;
  const otpErrorId = 'home-registration-otp-error';
  const otpHelpId = 'home-registration-otp-help';

  if (completed) {
    return (
      <div className="space-y-3">
        <h2
          ref={headingRef}
          tabIndex={-1}
          id="home-authentication-card-heading"
          className="text-sm font-semibold text-slate-800 focus:outline-none"
        >
          Registration successful
        </h2>
        <p className={statusClass(false)} role="status">
          {status}
        </p>
        <p className="text-[11px] leading-relaxed text-slate-500" role="status">
          Redirecting to Login...
        </p>
        <Button className="w-full justify-center rounded" size="md" onClick={() => navigate(ROUTES.applicant.login, { replace: true })}>
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2
        ref={headingRef}
        tabIndex={-1}
        id="home-authentication-card-heading"
        className="text-sm font-semibold text-slate-800 focus:outline-none"
      >
        {channel === 'email' ? 'Verify your email' : 'Verify your mobile number'}
      </h2>

      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]" aria-label="Registration progress">
        <li className={badgeClass(emailVerified)}>
          <span aria-hidden="true">{emailVerified ? '✓' : '1'}</span> Email
          {emailVerified ? ': verified' : ''}
        </li>
        {mobileRequired ? (
          <li className={badgeClass(mobileVerified)}>
            <span aria-hidden="true">{mobileVerified ? '✓' : '2'}</span> Mobile
            {mobileVerified ? ': verified' : mobileVerified === false && emailVerified ? ': verification required' : ''}
          </li>
        ) : null}
      </ol>

      <p className="text-xs leading-relaxed text-slate-600">
        {channel === 'email'
          ? 'We sent a verification code to:'
          : 'We sent a verification code to:'}
        <span className="ml-1 font-semibold text-slate-800">{destination}</span>
      </p>

      {channel === 'email' && !emailVerified ? (
        <OtpInput
          id="home-registration-email-otp"
          label={`${OTP_LENGTH}-digit code sent to ${maskedEmail}`}
          value={otp}
          onChange={setOtp}
          onComplete={handleVerify}
          length={OTP_LENGTH}
          invalid={Boolean(error)}
          disabled={busy}
          autoFocus
          describedBy={error ? `${otpErrorId} ${otpHelpId}` : otpHelpId}
        />
      ) : null}

      {channel === 'mobile' && !mobileVerified ? (
        <OtpInput
          id="home-registration-mobile-otp"
          label={`${OTP_LENGTH}-digit code sent to ${maskedMobile}`}
          value={otp}
          onChange={setOtp}
          onComplete={handleVerify}
          length={OTP_LENGTH}
          invalid={Boolean(error)}
          disabled={busy}
          autoFocus
          describedBy={error ? `${otpErrorId} ${otpHelpId}` : otpHelpId}
        />
      ) : null}

      <p className="text-[11px] leading-relaxed text-slate-500" id={otpHelpId}>
        Enter the code exactly as it appears in the message. It expires shortly and can only be used once.
      </p>

      {error ? (
        <p className={statusClass(true)} id={otpErrorId} role="alert">
          {error}
        </p>
      ) : null}

      {status && !error ? (
        <p className={statusClass(false)} role="status">
          {status}
        </p>
      ) : null}

      {bothVerified ? (
        <div className="space-y-2">
          {!initialPassword ? (
            <div>
              <label className="mb-0.5 block text-xs font-semibold text-slate-700" htmlFor="home-registration-final-password">
                Password
              </label>
              <input
                id="home-registration-final-password"
                name="finalPassword"
                type="password"
                value={password}
                autoComplete="current-password"
                aria-describedby="home-registration-final-password-help"
                onChange={(event) => setPassword(event.target.value)}
                className={inputClass(false)}
              />
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500" id="home-registration-final-password-help">
                Enter the password you chose when you started registering.
              </p>
            </div>
          ) : null}

          <Button
            className="w-full justify-center rounded"
            size="md"
            disabled={completing}
            onClick={handleComplete}
          >
            {completing ? 'Completing registration…' : 'Complete Registration'}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Button className="w-full justify-center rounded" size="md" disabled={busy} onClick={handleVerify}>
            {busy ? 'Checking…' : 'Verify'}
          </Button>

          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] leading-relaxed text-slate-500" role="status">
              {cooldownSeconds > 0 ? `Resend OTP in ${cooldownSeconds} seconds` : "Didn't receive it?"}
            </p>
            <Button
              className="rounded"
              size="sm"
              variant="outline"
              disabled={busy || cooldownSeconds > 0}
              onClick={handleResend}
            >
              {busy ? 'Sending…' : 'Resend OTP'}
            </Button>
          </div>
        </div>
      )}

      <button
        type="button"
        className="w-full rounded text-[11px] font-semibold text-gov-blue underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
        onClick={handleStartOver}
      >
        Start registration again
      </button>
    </div>
  );
}

function statusClass(isError: boolean) {
  return isError
    ? 'rounded border border-red-300 bg-red-50 px-2.5 py-2 text-[11px] font-medium leading-relaxed text-red-800'
    : 'rounded border border-blue-200 bg-blue-50 px-2.5 py-2 text-[11px] leading-relaxed text-blue-900';
}

function badgeClass(done: boolean) {
  return done
    ? 'inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800'
    : 'inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600';
}

function inputClass(hasError: boolean) {
  return `w-full min-w-0 rounded border bg-white px-2.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 ${
    hasError
      ? 'border-red-600 focus:border-red-600 focus:ring-red-200'
      : 'border-slate-300 focus:border-gov-blue focus:ring-blue-100'
  }`;
}
