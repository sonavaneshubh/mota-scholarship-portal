import { ROUTES, SECTION_IDS } from '../../lib/constants';
import { HomeLoginCard } from './HomeLoginCard';
import { Button } from '../ui/Button';

export function HeroBanner() {
  return (
    <section
      className="relative bg-gradient-to-r from-gov-blue-dark via-gov-blue to-slate-900 text-white py-6 md:py-8 px-4 overflow-hidden border-b-4 border-amber-500"
      data-purpose="hero-banner"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }}
      />

      <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-2.5 md:px-3 py-1 bg-white/10 backdrop-blur rounded-full text-[11px] md:text-xs text-amber-300 border border-amber-400/40">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                clipRule="evenodd"
                d="M10 1.944A11.954 11.954 0 012.166 5H2a1 1 0 00-1 1v4a1 1 0 001 1h1a1 1 0 001-1V6h.941a13.28 13.28 0 003.412 8.315L9 15.5a1 1 0 001.25 1.5l1.75-.5a1 1 0 00.75-1V15l.5-1a1 1 0 001.5 1v1a1 1 0 001 1v1a1 1 0 001 1c.552 0 1 .724 1 2a1 1 0 001 1h3a1 1 0 001-1v-1a1 1 0 00-1-1h-3a1 1 0 00-1-1v-1a1 1 0 00-1-1h-1a1 1 0 00-1-1v-1a1 1 0 00-1-1h-1a1 1 0 000-2h1a1 1 0 001-1v-1a1 1 0 011-1h1a1 1 0 011-1h1a1 1 0 001-1h1a1 1 0 001-1V6a1 1 0 00-1-1H10z"
                fillRule="evenodd"
              />
            </svg>
            AI-Enabled • Human-Verified Workflow
          </div>

          <h2 className="text-[22px] sm:text-2xl md:text-4xl font-extrabold tracking-tight leading-tight">
            Scholarship &amp; Fellowship Management Portal
          </h2>

          <div className="text-base sm:text-lg md:text-xl font-medium text-amber-200">
            A Unified Digital Platform for Tribal Students &amp; Researchers
          </div>

          <p className="text-slate-200 text-[13px] md:text-base leading-relaxed max-w-2xl">
            A unified digital platform for discovering schemes, checking eligibility, submitting
            applications, managing documents, and tracking application verification and decisions.
          </p>

          <div className="pt-2 flex flex-wrap gap-2 md:gap-3">
            <Button
              variant="accent"
              size="lg"
              to={ROUTES.scholarshipsFellowships}
              className="w-full sm:w-auto justify-center"
            >
              Explore Scholarships &amp; Fellowships
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
            <Button variant="ghost" size="lg" href={SECTION_IDS.ELIGIBILITY} className="w-full sm:w-auto justify-center">
              Check Eligibility
            </Button>
            <Button variant="ghost" size="lg" href={SECTION_IDS.TRACK} className="w-full sm:w-auto justify-center">
              Track Application
            </Button>
            <Button variant="emerald" size="lg" to={ROUTES.homeLogin} className="w-full sm:w-auto justify-center">
              Login
            </Button>
          </div>

          <p className="text-[11px] text-slate-300 italic pt-1">
            Prototype interface — sample content pending final government/state review.
          </p>
        </div>

        <HomeLoginCard />
      </div>
    </section>
  );
}
