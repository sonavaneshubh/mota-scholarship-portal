import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';

interface ApplicantSidebarProps {
  applicationCount: number;
  documentAttentionCount: number;
  unreadNotificationCount: number;
  onLogout: () => void;
  onNavigate?: () => void;
  onClose?: () => void;
  onToggleCollapse?: () => void;
  collapsed?: boolean;
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

function HamburgerIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      {direction === 'left' ? (
        <path d="M15 18l-6-6 6-6" />
      ) : (
        <path d="M9 18l6-6-6-6" />
      )}
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

export function ApplicantSidebar({
  applicationCount,
  documentAttentionCount,
  unreadNotificationCount,
  onLogout,
  onNavigate,
  onClose,
  onToggleCollapse,
  collapsed = false,
}: ApplicantSidebarProps) {
  const location = useLocation();
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

  const sidebarWidth = collapsed ? 'w-16' : 'w-64';

  return (
    <div className={`flex h-full flex-col bg-white border-r border-slate-200 transition-all duration-300 ${sidebarWidth}`}>
      {onClose ? (
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 lg:hidden">
          <p className="text-sm font-bold text-[#0B2A4A]">Applicant menu</p>
          <button
            aria-label="Close applicant menu"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
            type="button"
            onClick={onClose}
          >
            <HamburgerIcon className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-200">
        {!collapsed && (
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">WORKSPACE</p>
        )}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronIcon direction="right" /> : <HamburgerIcon className="h-5 w-5" />}
          </button>
        )}
      </div>

      <nav aria-label="Applicant portal sections" className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const current = isCurrent(item);
            const countKey = 'count' in item ? item.count : null;
            const count = countKey ? counts[countKey] : undefined;

            return (
              <li key={item.id}>
                <Link
                  aria-current={current ? 'page' : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  className={`flex min-h-11 items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    current
                      ? 'bg-amber-500/10 text-[#0B2A4A] border border-amber-500/20'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-[#0B2A4A]'
                  } ${collapsed ? 'justify-center' : ''}`}
                  to={item.to}
                  onClick={onNavigate}
                >
                  <span className={`shrink-0 ${current ? 'text-amber-500' : 'text-slate-400'}`}><NavIcon name={item.icon} /></span>
                  {!collapsed && <span className="min-w-0 truncate">{item.label}</span>}
                  {!collapsed && typeof count === 'number' && count > 0 && (
                    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full px-2 text-[10px] font-bold text-white bg-amber-500">
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {!collapsed && (
        <div className="border-t border-slate-200 p-4">
        <Link
          className="mb-3 flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 transition-colors hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          to={`${ROUTES.applicant.guidelines}#faq`}
          onClick={onNavigate}
        >
          <span className="flex items-center gap-2 text-sm font-medium text-[#0B2A4A]">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
            Click here for Help
          </span>
          <svg aria-hidden="true" className="h-4 w-4 text-amber-600" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>

        <Link
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B2A4A] px-3 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#0B2A4A]/90"
          to={ROUTES.applicant.grievance}
          onClick={onNavigate}
        >
          <svg aria-hidden="true" className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
          </svg>
          Grievance / Suggestions
        </Link>

        <button
          className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
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
    )}

    {collapsed && (
      <div className="border-t border-slate-200 p-2 space-y-1">
        <Link
          aria-label="Help"
          className="flex h-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-[#0B2A4A] transition-colors"
          to={`${ROUTES.applicant.guidelines}#faq`}
          onClick={onNavigate}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </Link>
        <Link
          aria-label="Grievance / Suggestions"
          className="flex h-11 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-[#0B2A4A] transition-colors"
          to={ROUTES.applicant.grievance}
          onClick={onNavigate}
        >
          <svg className="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
          </svg>
        </Link>
        <button
          aria-label="Logout"
          className="flex h-11 w-full items-center justify-center rounded-lg text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-300"
          type="button"
          onClick={onLogout}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
            <path d="M10 17l-5-5 5-5M5 12h11" />
          </svg>
        </button>
      </div>
    )}
    </div>
  );
}