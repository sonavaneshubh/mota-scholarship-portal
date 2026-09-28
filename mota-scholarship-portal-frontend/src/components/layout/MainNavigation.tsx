import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { NAVIGATION_ITEMS, ROUTES } from '../../lib/constants';
import type { HomeAuthMode, HomeAuthNavigationState } from '../../types';
import { Button } from '../ui/Button';

interface NavigationItemsProps {
  mobile?: boolean;
  onNavigate: () => void;
}

function NavigationItems({ mobile = false, onNavigate }: NavigationItemsProps) {
  const location = useLocation();

  return (
    <ul className={mobile ? 'px-2 py-1 space-y-0.5 text-sm' : 'hidden md:flex flex-wrap items-center text-xs md:text-sm font-medium'}>
      {NAVIGATION_ITEMS.map((item) => {
        const isActive = location.pathname === item.href;

        return (
          <li key={item.id}>
            <Link
              to={item.href}
              className={
                mobile
                  ? `block py-2 px-3 ${
                      isActive
                        ? 'text-white font-bold border-l-2 border-amber-400'
                        : 'text-slate-100 hover:bg-gov-blue-light'
                    }`
                  : `inline-block py-1 px-3 ${
                      isActive
                        ? 'bg-gov-blue-dark text-white border-b-2 border-amber-400 font-bold'
                        : 'text-slate-100 hover:bg-gov-blue-light transition'
                    }`
              }
              aria-current={isActive ? 'page' : undefined}
              onClick={onNavigate}
            >
              {!mobile && item.id === 'home' ? (
                <svg className="w-4 h-4 inline-block align-text-bottom mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
              ) : null}
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function HamburgerIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function MainNavigation() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  function openAuthCard(mode: HomeAuthMode) {
    const state: HomeAuthNavigationState = { homeAuthMode: mode };
    setMobileOpen(false);
    navigate(ROUTES.home, { replace: location.pathname === ROUTES.home, state });
  }

  return (
    <nav aria-label="Main Navigation" className="bg-gov-blue text-white sticky top-0 z-40 shadow">
      <div className="mx-auto max-w-full px-3 sm:px-4 lg:px-6">
        {/* 40px, down from 52px originally. The link row is 30px (20px line
            + 4px above and below + the 2px amber active underline), so 5px of
            breathing room remains top and bottom. This is the floor I would
            take the bar to without pushing desktop links under a 40px touch
            target, so please treat it as the minimum. */}
        <div className="flex items-center justify-between min-h-[40px]">
          <NavigationItems onNavigate={() => setMobileOpen(false)} />

          <div className="hidden lg:flex items-center space-x-2 py-1">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              aria-controls="home-login"
              onClick={() => openAuthCard('applicant')}
            >
              Login
            </Button>
            <Button
              variant="accent"
              size="sm"
              type="button"
              aria-controls="home-login"
              onClick={() => openAuthCard('registration')}
            >
              New Registration
            </Button>
          </div>

          <button
            type="button"
            className="lg:hidden text-white p-2 focus:outline-none"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <HamburgerIcon />
            )}
          </button>
        </div>

        {mobileOpen ? (
          <div className="lg:hidden border-t border-blue-900 bg-gov-blue-dark animate-slide-down">
            <NavigationItems mobile onNavigate={() => setMobileOpen(false)} />
            <div className="px-3 py-3 flex flex-col gap-2 border-t border-blue-900">
              <Button
                variant="ghost"
                size="sm"
                type="button"
                className="w-full justify-center"
                aria-controls="home-login"
                onClick={() => openAuthCard('applicant')}
              >
                Login
              </Button>
              <Button
                variant="accent"
                size="sm"
                type="button"
                className="w-full justify-center"
                aria-controls="home-login"
                onClick={() => openAuthCard('registration')}
              >
                New Registration
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}