import { Outlet } from 'react-router-dom';
import { SECTION_IDS } from '../../lib/constants';
import { AnnouncementTicker } from './AnnouncementTicker';
import { Footer } from './Footer';
import { MainNavigation } from './MainNavigation';
import { Masthead } from './Masthead';
import { TopAccessibilityBar } from './TopAccessibilityBar';

export function SiteLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopAccessibilityBar />
      <Masthead />
      <MainNavigation />
      <AnnouncementTicker />
      <main id={SECTION_IDS.MAIN_CONTENT.replace('#', '')} className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}