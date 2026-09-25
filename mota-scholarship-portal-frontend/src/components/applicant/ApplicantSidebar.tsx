import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';
import { calculateApplicantProfileCompletion } from '../../lib/applicantProfile';
import type { ApplicantProfile } from '../../types';

interface ApplicantSidebarProps {
  profile: ApplicantProfile;
  applicationCount: number;
  documentAttentionCount: number;
  unreadNotificationCount: number;
  categoryVerified: boolean;
  onLogout: () => void;
  onNavigate?: () => void;
  onClose?: () => void;
  idPrefix: string;
}

const navIcons: Record<string, ReactNode> = {
  dashboard: (
    <>
      <rect height="7" rx="1" width="7" x="3" y="3" />
      <rect height="7" rx="1" width="7" x="14" y="3" />
      <rect height="7" rx="1" width="7" x="3" y="14" />
      <rect height="7" rx="1" width="7" x="14" y="14" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </>
  ),
  scholarships: (
    <>
      <path d="m12 4 10 5-10 5L2 9l10-5Z" />
      <path d="M6 11.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5" />
    </>
  ),
  suggested: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.2 5.2l1.8 1.8M17 17l1.8 1.8M18.8 5.2 17 7M7 17l-1.8 1.8" />
    </>
  ),
  applications: (
    <>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  documents: <path d="M3 7a1 1 0 0 1 1-1h5l2 2h8a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7Z" />,
  history: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.9-6.4" />
      <path d="M3 4.5V9h4.5" />
      <path d="M12 8v4.3l3 1.8" />
    </>
  ),
  notifications: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  grievance: (
    <>
      <path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
      <path d="M9 11h6M9 15h4" />
    </>
  ),
  guidelines: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2V5Z" />
      <path d="M8 7h7M8 11h7" />
    </>
  ),
  faq: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.4 9.4a2.6 2.6 0 1 1 3.2 2.6v1.4" />
      <path d="M12 17.2h.01" />
    </>
  ),
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
      {navIcons[name]}
    </svg>
  );
}

