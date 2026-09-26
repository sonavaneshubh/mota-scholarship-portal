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

const scholarshipNavItems = [
  { label: 'Benefit Schemes', to: ROUTES.applicant.schemes },
  { label: 'Post Matric Scholarship', to: `${ROUTES.applicant.schemes}?category=post-matric` },
  { label: 'Pre Matric Scholarship', to: `${ROUTES.applicant.schemes}?category=pre-matric` },
  { label: 'Pension Schemes', to: `${ROUTES.applicant.schemes}?category=pension` },
  { label: 'Farmer Schemes', to: `${ROUTES.applicant.schemes}?category=farmer` },
  { label: 'Labour Schemes', to: `${ROUTES.applicant.schemes}?category=labour` },
  { label: 'SP Sch', to: `${ROUTES.applicant.schemes}?category=special-assistance` },
];

function navClass({ isActive }: { isActive: boolean }) {
  return `inline-flex items-center px-4 py-2.5 text-sm font-medium transition-colors rounded-lg ${
    isActive
      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
      : 'text-slate-300 hover:text-white hover:bg-white/5'
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
    <header className="w-full bg-[#0B2A4A] border-b border-amber-500/20 shadow-lg">
      <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button
              aria-controls="applicant-mobile-sidebar"
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? 'Close applicant navigation' : 'Open applicant navigation'}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400 lg:hidden"
              type="button"
              onClick={onToggleSidebar}
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
                {sidebarOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>

            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-[#0B2A4A]">
                {profile.avatarInitials}
              </span>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-white truncate max-w-[200px]">{profile.name}</p>
                <p className="text-[11px] text-slate-400">Applicant ID: {profile.id}</p>
              </div>
            </div>

            <nav aria-label="Scholarship navigation" className="hidden md:flex items-center gap-1 ml-4 border-l border-white/10 pl-4">
              {scholarshipNavItems.map((item) => (
                <NavLink
                  className={({ isActive }) => navClass({ isActive })}
                  key={item.to}
                  to={item.to}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <button
              aria-label="Toggle scholarship navigation"
              aria-expanded={mobileNavOpen}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors border border-white/10"
              type="button"
              onClick={() => setMobileNavOpen((current) => !current)}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Schemes</span>
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="hidden items-center gap-1.5 rounded-lg border border-slate-600 bg-[#0B2A4A] px-3 py-1.5 text-xs font-semibold text-slate-200 sm:inline-flex">
              <svg aria-hidden="true" className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2 3 5v5c0 4.2 2.9 7.7 7 8 4.1-.3 7-3.8 7-8V5l-7-3Zm0 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm-3.5 8.6a3.5 3.5 0 0 1 7 0c0 .4-.3.7-.7.7h-5.6a.7.7 0 0 1-.7-.7Z" />
              </svg>
              {profile.category}
            </span>

            <Link
              aria-label={`View notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              to={ROUTES.applicant.notifications}
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
              </svg>
              {unreadCount > 0 ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-[#0B2A4A]">
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
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400"
                type="button"
                onClick={() => setProfileOpen((current) => !current)}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-[#0B2A4A]">
                  {profile.avatarInitials}
                </span>
                <span className="hidden max-w-32 truncate text-sm font-medium text-white sm:block">{profile.name}</span>
                <svg className="h-4 w-4 text-slate-400 hidden sm:block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {profileOpen ? (
                <div className="absolute right-0 top-full z-40 mt-2 w-64 rounded-lg border border-slate-200 bg-white p-2 text-slate-900 shadow-xl" id="applicant-profile-menu" role="menu">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{profile.name}</p>
                    <p className="truncate text-xs text-slate-500">{profile.email}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Applicant ID: {profile.id}</p>
                  </div>
                  <Link
                    className="mt-1 flex min-h-11 items-center rounded-lg px-3 text-sm text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    role="menuitem"
                    to={ROUTES.applicant.profile}
                  >
                    View profile
                  </Link>
                  <button
                    className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
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

        {mobileNavOpen && (
          <div className="md:hidden py-2 border-t border-white/10 animate-slide-down">
            <nav className="flex flex-col gap-1">
              {scholarshipNavItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  onClick={() => setMobileNavOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}