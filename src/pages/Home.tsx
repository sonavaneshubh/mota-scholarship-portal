import { SECTION_IDS } from '../lib/constants';
import { AboutMinistry } from '../components/home/AboutMinistry';
import { GovernanceWorkflow } from '../components/home/GovernanceWorkflow';
import { GovernmentInitiatives } from '../components/home/GovernmentInitiatives';
import { HeroBanner } from '../components/home/HeroBanner';
import { HowToApply } from '../components/home/HowToApply';
import { NewsCirculars } from '../components/home/NewsCirculars';
import { OfficerQuickLogin } from '../components/home/OfficerQuickLogin';
import { QuickAccessTiles } from '../components/home/QuickAccessTiles';
import { SchemeDirectory } from '../components/home/SchemeDirectory';

export function Home() {
  return (
    <>
      <HeroBanner />
      <QuickAccessTiles />

      <section
        className="max-w-7xl mx-auto px-4 py-10"
        data-purpose="about-ministry-briefing"
        id={SECTION_IDS.ABOUT.replace('#', '')}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <AboutMinistry />
          <NewsCirculars />
        </div>
      </section>

      <SchemeDirectory />
      <GovernanceWorkflow />

      <section
        className="bg-white py-10 border-t border-slate-200"
        data-purpose="how-to-apply-guide"
        id={SECTION_IDS.UNIVERSITIES.replace('#', '')}
      >
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8">
          <HowToApply />
          <OfficerQuickLogin />
        </div>
      </section>

      <GovernmentInitiatives />
    </>
  );
}