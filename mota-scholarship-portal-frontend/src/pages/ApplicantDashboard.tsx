import { useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useApplicantAuth } from '../context/useApplicantAuth';
import { PORTAL_SCHEMES } from '../data/portalSchemes';
import { calculateApplicantProfileCompletion } from '../lib/applicantProfile';
import { ROUTES } from '../lib/constants';

const BASE_FONT_SIZE = 13;
const PAGE_SIZE = 10;

const carouselItems = [
  { id: 'post-matric', label: 'Post Matric', sub: 'Scholarship', icon: 'fa-solid fa-graduation-cap', to: `${ROUTES.applicant.schemes}?category=post-matric` },
  { id: 'pre-matric', label: 'Pre Matric', sub: 'Scholarship', icon: 'fa-solid fa-user-graduate', to: `${ROUTES.applicant.schemes}?category=pre-matric` },
  { id: 'pension', label: 'Pension', sub: 'Schemes', icon: 'fa-solid fa-person-cane', to: `${ROUTES.applicant.schemes}?category=pension` },
  { id: 'farmer', label: 'Farmer', sub: 'Schemes', icon: 'fa-solid fa-tractor', to: `${ROUTES.applicant.schemes}?category=farmer` },
  { id: 'labour', label: 'Labour', sub: 'Schemes', icon: 'fa-solid fa-helmet-safety', to: `${ROUTES.applicant.schemes}?category=labour` },
  { id: 'special', label: 'Special Assistance', sub: 'Schemes', icon: 'fa-solid fa-hand-holding-hand', to: `${ROUTES.applicant.schemes}?category=special-assistance` },
] as const;

const sidebarItems = [
  { id: 'aadhaar-bank-link', label: 'Aadhaar Bank Link', to: null },
  { id: 'home', label: 'Home', to: ROUTES.applicant.dashboard },
  { id: 'profile', label: 'Profile', to: ROUTES.applicant.profile },
  { id: 'all-schemes', label: 'All Schemes', to: ROUTES.applicant.schemes },
  { id: 'my-applied-scheme', label: 'My Applied Scheme', to: ROUTES.applicant.applications },
  { id: 'my-cancelled-scheme', label: 'My Cancelled Scheme', to: null },
  { id: 'right-to-give-up', label: 'Right To Give Up', to: null },
  { id: 'grievance-dashboard', label: 'Grievance/Suggestion Dashboard', to: ROUTES.applicant.grievance },
  { id: 'declaration-forms', label: 'Declaration Forms', to: null },
  { id: 'notification', label: 'Notification', to: ROUTES.applicant.notifications },
  { id: 'applied-scheme-history', label: 'My Applied Scheme History', to: ROUTES.applicant.history },
] as const;

const sidebarGuidelines = [
  { id: 'instructions', label: 'Instruction Set for Online Application Process', to: ROUTES.applicant.guidelines },
  { id: 'popups', label: 'Pop Up Blocker Guidance', to: `${ROUTES.applicant.guidelines}#faq` },
  { id: 'password', label: 'Forgot Password', to: `${ROUTES.applicant.guidelines}#faq` },
] as const;

function typeToneClass(type: string) {
  return type === 'Scholarship'
    ? 'border border-blue-100 bg-blue-50 text-portal-navy'
    : 'border border-amber-200 bg-amber-50 text-amber-800';
}

