import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ELIGIBILITY_COPY } from '../data/mockData';
import { SECTION_IDS } from '../lib/constants';
import { AboutMinistry } from '../components/home/AboutMinistry';
import { GovernanceWorkflow } from '../components/home/GovernanceWorkflow';
import { GovernmentInitiatives } from '../components/home/GovernmentInitiatives';
import { HeroBanner } from '../components/home/HeroBanner';
import { HowToApply } from '../components/home/HowToApply';
import { NewsCirculars } from '../components/home/NewsCirculars';
import { QuickAccessTiles } from '../components/home/QuickAccessTiles';
import { SchemeDirectory } from '../components/home/SchemeDirectory';
import { Button } from '../components/ui/Button';

export function Home() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash === SECTION_IDS.LOGIN) {
      document.getElementById('home-login')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash, location.key]);

  return (
    <>
      <HeroBanner />
      <QuickAccessTiles />

      <section
        className="max-w-7xl mx-auto px-4 py-8 md:py-10"
        data-purpose="about-ministry-briefing"
        id={SECTION_IDS.ABOUT.replace('#', '')}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <AboutMinistry />
          <NewsCirculars />
        </div>
      </section>

      <SchemeDirectory />

      <section
        className="bg-white border-y border-slate-200 py-8"
        data-purpose="eligibility-precheck-intro"
        id={SECTION_IDS.ELIGIBILITY.replace('#', '')}
      >
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 items-center">
          <div className="lg:col-span-8">
            <span className="text-[11px] sm:text-xs font-bold text-gov-blue uppercase tracking-wider bg-blue-50 border border-blue-200 px-2.5 py-1 rounded">
              {ELIGIBILITY_COPY.eyebrow}
            </span>
            <h2 className="text-lg md:text-2xl font-bold text-gov-blue-dark mt-2">
              {ELIGIBILITY_COPY.title}
            </h2>
            <p className="text-xs md:text-sm text-slate-600 mt-1 max-w-2xl">
              {ELIGIBILITY_COPY.description}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {ELIGIBILITY_COPY.featurePoints.map((point) => (
                <li
                  key={point}
                  className="text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-1"
                >
                  {point}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-slate-500 italic flex items-start gap-1.5">
              <svg className="w-3.5 h-3.5 text-gov-saffron mt-px flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  clipRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  fillRule="evenodd"
                />
              </svg>
              {ELIGIBILITY_COPY.disclaimer}
            </p>
          </div>
          <div className="lg:col-span-4 text-left lg:text-right">
            <Button variant="accent" size="lg" href={SECTION_IDS.ELIGIBILITY}>
              {ELIGIBILITY_COPY.actionLabel}
            </Button>
            <p className="mt-2 text-[11px] text-slate-500 italic">{ELIGIBILITY_COPY.actionHint}</p>
          </div>
        </div>
      </section>

      <GovernanceWorkflow />

      <section
        className="bg-white py-8 md:py-10 border-t border-slate-200"
        data-purpose="how-to-apply-guide"
        id={SECTION_IDS.HOW_TO_APPLY.replace('#', '')}
      >
        <div className="max-w-7xl mx-auto px-4">
          <HowToApply />
        </div>
      </section>

      <GovernmentInitiatives />
    </>
  );
}