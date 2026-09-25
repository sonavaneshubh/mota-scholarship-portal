import { SECTION_IDS } from '../lib/constants';
import { AboutMinistry } from '../components/home/AboutMinistry';
import { HeroBanner } from '../components/home/HeroBanner';
import { NewsCirculars } from '../components/home/NewsCirculars';

export function Home() {
  return (
    <>
      <HeroBanner />

      <section
        className="max-w-7xl mx-auto px-4 py-10"
        data-purpose="about-ministry-briefing"
        id={SECTION_IDS.ABOUT.replace('#', '')}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <AboutMinistry />
          <NewsCirculars />
        </div>
      </section>
    </>
  );
}