export function ApplicantDashboard() {
  const { session, signOut } = useApplicantAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [fontSize, setFontSize] = useState(BASE_FONT_SIZE);
  const [highContrast, setHighContrast] = useState(false);
  const [page, setPage] = useState(1);
  const trackRef = useRef<HTMLDivElement>(null);

  if (!session) {
    return (
      <Navigate
        replace
        state={{
          homeAuthMode: 'applicant',
          from: { pathname: location.pathname, search: location.search, hash: location.hash },
        }}
        to={ROUTES.homeLogin}
      />
    );
  }

  const completion = calculateApplicantProfileCompletion(session.user);
  const pageCount = Math.max(1, Math.ceil(PORTAL_SCHEMES.length / PAGE_SIZE));
  const visibleSchemes = PORTAL_SCHEMES.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleLogout() {
    signOut();
    navigate(ROUTES.homeLogin, { replace: true });
  }

  function stepFontSize(delta: number) {
    setFontSize((current) => Math.min(16, Math.max(11, current + delta)));
  }

  function scrollCarousel(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    track.scrollBy({ left: direction * Math.max(160, track.clientWidth / 2), behavior: 'smooth' });
  }

  return (
    <div
      className={`flex min-h-screen flex-col bg-white text-slate-800 ${highContrast ? 'contrast-125 saturate-50' : ''}`}
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', fontSize }}
    >
      <div className="w-full select-none border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-1 text-2xs font-normal text-slate-700">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" />
              <span className="font-medium">भारत सरकार | Government of India</span>
            </div>
            <span className="text-slate-300">|</span>
            <span>जनजातीय कार्य मंत्रालय | Ministry of Tribal Affairs</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 overflow-hidden rounded border border-slate-300 bg-white px-1 text-2xs font-semibold text-slate-700">
              <button className="px-1 hover:text-blue-600" onClick={() => stepFontSize(-1)} type="button">A-</button>
              <button className="px-1 hover:text-blue-600" onClick={() => setFontSize(BASE_FONT_SIZE)} type="button">A</button>
              <button className="px-1 hover:text-blue-600" onClick={() => stepFontSize(1)} type="button">A+</button>
            </div>
            <button
              aria-pressed={highContrast}
              className="flex items-center space-x-1 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-2xs text-slate-700 hover:bg-slate-50"
              onClick={() => setHighContrast((current) => !current)}
              type="button"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-slate-900" />
              <span>Contrast</span>
            </button>
            <span className="flex cursor-pointer items-center gap-1 text-2xs text-sky-700">
              <i aria-hidden="true" className="fa-solid fa-helmet-safety text-sky-600" />
              <span>Accessible • Keyboard &amp; Screen-Reader Friendly</span>
            </span>
            <select
              className="cursor-pointer rounded border border-slate-300 bg-white px-2 py-0.5 text-2xs font-medium text-slate-700"
              defaultValue="English"
              title="Language switching is not wired up in this prototype"
            >
              <option>English</option>
              <option>हिन्दी</option>
              <option>मराठी</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            <div className="flex h-12 w-10 flex-shrink-0 items-center justify-center text-slate-800">
              <svg aria-label="National Emblem of India" className="h-12 w-8 fill-current text-slate-800" viewBox="0 0 100 120">
                <circle cx="50" cy="35" fill="#333333" r="24" />
                <rect fill="#333333" height="35" width="14" x="43" y="62" />
                <rect fill="#333333" height="8" rx="2" width="46" x="27" y="98" />
                <text fill="#fff" fontSize="16" fontWeight="bold" textAnchor="middle" x="50" y="40">॥</text>
              </svg>
            </div>
            <div className="border-r border-slate-300 pr-6">
              <div className="text-2xs font-medium tracking-wide text-slate-600">भारत सरकार • GOVERNMENT OF INDIA</div>
              <div className="text-lg font-bold leading-tight text-slate-900">जनजातीय कार्य मंत्रालय</div>
              <div className="text-xs font-semibold text-slate-700">Ministry of Tribal Affairs</div>
              <div className="mt-0.5 text-2xs font-medium text-red-500">AI-Enabled Scholarship &amp; Fellowship Management System</div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-1 inline-flex items-center space-x-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-2xs font-semibold text-amber-700">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>PROTOTYPE / DEMO</span>
            </div>
            <h1 className="text-sm font-extrabold tracking-tight text-blue-900">Scholarship &amp; Fellowship Management</h1>
            <div className="text-2xs font-semibold tracking-wide text-emerald-600">Discover • Apply • Verify • Decide</div>
          </div>

          <div className="flex min-w-[200px] flex-col justify-center rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-2 text-right">
            <div className="mb-0.5 flex items-center justify-end space-x-1 text-2xs font-bold text-amber-600">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span>HELPDESK (DEMO)</span>
            </div>
            <div className="text-xs font-extrabold tracking-tight text-blue-900">1800-11-0000 (Demo)</div>
            <div className="mt-0.5 text-2xs font-normal text-slate-500">Working Days: 9:30 AM – 5:30 PM IST</div>
          </div>
        </div>
      </div>

      <nav
        className="flex select-none items-center overflow-hidden border-b border-[#08284d] bg-[#0b2546] text-white shadow-md"
        id="department-schemes-bar"
      >
        <Link
          className="arrow-tab-amber z-10 flex min-w-[110px] cursor-pointer flex-col justify-center bg-[#f59e0b] px-3.5 py-2 text-center font-bold shadow-md transition hover:bg-amber-600"
          to={`${ROUTES.applicant.guidelines}#faq`}
        >
          <span className="text-xs font-extrabold leading-tight text-slate-900">How to</span>
          <span className="text-xs font-extrabold leading-tight text-slate-950">Apply Online ?</span>
        </Link>
        <div className="arrow-tab z-0 flex min-w-[95px] flex-col justify-center border-r border-[#08284d] bg-[#0f325e] py-2 pl-6 pr-4 text-center font-semibold">
          <span className="text-xs leading-tight text-amber-300">Benefit</span>
          <span className="text-xs leading-tight text-white">Schemes</span>
        </div>
        <button aria-label="Previous" className="px-3 text-slate-300 transition hover:text-amber-400" onClick={() => scrollCarousel(-1)} type="button">
          <i aria-hidden="true" className="fa-regular fa-circle-left text-lg" />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-between px-2 text-2xs font-medium" ref={trackRef}>
          <div className="flex snap-x gap-6 overflow-x-auto scrollbar-none">
            {carouselItems.map((item, index) => (
              <Link
                className={`flex flex-shrink-0 snap-start items-center space-x-2 px-2 py-1.5 transition hover:text-amber-300 ${
                  index === 0 ? 'rounded-full border border-amber-400/30 bg-[#06182e] px-3 shadow-inner' : 'cursor-pointer'
                }`}
                key={item.id}
                to={item.to}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full font-bold ${
                    index === 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-700/50 text-slate-300'
                  }`}
                >
                  <i aria-hidden="true" className={`${item.icon} text-xs`} />
                </div>
                <div className="leading-tight">
                  <span className={`block ${index === 0 ? 'font-semibold text-amber-300' : ''}`}>{item.label}</span>
                  <span className={`text-2xs ${index === 0 ? 'text-slate-200' : 'text-slate-400'}`}>{item.sub}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
        <button aria-label="Next" className="px-3 text-slate-300 transition hover:text-amber-400" onClick={() => scrollCarousel(1)} type="button">
          <i aria-hidden="true" className="fa-regular fa-circle-right text-lg" />
        </button>
        <div className="flex flex-shrink-0 items-center border-l border-[#08284d] pl-2.5">
          <Link
            className="group flex items-center gap-2.5 rounded-full border border-amber-400/40 bg-gradient-to-r from-[#0d2a52] to-[#06182e] py-1 pl-1 pr-2.5 shadow-sm transition hover:border-amber-300/70 hover:from-[#123a66] hover:to-[#0a2038] focus:outline-none focus:ring-2 focus:ring-amber-400/70"
            to={ROUTES.applicant.profile}
          >
            <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-2xs font-bold text-[#0b2546] ring-2 ring-amber-400/50">
              {session.user.avatarInitials}
              <span
                aria-hidden="true"
                className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-[#0b2546] bg-emerald-400"
              />
            </span>
            <span className="leading-tight">
              <span className="block text-2xs font-semibold text-white transition group-hover:text-amber-200">
                {session.user.name}
              </span>
              <span className="block text-2xs text-amber-300/80">{session.user.category}</span>
            </span>
            <i
              aria-hidden="true"
              className="fa-solid fa-chevron-down text-[9px] text-slate-400 transition group-hover:text-amber-300"
            />
          </Link>
          <button
            aria-label="Log out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-slate-300 transition hover:border-red-400/60 hover:bg-red-500/15 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-400/60"
            onClick={handleLogout}
            title="Log out"
            type="button"
          >
            <i aria-hidden="true" className="fa-solid fa-right-from-bracket text-xs" />
          </button>
        </div>
      </nav>

      <main className="flex max-w-full flex-1 overflow-hidden bg-white" id="main-content">
        <aside className="flex w-60 flex-shrink-0 select-none flex-col border-r border-slate-200 bg-white text-xs shadow-[1px_0_3px_rgba(0,0,0,0.03)]">
          <nav className="flex flex-col divide-y divide-slate-100 text-slate-700">
            {sidebarItems.map((item) => {
              const current = item.to !== null && location.pathname === item.to;
              const baseClass = `block w-full px-4 py-2 text-left font-medium transition ${
                current
                  ? 'border-l-4 border-[#0b2546] bg-blue-50/60 font-semibold text-[#0b2546]'
                  : 'hover:bg-slate-50 hover:text-[#0b2546]'
              }`;

              return item.to ? (
                <Link
                  aria-current={current ? 'page' : undefined}
                  className={baseClass}
                  key={item.id}
                  to={item.to}
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-disabled="true" className={`${baseClass} cursor-not-allowed text-slate-400`} title="Not available in this prototype" key={item.id}>
                  {item.label}
                </span>
              );
            })}
          </nav>

          <Link
            className="mx-2 my-2.5 flex cursor-pointer items-center justify-between rounded-lg border border-amber-300 bg-amber-50/80 p-2.5 shadow-sm transition hover:border-amber-400"
            to={`${ROUTES.applicant.guidelines}#faq`}
          >
            <div className="flex items-center space-x-2">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-2xs font-bold text-[#0b2546] hover:underline">Click here for Help</span>
            </div>
            <i aria-hidden="true" className="fa-solid fa-angles-right text-xs text-amber-600" />
          </Link>

          <div className="mb-2 px-2">
            <Link
              className="flex w-full items-center justify-center space-x-2 rounded bg-[#0b2546] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#08284d]"
              to={ROUTES.applicant.grievance}
            >
              <i aria-hidden="true" className="fa-regular fa-comment-dots text-sm text-amber-400" />
              <span>Grievance / Suggestions</span>
            </Link>
          </div>

          <div className="mt-1 border-t border-slate-200 pt-1">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 font-bold text-[#0b2546]">
              <i aria-hidden="true" className="fa-regular fa-square-check text-amber-600" />
              <span className="text-xs">Guidelines</span>
            </div>
            <div className="flex flex-col space-y-2 px-4 py-1 text-2xs font-medium text-[#0b2546]">
              {sidebarGuidelines.map((item) => (
                <Link
                  className="flex items-start space-x-1.5 transition hover:text-amber-600 hover:underline"
                  key={item.id}
                  to={item.to}
                >
                  <i aria-hidden="true" className="fa-regular fa-file-pdf mt-0.5 text-red-500" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex-1 overflow-y-auto p-4">
          <section className="mb-5 rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight text-[#0b2546]">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                <span>Profile Status (AY 2025-2026)</span>
              </h2>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <span>Profile Completeness</span>
                <span className="rounded bg-emerald-600 px-2 py-0.5 text-2xs font-bold text-white shadow-sm">{completion}%</span>
              </div>
            </div>
            <div
              aria-label={`Core profile fields ${completion} percent complete`}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={completion}
              className="h-2.5 w-full overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-inner"
              role="progressbar"
            >
              <div className="h-full w-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600" style={{ width: `${completion}%` }} />
            </div>
          </section>

          <section>
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#0b2546]">
                <i aria-hidden="true" className="fa-solid fa-circle-check text-xs text-amber-500" />
                <span>Suggested Eligible Schemes (On the basis of Caste, Religion and Income)</span>
              </h3>
              <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-2xs font-medium text-slate-500">
                Showing {visibleSchemes.length} Schemes
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white shadow-sm">
              <table className="schemes-table w-full border-collapse text-left">
                <thead>
                  <tr>
                    <th className="w-5/12">Scheme Name</th>
                    <th className="w-3/12">Department Name</th>
                    <th className="w-2/12">Scheme Type</th>
                    <th className="w-1/12 text-center">Take Action</th>
                    <th className="w-1/12 text-center">Download GRs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700">
                  {visibleSchemes.map((scheme) => (
                    <tr key={scheme.id}>
                      <td className="font-medium text-[#0b2546]">{scheme.name}</td>
                      <td>{scheme.department}</td>
                      <td>
                        <span className={`inline-block rounded px-1.5 py-0.5 text-2xs font-medium ${typeToneClass(scheme.type)}`}>
                          {scheme.type}
                        </span>
                      </td>
                      <td className="text-center">
                        <Link
                          className="inline-block rounded bg-[#0b2546] px-3 py-1 text-2xs font-semibold text-white shadow-sm transition hover:bg-[#08284d]"
                          to={`${ROUTES.applicant.schemes}?view=suggested`}
                        >
                          Apply
                        </Link>
                      </td>
                      <td className="text-center">
                        {scheme.guidelinesAvailable ? (
                          <Link
                            className="inline-flex items-center gap-1 text-2xs font-semibold text-red-600 hover:text-red-700 hover:underline"
                            to={ROUTES.applicant.guidelines}
                          >
                            <i aria-hidden="true" className="fa-regular fa-file-pdf" /> PDF
                          </Link>
                        ) : (
                          <span className="text-2xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pageCount > 1 ? (
              <nav aria-label="Schemes table pagination" className="mt-3 flex items-center space-x-1.5 text-xs text-slate-700">
                {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    aria-current={pageNumber === page ? 'page' : undefined}
                    className={`flex h-6 w-6 items-center justify-center rounded text-2xs font-semibold transition ${
                      pageNumber === page ? 'bg-[#0b2546] font-bold text-white' : 'border border-slate-300 font-semibold text-slate-700 hover:bg-slate-100'
                    }`}
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ))}
                {page < pageCount ? (
                  <button
                    className="flex h-6 w-6 items-center justify-center rounded border border-slate-300 text-2xs font-semibold text-slate-700 transition hover:bg-slate-100"
                    type="button"
                    onClick={() => setPage((current) => current + 1)}
                  >
                    <span aria-hidden="true">&gt;</span>
                    <span className="sr-only">Next page</span>
                  </button>
                ) : null}
              </nav>
            ) : null}
          </section>
        </div>
      </main>

      <footer className="mt-auto w-full select-none border-t border-amber-400/80 bg-white px-6 py-3">
        <div className="flex items-center justify-between text-2xs text-slate-600">
          <div className="flex items-center space-x-4">
            <Link className="font-medium hover:text-blue-600" to={ROUTES.applicant.guidelines}>Terms &amp; Condition</Link>
            <Link className="font-medium hover:text-blue-600" to={`${ROUTES.applicant.guidelines}#faq`}>FAQ</Link>
            <div className="flex items-center space-x-1.5 border-l border-slate-300 pl-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-amber-500 bg-white shadow-sm">
                <i aria-hidden="true" className="fa-solid fa-circle-nodes text-xs text-sky-600" />
              </div>
              <div className="leading-none">
                <span className="block text-2xs font-extrabold tracking-tighter text-blue-900">MahaIT</span>
                <span className="block text-[9px] text-slate-400">DIGITAL SOLUTIONS</span>
              </div>
            </div>
          </div>
          <div className="font-normal text-slate-500">Copyright MahaIT. All Rights Reserved.</div>
        </div>
      </footer>
    </div>
  );
}