const navigationItems = [
  { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', to: ROUTES.applicant.dashboard },
  { id: 'profile', icon: 'profile', label: 'My Profile', to: ROUTES.applicant.profile },
  { id: 'scholarships', icon: 'scholarships', label: 'Scholarships & Fellowships', to: ROUTES.applicant.schemes },
  {
    id: 'suggested',
    icon: 'suggested',
    label: 'Suggested Eligible Schemes',
    to: `${ROUTES.applicant.schemes}?view=suggested`,
  },
  { id: 'applications', icon: 'applications', label: 'My Applications', to: ROUTES.applicant.applications, count: 'applications' },
  { id: 'documents', icon: 'documents', label: 'My Documents', to: ROUTES.applicant.documents, count: 'documents' },
  { id: 'history', icon: 'history', label: 'Application History', to: ROUTES.applicant.history },
  { id: 'notifications', icon: 'notifications', label: 'Notifications', to: ROUTES.applicant.notifications, count: 'notifications' },
  { id: 'grievance', icon: 'grievance', label: 'Grievance / Suggestions', to: ROUTES.applicant.grievance },
  { id: 'guidelines', icon: 'guidelines', label: 'Guidelines', to: ROUTES.applicant.guidelines },
  { id: 'faq', icon: 'faq', label: 'Help / FAQ', to: `${ROUTES.applicant.guidelines}#faq` },
] as const;

const guidelineLinks = [
  { id: 'instructions', label: 'Instruction set for the online application process', to: ROUTES.applicant.guidelines },
  { id: 'popups', label: 'Pop-up blocker guidance', to: `${ROUTES.applicant.guidelines}#faq` },
  { id: 'password', label: 'Password and sign-in help', to: `${ROUTES.applicant.guidelines}#faq` },
] as const;

export function ApplicantSidebar({
  profile,
  applicationCount,
  documentAttentionCount,
  unreadNotificationCount,
  categoryVerified,
  onLogout,
  onNavigate,
  onClose,
  idPrefix,
}: ApplicantSidebarProps) {
  const location = useLocation();
  const completion = calculateApplicantProfileCompletion(profile);
  const counts = {
    applications: applicationCount,
    documents: documentAttentionCount,
    notifications: unreadNotificationCount,
  };

  function isCurrent(item: (typeof navigationItems)[number]) {
    const targetPath = item.to.split(/[?#]/)[0];
    if (location.pathname !== targetPath) {
      return false;
    }

    if (item.id === 'suggested') {
      return location.search === '?view=suggested';
    }

    if (item.id === 'faq') {
      return location.hash === '#faq';
    }

    return true;
  }

  return (
    <div className="flex min-h-full flex-col bg-white">
      {onClose ? (
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 lg:hidden">
          <p className="text-sm font-bold text-gov-blue-dark">Applicant menu</p>
          <button
            aria-label="Close applicant menu"
            className="flex h-11 w-11 items-center justify-center rounded text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-gov-blue"
            type="button"
            onClick={onClose}
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      ) : null}

      <div className="border-b border-slate-200 bg-portal-navy p-3 text-white">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-portal-amber text-2xs font-bold text-portal-navy-deep">
            {profile.avatarInitials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-2xs font-semibold text-white">{profile.name}</p>
            <p className="mt-0.5 truncate text-2xs text-slate-400">{profile.course}</p>
            <p className="mt-0.5 truncate text-2xs text-slate-500">ID: {profile.id}</p>
          </div>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-0.5 text-2xs font-medium text-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-portal-amber" aria-hidden="true" />
            {profile.category}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-0.5 text-2xs font-medium text-slate-200">
            <span className={`h-1.5 w-1.5 rounded-full ${categoryVerified ? 'bg-emerald-400' : 'bg-amber-400'}`} aria-hidden="true" />
            {categoryVerified ? 'Category verified' : 'Category pending'}
          </span>
        </div>
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-2xs font-medium text-slate-400">
            <span>Profile completeness</span>
            <span className="font-bold text-emerald-400">{completion}%</span>
          </div>
          <div
            aria-label={`Core profile fields ${completion} percent complete`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={completion}
            className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/15"
            id={`${idPrefix}-profile-progress`}
            role="progressbar"
          >
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600" style={{ width: `${completion}%` }} />
          </div>
        </div>
      </div>

      <nav aria-label="Applicant portal sections" className="flex-1 px-2 py-2">
        <p className="px-2 pb-1 text-2xs font-bold uppercase tracking-wider text-slate-400">Workspace</p>
        <ul className="divide-y divide-slate-100">
          {navigationItems.map((item) => {
            const current = isCurrent(item);
            const countKey = 'count' in item ? item.count : null;
            const count = countKey ? counts[countKey] : undefined;

            return (
              <li key={item.id}>
                <Link
                  aria-current={current ? 'page' : undefined}
                  className={`flex min-h-10 items-center justify-between gap-2 px-2 py-1.5 text-2xs font-medium transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-portal-amber ${
                    current
                      ? '-ml-2 border-l-4 border-portal-navy bg-blue-50/60 pl-1.5 font-semibold text-portal-navy'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-portal-navy'
                  }`}
                  to={item.to}
                  onClick={onNavigate}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className={current ? 'text-portal-amber' : 'text-slate-400'}><NavIcon name={item.icon} /></span>
                    <span className="min-w-0 truncate">{item.label}</span>
                  </span>
                  {typeof count === 'number' && count > 0 ? (
                    <span
                      className={`inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                        current ? 'bg-portal-navy text-white' : 'bg-blue-100 text-portal-navy'
                      }`}
                    >
                      {count}
                      <span className="sr-only">
                        {countKey === 'applications' ? ' applications' : countKey === 'documents' ? ' document updates' : ' unread notifications'}
                      </span>
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-200 p-2">
        <Link
          className="mb-2 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50/80 px-2.5 py-2 transition hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-portal-amber"
          to={`${ROUTES.applicant.guidelines}#faq`}
          onClick={onNavigate}
        >
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-portal-amber" />
            <span className="text-2xs font-bold text-portal-navy">Click here for Help</span>
          </span>
          <svg aria-hidden="true" className="h-3.5 w-3.5 text-amber-600" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>

        <Link
          className="mb-2 flex w-full items-center justify-center gap-1.5 rounded bg-portal-navy py-1.5 text-2xs font-medium text-white shadow-sm transition hover:bg-portal-navy-dark focus:outline-none focus:ring-2 focus:ring-portal-amber"
          to={ROUTES.applicant.grievance}
          onClick={onNavigate}
        >
          <svg aria-hidden="true" className="h-3.5 w-3.5 text-portal-amber" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
          </svg>
          Grievance / Suggestions
        </Link>

        <div className="border-t border-slate-200 pt-2">
          <p className="flex items-center gap-1.5 px-1 py-1 text-2xs font-bold text-portal-navy">
            <svg aria-hidden="true" className="h-3.5 w-3.5 text-portal-amber" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M4 6h16v12H4z" />
              <path d="m8 11 2.5 2.5L16 9" />
            </svg>
            Guidelines
          </p>
          <ul className="space-y-1 px-1 py-1">
            {guidelineLinks.map((item) => (
              <li key={item.id}>
                <Link
                  className="flex items-start gap-1.5 text-2xs font-medium text-portal-navy transition hover:text-portal-amber focus:outline-none focus:ring-2 focus:ring-portal-amber"
                  to={item.to}
                  onClick={onNavigate}
                >
                  <svg aria-hidden="true" className="mt-0.5 h-3 w-3 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 2h6l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm6 0v4h4M7 12h6M7 15h4" />
                  </svg>
                  <span className="min-w-0">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-2 text-2xs leading-relaxed text-slate-700">
          <p className="font-bold text-portal-navy">AI assistance notice</p>
          <p className="mt-0.5">AI assists document verification. Final verification and decisions are performed by authorized officials.</p>
        </div>

        <button
          className="mt-2 flex min-h-10 w-full items-center gap-1.5 rounded px-2 text-2xs font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
          type="button"
          onClick={onLogout}
        >
          <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
            <path d="M10 17l-5-5 5-5M5 12h11" />
          </svg>
          Logout
        </button>
      </div>
    </div>
  );
}
