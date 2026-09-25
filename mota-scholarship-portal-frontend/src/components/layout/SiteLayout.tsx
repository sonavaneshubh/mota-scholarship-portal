import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SECTION_IDS } from '../../lib/constants';
import { AnnouncementTicker } from './AnnouncementTicker';
import { Footer } from './Footer';
import { MainNavigation } from './MainNavigation';
import { Masthead } from './Masthead';
import { TopAccessibilityBar } from './TopAccessibilityBar';

export function SiteLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return (
    <div className="flex flex-col min-h-screen">
      <TopAccessibilityBar />
      <Masthead />
      <MainNavigation />
      <AnnouncementTicker />
      <main id={SECTION_IDS.MAIN_CONTENT.replace('#', '')} className="flex-grow">
        <div key={pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  );
}
