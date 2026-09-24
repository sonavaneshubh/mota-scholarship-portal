import { useState } from 'react';
import { Link } from 'react-router-dom';
import { NAVIGATION_ITEMS, SECTION_IDS } from '../../lib/constants';
import { Button } from '../ui/Button';

export function MainNavigation() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav aria-label="Main Navigation" className="bg-gov-blue text-white sticky top-0 z-40 shadow">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        <ul className="hidden md:flex flex-wrap items-center text-xs md:text-sm font-medium">
          {NAVIGATION_ITEMS.map((item) =>
            item.active ? (
              <li key={item.id}>
                <Link
                  to={item.href}
                  className="inline-block py-2.5 px-3 bg-gov-blue-dark text-white border-b-2 border-amber-400 font-bold flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  Home
                </Link>
              </li>
            ) : (
              <li key={item.id}>
                <a
                  className="inline-block py-2.5 px-3 text-slate-100 hover:bg-gov-blue-light transition"
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            ),
          )}
        </ul>

        <div className="hidden lg:flex items-center space-x-2 py-1.5">
          <Button variant="ghost" size="sm" href={SECTION_IDS.OFFICER_ACCESS}>
            Login
          </Button>
          <Button variant="accent" size="sm" href={SECTION_IDS.HOW_TO_APPLY}>
            New Registration
          </Button>
        </div>

        <button
          type="button"
          className="md:hidden text-white p-2 focus:outline-none"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {mobileOpen ? (
        <div className="md:hidden border-t border-blue-900 bg-gov-blue-dark">
          <ul className="px-2 py-1 space-y-0.5 text-sm">
            {NAVIGATION_ITEMS.map((item) =>
              item.active ? (
                <li key={item.id}>
                  <Link
                    to={item.href}
                    className="block py-2 px-3 text-white font-bold border-l-2 border-amber-400"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ) : (
                <li key={item.id}>
                  <a
                    href={item.href}
                    className="block py-2 px-3 text-slate-100 hover:bg-gov-blue-light"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </a>
                </li>
              ),
            )}
          </ul>
          <div className="px-2 py-3 flex flex-col gap-2 border-t border-blue-900">
            <Button variant="ghost" size="sm" href={SECTION_IDS.OFFICER_ACCESS} className="justify-center">
              Login
            </Button>
            <Button variant="accent" size="sm" href={SECTION_IDS.HOW_TO_APPLY} className="justify-center">
              New Registration
            </Button>
          </div>
        </div>
      ) : null}
    </nav>
  );
}