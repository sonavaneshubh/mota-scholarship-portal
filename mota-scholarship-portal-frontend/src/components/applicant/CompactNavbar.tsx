import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';
import type { ApplicantProfile } from '../../types';

interface CompactNavbarProps {
  profile: ApplicantProfile;
  unreadCount: number;
  sidebarOpen: boolean;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

const schemeNavItems = [
  { label: 'Benefit Schemes', to: ROUTES.applicant.schemes, icon: null },
  { label: 'Post Matric Scholarship', to: `${ROUTES.applicant.schemes}?category=post-matric`, icon: 'graduation-cap', active: true },
  { label: 'Pre Matric Scholarship', to: `${ROUTES.applicant.schemes}?category=pre-matric`, icon: 'user-graduate' },
  { label: 'Pension Schemes', to: `${ROUTES.applicant.schemes}?category=pension`, icon: 'person-cane' },
  { label: 'Farmer Schemes', to: `${ROUTES.applicant.schemes}?category=farmer`, icon: 'tractor' },
  { label: 'Labour Schemes', to: `${ROUTES.applicant.schemes}?category=labour`, icon: 'helmet-safety' },
  { label: 'SP Sch', to: `${ROUTES.applicant.schemes}?category=special-assistance`, icon: 'hand-holding-hand' },
];

function NavIcon({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const icons: Record<string, React.ReactNode> = {
    'graduation-cap': (
      <svg className={`h-4 w-4 ${size === 'md' ? 'h-5 w-5' : ''}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    'user-graduate': (
      <svg className={`h-4 w-4 ${size === 'md' ? 'h-5 w-5' : ''}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M21 13v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2" />
        <path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        <path d="M8 21h8a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2z" />
      </svg>
    ),
    'person-cane': (
      <svg className={`h-4 w-4 ${size === 'md' ? 'h-5 w-5' : ''}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M18 8a2 2 0 0 0-4 0" />
        <path d="M12 12V4m0 8a8 8 0 0 1-8 8" />
        <path d="M12 12v8m8-8a8 8 0 0 1-8 8" />
      </svg>
    ),
    'tractor': (
      <svg className={`h-4 w-4 ${size === 'md' ? 'h-5 w-5' : ''}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M18 18a2 2 0 0 0 0-4 2 2 0 0 0 0 4zm0 0V6h-6a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2" />
        <path d="M6 18a2 2 0 0 1 0-4 2 2 0 0 1 0 4z" />
      </svg>
    ),
    'helmet-safety': (
      <svg className={`h-4 w-4 ${size === 'md' ? 'h-5 w-5' : ''}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 2a10 10 0 0 1 10 10" />
        <path d="M12 18a10 10 0 0 1-10-10" />
        <path d="M12 6v6" />
      </svg>
    ),
    'hand-holding-hand': (
      <svg className={`h-4 w-4 ${size === 'md' ? 'h-5 w-5' : ''}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M11 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
        <path d="M19 18a4 4 0 0 0-8 0" />
        <path d="M7 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      </svg>
    ),
  };
  return icons[name] || null;
}

function HamburgerIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function CompactNavbar({
  profile,
  unreadCount,
  sidebarOpen,
  onLogout,
  onToggleSidebar,
}: CompactNavbarProps) {
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!profileOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setProfileOpen(false);
        profileButtonRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [profileOpen]);

  const isActiveRoute = (to: string) => {
    const targetPath = to.split(/[?#]/)[0];
    return location.pathname === targetPath || location.pathname.startsWith(targetPath + '?');
  };

  return (
    <header className="w-full bg-[#0B2A4A] border-b border-amber-500/20 shadow-lg sticky top-0 z-40">
      <div className="mx-auto max-w-full px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between gap-2 py-2 min-h-[56px]">
          <div className="flex items-center gap-1.5 flex-shrink-0 min-w-0">
            <button
              aria-controls="applicant-mobile-sidebar"
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? 'Close applicant navigation' : 'Open applicant navigation'}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400 lg:hidden"
              type="button"
              onClick={onToggleSidebar}
            >
              <HamburgerIcon />
            </button>

            <Link
              to={`${ROUTES.applicant.guidelines}#faq`}
              className="flex-shrink-0 flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 shadow-sm transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#0B2A4A]"
              aria-label="How to Apply Online"
            >
              <svg className="h-4 w-4 text-[#0B2A4A] flex-shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <span className="text-xs sm:text-sm font-extrabold text-[#0B2A4A] whitespace-nowrap hidden sm:inline">How to</span>
              <span className="text-xs sm:text-sm font-extrabold text-[#0B2A4A] whitespace-nowrap">Apply Online ?</span>
            </Link>

            <span className="hidden lg:flex h-6 w-px bg-white/10 mx-1" aria-hidden="true" />
          </div>

          <nav aria-label="Scholarship scheme navigation" className="flex-1 flex items-center gap-1 overflow-x-auto whitespace-nowrap pb-1 px-2 lg:pb-0 lg:px-0 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            <div className="flex items-center gap-1 scheme-nav">
              {schemeNavItems.map((item, index) => {
                const isActive = item.active || isActiveRoute(item.to);
                
                if (index === 1) {
                  return (
                    <span key="arrow-back" className="flex-shrink-0 flex items-center justify-center h-9 w-9 text-slate-400 hover:text-amber-400 transition-colors" aria-hidden="true">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  );
                }

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive: navActive }) => {
                      const active = navActive || isActive;
                      return `flex-shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                        active
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_0_1px_rgba(251,191,36,0.3)]'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10'
                      }`;
                    }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.icon && <NavIcon name={item.icon} size="sm" />}
                    <span className="leading-tight">{item.label}</span>
                  </NavLink>
                );
              })}
              
              <span className="flex-shrink-0 flex items-center justify-center h-9 w-9 text-slate-400 hover:text-amber-400 transition-colors" aria-hidden="true">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
            <Link
              aria-label={`View notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 hidden md:flex"
              to={ROUTES.applicant.notifications}
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-[#0B2A4A]">
                  {unreadCount}
                </span>
              )}
            </Link>

            <div className="relative">
              <button
                ref={profileButtonRef}
                aria-controls="applicant-profile-menu"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400"
                type="button"
                onClick={() => setProfileOpen((current) => !current)}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-[#0B2A4A]">
                  {profile.avatarInitials}
                </span>
                <span className="hidden sm:block max-w-[140px] truncate text-sm font-medium text-white">{profile.name}</span>
                <svg className="h-3.5 w-3.5 text-slate-400 hidden sm:block" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full z-40 mt-1.5 w-56 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-900 shadow-xl" id="applicant-profile-menu" role="menu">
                  <div className="border-b border-slate-100 px-2 py-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{profile.name}</p>
                    <p className="truncate text-xs text-slate-500">{profile.email}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Applicant ID: {profile.id}</p>
                  </div>
                  <Link
                    className="flex min-h-10 items-center rounded-lg px-2.5 text-sm text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    role="menuitem"
                    to={ROUTES.applicant.profile}
                  >
                    View profile
                  </Link>
                  <button
                    className="flex min-h-10 w-full items-center rounded-lg px-2.5 text-left text-sm text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
                    role="menuitem"
                    type="button"
                    onClick={onLogout}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {mobileNavOpen && (
          <div className="lg:hidden py-2 border-t border-white/10 animate-slide-down">
            <nav className="flex flex-col gap-1">
              {schemeNavItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2"
                  onClick={() => setMobileNavOpen(false)}
                >
                  {item.icon && <NavIcon name={item.icon} size="md" />}
                  <span className="whitespace-normal leading-tight">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}