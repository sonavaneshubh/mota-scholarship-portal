import { useCallback, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';
import type { HomeAuthMode, HomeAuthNavigationState } from '../../types';
import { HomeLoginCard } from './HomeLoginCard';
import { Button } from '../ui/Button';

function getInitialAuthMode(state: unknown, pathname: string): HomeAuthMode {
  if (typeof state === 'object' && state !== null) {
    const requestedMode = (state as Partial<HomeAuthNavigationState>).homeAuthMode;

    if (requestedMode === 'applicant' || requestedMode === 'admin' || requestedMode === 'registration') {
      return requestedMode;
    }
  }

  if (pathname === ROUTES.applicant.register) {
    return 'registration';
  }

  if (pathname === ROUTES.admin.login) {
    return 'admin';
  }

  return 'applicant';
}

export function HeroBanner() {
  const location = useLocation();
  const [authMode, setAuthMode] = useState(() => getInitialAuthMode(location.state, location.pathname));
  const isRegistration = authMode === 'registration';
  const handleAuthModeChange = useCallback((mode: HomeAuthMode) => {
    setAuthMode(mode);
  }, []);

  return (
    <section
      className="relative bg-gradient-to-r from-gov-blue-dark via-gov-blue to-slate-900 text-white py-6 px-3 sm:px-4 lg:px-8 overflow-hidden border-b-4 border-amber-500"
      data-purpose="hero-banner"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }}
      />

      {/*
        items-start, not items-center, and this is the fix for the hero content
        appearing to sit too low.

        The login card is 454px tall and the marketing column is only 331px, so
        items-center was centring the shorter text block inside the card's
        height and leaving 62px of empty dark blue above the badge - the badge
        measured y=315 when the hero's content box started at y=253. Aligning
        both columns to the top removes that dead band, puts the badge at the
        hero's top padding, and lines the card's "Applicant Login Here" heading
        up with the badge instead of hanging 62px below it.

        The hero's total height is unchanged either way, because the card is the
        taller of the two and sets the row: 454px + 48px padding = 502px.
      */}
      <div
        className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 lg:items-start"
      >
        {/* lg:mt-4 nudges the text column 16px below the top of the row.

            This is a deliberate midpoint between the two things that were
            wrong before. With items-center the text floated 62px down inside
            the taller card, which read as "sitting too low". Flush against the
            top (items-start, mt-0) that overshot and left the two columns
            looking mechanically aligned. 16px is enough to break the hard edge
            and read as optical alignment, while the card's 411px against the
            text's 311px keeps the difference subtle rather than glaring. */}
        <div className={`${isRegistration ? 'lg:col-span-6' : 'lg:col-span-7'} space-y-3 lg:mt-4`}>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white/10 backdrop-blur rounded-full text-[10px] sm:text-xs text-amber-300 border border-amber-400/40">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                clipRule="evenodd"
                d="M10 1.944A11.954 11.954 0 012.166 5H2a1 1 0 00-1 1v4a1 1 0 001 1h1a1 1 0 001-1V6h.941a13.28 13.28 0 003.412 8.315L9 15.5a1 1 0 001.25 1.5l1.75-.5a1 1 0 00.75-1V15l.5-1a1 1 0 001.5 1v1a1 1 0 001 1v1a1 1 0 001 1c.552 0 1 .724 1 2a1 1 0 001 1h3a1 1 0 001-1v-1a1 1 0 00-1-1h-3a1 1 0 00-1-1v-1a1 1 0 00-1-1h-1a1 1 0 00-1-1v-1a1 1 0 00-1-1h-1a1 1 0 000-2h1a1 1 0 001-1V6a1 1 0 011-1h1a1 1 0 011-1h1a1 1 0 001-1V6a1 1 0 00-1-1H10z"
                fillRule="evenodd"
              />
            </svg>
            AI-Enabled • Human-Verified Workflow
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
            Scholarship & Fellowship Management Portal
          </h2>

          <div className="text-base sm:text-lg md:text-xl font-medium text-amber-200">
            A Unified Digital Platform for Tribal Students & Researchers
          </div>

          <p className="text-slate-200 text-sm sm:text-base leading-relaxed max-w-2xl">
            A unified digital platform for discovering schemes, checking eligibility, submitting
            applications, managing documents, and tracking application verification and decisions.
          </p>

          <div className="pt-2">
            <Button variant="accent" size="lg" to={ROUTES.scholarshipsFellowships} className="w-full sm:w-auto">
              Explore Scholarships & Fellowships
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </div>

          <p className="text-[11px] text-slate-300 italic pt-1">
            Prototype interface — sample content pending final government/state review.
          </p>
        </div>

        <HomeLoginCard onModeChange={handleAuthModeChange} />
      </div>
    </section>
  );
}