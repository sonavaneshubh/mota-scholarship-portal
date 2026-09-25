import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';
import type { ApplicantProfile } from '../../types';

interface ApplicantHeaderProps {
  profile: ApplicantProfile;
  unreadCount: number;
  sidebarOpen: boolean;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

const navigationItems = [
  { label: 'Dashboard', to: ROUTES.applicant.dashboard },
  { label: 'Schemes', to: ROUTES.applicant.schemes },
  { label: 'Applications', to: ROUTES.applicant.applications },
  { label: 'Documents', to: ROUTES.applicant.documents },
  { label: 'History', to: ROUTES.applicant.history },
];

function navClass({ isActive }: { isActive: boolean }) {
  return `inline-flex min-h-11 items-center border-b-2 px-3 py-1.5 text-2xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-portal-amber focus-visible:ring-offset-2 focus-visible:ring-offset-portal-navy ${
    isActive
      ? 'border-portal-amber bg-portal-navy-deep text-white'
      : 'border-transparent text-slate-300 hover:border-slate-600 hover:bg-white/5 hover:text-white'
  }`;
}

export function ApplicantHeader({
  profile,
  unreadCount,
  sidebarOpen,
  onLogout,
  onToggleSidebar,
}: ApplicantHeaderProps) {
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!profileOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setProfileOpen(false);
        profileButtonRef.current?.focus();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profileOpen]);

  return (
    <div className="sticky top-0 z-30 border-b border-portal-navy-deep bg-portal-navy text-white shadow-md">
      <div className="mx-auto flex min-h-12 max-w-[90rem] items-center justify-between gap-3 px-4 py-1 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <button
            aria-controls="applicant-mobile-sidebar"
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? 'Close applicant navigation' : 'Open applicant navigation'}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-white hover:bg-portal-navy-dark focus:outline-none focus:ring-2 focus:ring-portal-amber lg:hidden"
            type="button"
            onClick={onToggleSidebar}
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
              {sidebarOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
          <Link className="flex min-w-0 items-center gap-2 rounded focus:outline-none focus:ring-2 focus:ring-portal-amber" to={ROUTES.applicant.dashboard}>
            <span className="hidden h-7 w-7 shrink-0 items-center justify-center rounded border border-slate-500 bg-white text-2xs font-bold text-portal-navy sm:flex">
              AP
            </span>
            <span className="min-w-0">
              <span className="block truncate text-2xs font-bold">Applicant Portal</span>
              <span className="block truncate text-2xs text-slate-400">Scholarship &amp; Fellowship System · Demo</span>
            </span>
          </Link>
        </div>

        <nav aria-label="Applicant header navigation" className="hidden items-center gap-0.5 lg:flex">
          {navigationItems.map((item) => (
            <NavLink className={navClass} key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          <span className="hidden items-center gap-1.5 rounded border border-slate-600 bg-portal-navy-deep px-2 py-1 text-2xs font-semibold text-slate-200 xl:inline-flex">
            <svg aria-hidden="true" className="h-3.5 w-3.5 text-portal-amber" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2 3 5v5c0 4.2 2.9 7.7 7 8 4.1-.3 7-3.8 7-8V5l-7-3Zm0 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm-3.5 8.6a3.5 3.5 0 0 1 7 0c0 .4-.3.7-.7.7h-5.6a.7.7 0 0 1-.7-.7Z" />
            </svg>
            {profile.category}
          </span>

          <Link
            aria-label={`View notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            className="relative flex h-10 w-10 items-center justify-center rounded text-slate-300 transition hover:bg-portal-navy-dark hover:text-white focus:outline-none focus:ring-2 focus:ring-portal-amber"
            to={ROUTES.applicant.notifications}
          >
            <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
            </svg>
            {unreadCount > 0 ? (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-portal-amber px-1 text-[9px] font-bold text-portal-navy-deep">
                {unreadCount}
              </span>
            ) : null}
          </Link>

          <div className="relative">
            <button
              ref={profileButtonRef}
              aria-controls="applicant-profile-menu"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              className="flex min-h-10 items-center gap-1.5 rounded px-1 text-left transition hover:bg-portal-navy-dark focus:outline-none focus:ring-2 focus:ring-portal-amber sm:px-2"
              type="button"
              onClick={() => setProfileOpen((current) => !current)}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-portal-amber text-2xs font-bold text-portal-navy-deep">
                {profile.avatarInitials}
              </span>
              <span className="hidden max-w-32 truncate text-2xs font-semibold text-white sm:block">{profile.name}</span>
            </button>
            {profileOpen ? (
              <div className="absolute right-0 top-12 z-40 w-60 rounded border border-slate-200 bg-white p-2 text-slate-900 shadow-xl" id="applicant-profile-menu" role="menu">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="truncate text-sm font-semibold text-slate-900">{profile.name}</p>
                  <p className="truncate text-xs text-slate-500">{profile.email}</p>
                  <p className="mt-1 text-[11px] text-slate-500">Applicant ID: {profile.id}</p>
                </div>
                <Link
                  className="mt-1 flex min-h-11 items-center rounded px-3 text-sm text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-gov-blue"
                  role="menuitem"
                  to={ROUTES.applicant.profile}
                >
                  View profile
                </Link>
                <button
                  className="flex min-h-11 w-full items-center rounded px-3 text-left text-sm text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
                  role="menuitem"
                  type="button"
                  onClick={onLogout}
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
