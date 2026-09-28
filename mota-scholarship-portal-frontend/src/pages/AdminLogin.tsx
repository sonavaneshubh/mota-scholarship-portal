import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/useAdminAuth';
import { ADMIN_DEMO_IDENTIFIER, ADMIN_DEMO_PASSWORD } from '../services/adminAuth';
import { ROUTES } from '../lib/constants';
import { AdminIcon } from '../components/admin/AdminIcon';
import { Button } from '../components/ui/Button';

interface LoginErrors {
  identifier?: string;
  password?: string;
  captcha?: string;
}

function createCaptcha() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 5 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

export function AdminLogin() {
  const { isAuthenticated, signIn, signInDemo } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoPassword, setDemoPassword] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);
  const [captcha, setCaptcha] = useState('');
  const [captchaCode, setCaptchaCode] = useState(createCaptcha);
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [authError, setAuthError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate replace to={ROUTES.admin.dashboard} />;
  }

  function refreshCaptcha() {
    setCaptchaCode(createCaptcha());
    setCaptcha('');
    setErrors((current) => ({ ...current, captcha: undefined }));
  }

  function validate() {
    const nextErrors: LoginErrors = {};

    if (!identifier.trim()) {
      nextErrors.identifier = 'Enter your admin ID or username.';
    }

    if (!password) {
      nextErrors.password = 'Enter your password.';
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters.';
    }

    if (!captcha.trim()) {
      nextErrors.captcha = 'Enter the verification code.';
    } else if (captcha.trim().toUpperCase() !== captchaCode) {
      nextErrors.captcha = 'The verification code does not match.';
    }

    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    setAuthError('');
    const nextErrors = validate();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);
    const result = await signIn(identifier, password, remember);
    setLoading(false);

    if (!result.ok) {
      setAuthError(result.message ?? 'Unable to sign in. Please try again.');
      return;
    }

    const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
    const destination = from?.pathname && from.pathname !== ROUTES.admin.login
      ? `${from.pathname}${from.search ?? ''}`
      : ROUTES.admin.dashboard;
    navigate(destination, { replace: true });
  }

  /**
   * Where a successful Demo Admin sign-in should land: back to the page that sent
   * them here, unless that was the login screen itself.
   */
  function demoDestination() {
    const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
    return from?.pathname && from.pathname !== ROUTES.admin.login
      ? `${from.pathname}${from.search ?? ''}`
      : ROUTES.admin.dashboard;
  }

  /**
   * The one-click path. No credential is collected: the server-side broker holds
   * the read-only account's password and returns a session for it. If the broker
   * is not deployed on this project, the manual form is offered rather than
   * leaving a visitor with a button that does nothing.
   */
  async function handleViewDemo() {
    setNotice('');
    setAuthError('');
    setLoading(true);
    const result = await signInDemo(remember);
    setLoading(false);

    if (!result.ok) {
      setAuthError(result.message ?? 'Unable to open Demo Admin. Please try again.');

      if (result.canRetryWithCredentials) {
        setShowCredentials(true);
      }

      return;
    }

    navigate(demoDestination(), { replace: true });
  }

  async function handleDemoLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    setAuthError('');

    if (!demoEmail.trim() || !demoPassword) {
      setAuthError('Enter the Demo Admin email and password.');
      return;
    }

    setLoading(true);
    // 'demo' mode signs in against Supabase Auth and then requires the read-only
    // demo_admin role. It is not the prototype admin shell and it is not applicant
    // authentication.
    const result = await signIn(demoEmail, demoPassword, remember, 'demo');
    setLoading(false);

    if (!result.ok) {
      setAuthError(result.message ?? 'Unable to sign in as Demo Admin.');
      return;
    }

    navigate(demoDestination(), { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="h-1.5 bg-gradient-to-r from-gov-saffron via-white to-gov-green" />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link className="flex items-center gap-3" to={ROUTES.home}>
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-gov-blue-dark text-sm font-bold tracking-wider text-white">MOTA</span>
            <span>
              <span className="block text-sm font-bold text-gov-blue-dark">MOTA Scholarship Portal</span>
              <span className="mt-1 block text-[11px] uppercase tracking-wider text-slate-500">Administration portal</span>
            </span>
          </Link>
          <Link className="text-xs font-semibold text-gov-blue hover:text-gov-saffron-dark" to={ROUTES.home}>Applicant portal</Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[0.9fr_1.1fr]">
          <section className="hidden bg-gov-blue-dark px-8 py-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Secure administration</p>
              <h1 className="mt-5 text-3xl font-bold leading-tight">Scholarship operations, made accountable.</h1>
              <p className="mt-5 text-sm leading-7 text-blue-100">Review applications, verify supporting documents, manage schemes and monitor scholarship disbursement from one protected workspace.</p>
            </div>
            <div className="space-y-3 border-t border-white/15 pt-6 text-xs text-blue-100">
              <p className="flex items-center gap-2"><AdminIcon className="h-4 w-4 text-amber-300" name="lock" /> Protected administrative routes</p>
              <p className="flex items-center gap-2"><AdminIcon className="h-4 w-4 text-amber-300" name="documents" /> Human verification workflow</p>
              <p className="flex items-center gap-2"><AdminIcon className="h-4 w-4 text-amber-300" name="reports" /> Operational reporting</p>
            </div>
          </section>

          <section className="px-5 py-8 sm:px-10 sm:py-10">
            <div className="mx-auto max-w-md">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gov-saffron-dark">Authorized personnel</p>
              <h2 className="mt-2 text-2xl font-bold text-gov-blue-dark">Admin Login</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Sign in with your administrator credentials to continue to the management workspace.</p>

              {notice ? <div className="mt-5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs text-blue-800">{notice}</div> : null}
              {authError ? <div aria-live="assertive" className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">{authError}</div> : null}

              <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="admin-identifier">Admin ID / Username</label>
                  <div className="relative mt-1.5">
                    <AdminIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" name="user" />
                    <input aria-describedby={errors.identifier ? 'admin-identifier-error' : undefined} aria-invalid={Boolean(errors.identifier)} autoComplete="username" className="min-h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="admin-identifier" placeholder="Enter admin ID or username" type="text" value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
                  </div>
                  {errors.identifier ? <p className="mt-1.5 text-xs text-red-600" id="admin-identifier-error">{errors.identifier}</p> : null}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="admin-password">Password</label>
                  <div className="relative mt-1.5">
                    <AdminIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" name="lock" />
                    <input aria-describedby={errors.password ? 'admin-password-error' : undefined} aria-invalid={Boolean(errors.password)} autoComplete="current-password" className="min-h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-11 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="admin-password" placeholder="Enter your password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} />
                    <button aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-1 top-1 flex h-9 w-9 items-center justify-center rounded text-slate-500 hover:bg-slate-100" type="button" onClick={() => setShowPassword((current) => !current)}>
                      <AdminIcon className="h-4 w-4" name="eye" />
                    </button>
                  </div>
                  {errors.password ? <p className="mt-1.5 text-xs text-red-600" id="admin-password-error">{errors.password}</p> : null}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="admin-captcha">Verification code</label>
                    <button className="text-xs font-semibold text-gov-blue hover:text-gov-saffron-dark" type="button" onClick={refreshCaptcha}>Refresh code</button>
                  </div>
                  <div className="mt-1.5 flex gap-2">
                    <input aria-describedby={errors.captcha ? 'admin-captcha-error' : undefined} aria-invalid={Boolean(errors.captcha)} autoComplete="off" className="min-h-11 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm uppercase tracking-[0.25em] text-slate-800 outline-none transition placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="admin-captcha" placeholder="Enter code" type="text" value={captcha} onChange={(event) => setCaptcha(event.target.value)} />
                    <div aria-label={`Verification code ${captchaCode}`} className="flex min-w-28 items-center justify-center rounded-md border border-dashed border-gov-blue/30 bg-blue-50 px-3 font-mono text-lg font-bold tracking-[0.2em] text-gov-blue" role="img">{captchaCode}</div>
                  </div>
                  {errors.captcha ? <p className="mt-1.5 text-xs text-red-600" id="admin-captcha-error">{errors.captcha}</p> : null}
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-600" htmlFor="remember-admin">
                    <input checked={remember} className="h-4 w-4 rounded border-slate-300 text-gov-blue focus:ring-gov-blue" id="remember-admin" type="checkbox" onChange={(event) => setRemember(event.target.checked)} />
                    Remember me
                  </label>
                  <button className="text-xs font-semibold text-gov-blue hover:text-gov-saffron-dark" type="button" onClick={() => setNotice('Password reset is not connected in this demo. Contact the portal administrator for access support.')}>Forgot password?</button>
                </div>

                <Button className="w-full" disabled={loading} size="lg" type="submit" variant="primary">
                  {loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Signing in…</> : <>Sign in to admin portal <AdminIcon className="h-4 w-4" name="arrow-right" /></>}
                </Button>

              </form>

              <div className="relative my-5 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                <span className="relative bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">or</span>
              </div>

              {/*
                The Demo Admin is a separate entry, deliberately below the normal
                form and visually distinct from it. The button takes no credential:
                the session is brokered server-side, so no password is typed, shown,
                stored by the browser, or present in the bundle. The account behind
                it is the same read-only `demo_admin` role either way, and
                `signIn(..., 'demo')` still enforces that role on the far side of
                the manual form below.
              */}
              <div className="rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50/40 p-5 shadow-xs">
                <div className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-900">
                  <AdminIcon className="h-4 w-4 text-amber-600" name="eye" />
                  <span>Demo Admin</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-amber-900/90">
                  Demo mode — view real applicant and application data submitted through the portal.
                  This mode is for demonstration purposes and does not represent production
                  administrator access.
                </p>

                <Button
                  className="mt-4 w-full justify-center border-amber-600 bg-amber-500 font-bold text-slate-900 shadow-sm transition-all hover:bg-amber-600 active:bg-amber-700"
                  disabled={loading}
                  onClick={handleViewDemo}
                  size="lg"
                  type="button"
                  variant="primary"
                >
                  {loading
                    ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-900/40 border-t-slate-900" /> Opening Demo Admin…</>
                    : <><span>View Demo Admin</span><AdminIcon className="h-4 w-4" name="arrow-right" /></>}
                </Button>
                <p className="mt-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                  Read-only evaluation access
                </p>

                <p className="mt-3 text-[11px] leading-relaxed text-amber-800/80">
                  No password is asked for or stored. This opens a read-only account that can view submitted
                  applications, their applicants, schemes and documents, and cannot modify, approve, reject or
                  delete anything.
                </p>

                {/*
                  Only rendered when the one-click path fails, or when a visitor asks
                  for it. An edge-function deployment problem is the common reason,
                  and this keeps the demonstration usable on a project where the
                  function has not been deployed yet.
                */}
                {showCredentials ? (
                  <form className="mt-4 border-t border-amber-300/70 pt-4" noValidate onSubmit={handleDemoLogin}>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                      Sign in manually instead
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-amber-800/90">
                      Used when the one-click Demo Admin service is not deployed on this project. The role check
                      still applies, so an account that is not a Demo Admin is refused.
                    </p>
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-amber-900" htmlFor="demo-admin-email">Demo Admin email</label>
                        <input
                          autoComplete="username"
                          className="mt-1.5 min-h-11 w-full rounded-md border border-amber-300 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                          id="demo-admin-email"
                          placeholder="demo.admin@example.com"
                          type="email"
                          value={demoEmail}
                          onChange={(event) => setDemoEmail(event.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-amber-900" htmlFor="demo-admin-password">Password</label>
                        <input
                          autoComplete="current-password"
                          className="mt-1.5 min-h-11 w-full rounded-md border border-amber-300 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                          id="demo-admin-password"
                          placeholder="Demo Admin password"
                          type={showPassword ? 'text' : 'password'}
                          value={demoPassword}
                          onChange={(event) => setDemoPassword(event.target.value)}
                        />
                      </div>
                    </div>
                    <Button className="mt-3 w-full justify-center" disabled={loading} size="md" type="submit" variant="outline">
                      {loading ? 'Signing in…' : 'Sign in as Demo Admin'}
                    </Button>
                  </form>
                ) : (
                  <button
                    className="mt-2 text-[11px] font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950"
                    type="button"
                    onClick={() => setShowCredentials(true)}
                  >
                    Sign in with a Demo Admin email and password instead
                  </button>
                )}
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <p className="font-semibold text-slate-700">Prototype shell access (not connected to live data)</p>
                <p className="mt-1">ID: <code className="rounded bg-slate-100 px-1 py-0.5">{ADMIN_DEMO_IDENTIFIER}</code></p>
                <p className="mt-1">Password: <code className="rounded bg-slate-100 px-1 py-0.5">{ADMIN_DEMO_PASSWORD}</code></p>
                <p className="mt-2 leading-relaxed">
                  This shell reaches the unconnected prototype screens only. Real submitted application data
                  is on the Applications screen, which the Demo Admin above reads from the database.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <footer className="px-4 py-5 text-center text-xs text-slate-500">MOTA Scholarship Portal · Protected administration prototype</footer>
    </div>
  );
}
