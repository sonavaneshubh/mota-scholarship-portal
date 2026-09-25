import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import type { ApplicantProfile } from '../../types';
import { ROUTES } from '../../lib/constants';

interface ApplicantHeaderProps {
  profile: ApplicantProfile;
  onLogout: () => void;
}

const navigationItems = [
  { label: 'Dashboard', to: ROUTES.applicant.dashboard },
  { label: 'Schemes', to: ROUTES.applicant.schemes },
  { label: 'Applications', to: ROUTES.applicant.applications },
  { label: 'Documents', to: ROUTES.applicant.documents },
];

function navClass({ isActive }: { isActive: boolean }) {
  return `min-h-11 rounded px-3 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-blue-50 text-gov-blue' : 'text-slate-600 hover:bg-slate-100 hover:text-gov-blue'
  }`;
}

export function ApplicantHeader({ profile, onLogout }: ApplicantHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  function closeMenus() {
    setMobileOpen(false);
    setProfileOpen(false);
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link className="flex min-w-0 items-center gap-3" to={ROUTES.applicant.dashboard} onClick={closeMenus}>
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gov-blue-dark text-lg font-bold text-white">
            A
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-gov-blue-dark">Applicant Portal</span>
            <span className="block truncate text-[11px] text-slate-500">Scholarship & Fellowship Demo</span>
          </span>
        </Link>

        <nav aria-label="Applicant navigation" className="hidden items-center gap-1 lg:flex">
          {navigationItems.map((item) => (
            <NavLink className={navClass} key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            aria-label="View notifications"
            className="relative flex h-11 w-11 items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-gov-blue"
            to={ROUTES.applicant.notifications}
            onClick={closeMenus}
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
            </svg>
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gov-saffron" />
          </Link>

          <div className="relative">
            <button
              aria-expanded={profileOpen}
              className="flex min-h-11 items-center gap-2 rounded px-2 text-left hover:bg-slate-100"
              type="button"
              onClick={() => setProfileOpen((current) => !current)}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-gov-saffron-dark">
                {profile.avatarInitials}
              </span>
              <span className="hidden max-w-32 truncate text-xs font-semibold text-slate-700 sm:block">{profile.name}</span>
            </button>
            {profileOpen ? (
              <div className="absolute right-0 top-12 z-20 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="truncate text-sm font-semibold text-slate-900">{profile.name}</p>
                  <p className="truncate text-xs text-slate-500">{profile.email}</p>
                </div>
                <Link className="mt-1 flex min-h-11 items-center rounded px-3 text-sm text-slate-700 hover:bg-slate-100" to={ROUTES.applicant.profile} onClick={closeMenus}>
                  View profile
                </Link>
                <button className="flex min-h-11 w-full items-center rounded px-3 text-left text-sm text-red-700 hover:bg-red-50" type="button" onClick={onLogout}>
                  Sign out
                </button>
              </div>
            ) : null}
          </div>

          <button
            aria-expanded={mobileOpen}
            aria-label="Toggle applicant navigation"
            className="flex h-11 w-11 items-center justify-center rounded text-slate-600 hover:bg-slate-100 lg:hidden"
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
          >
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
              {mobileOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <nav aria-label="Mobile applicant navigation" className="border-t border-slate-200 px-4 py-2 lg:hidden">
          <div className="mx-auto grid max-w-7xl gap-1 sm:grid-cols-2">
            {navigationItems.map((item) => (
              <NavLink className={navClass} key={item.to} to={item.to} onClick={closeMenus}>
                {item.label}
              </NavLink>
            ))}
            <NavLink className={navClass} to={ROUTES.applicant.notifications} onClick={closeMenus}>
              Notifications
            </NavLink>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
