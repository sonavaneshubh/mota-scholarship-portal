import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApplicantAuth } from '../../context/useApplicantAuth';
import {
  APPLICANT_APPLICATIONS,
  APPLICANT_DOCUMENTS,
  APPLICANT_NOTIFICATIONS,
} from '../../data/applicantData';
import { ROUTES, SECTION_IDS } from '../../lib/constants';
import { Footer } from '../layout/Footer';
import { Masthead } from '../layout/Masthead';
import { CompactNavbar } from './CompactNavbar';
import { ApplicantSidebar } from './ApplicantSidebar';

export function ApplicantLayout() {
  const { session, user, role, loading, signOut } = useApplicantAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const mobileSidebarRef = useRef<HTMLElement>(null);

  function closeSidebar() {
    setSidebarOpen(false);
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>('[aria-label="Open applicant navigation"]')?.focus();
    });
  }

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (location.hash) {
        const target = document.getElementById(location.hash.slice(1));
        if (target) {
          target.scrollIntoView({ block: 'start' });
          return;
        }
      }

      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    const background = backgroundRef.current;
    if (!sidebarOpen) {
      background?.removeAttribute('inert');
      background?.removeAttribute('aria-hidden');
      return;
    }

    background?.setAttribute('inert', '');
    background?.setAttribute('aria-hidden', 'true');
    const previousOverflow = document.body.style.overflow;
    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSidebar();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const sidebar = mobileSidebarRef.current;
      const focusableElements = Array.from(sidebar?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
      if (focusableElements.length === 0) {
        event.preventDefault();
        sidebar?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (!sidebar?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    const focusFrame = window.requestAnimationFrame(() => {
      const firstElement = mobileSidebarRef.current?.querySelector<HTMLElement>(focusableSelector);
      (firstElement ?? mobileSidebarRef.current)?.focus();
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      background?.removeAttribute('inert');
      background?.removeAttribute('aria-hidden');
    };
  }, [sidebarOpen]);

  if (!session) {
    return (
      <Navigate
        replace
        state={{
          homeAuthMode: 'applicant',
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
        }}
        to={ROUTES.homeLogin}
      />
    );
  }

  if (loading) {
    return null;
  }

  if (!session || !user || role !== 'applicant') {
    return <Navigate replace state={{ from: location }} to={ROUTES.applicant.login} />;
  }

  const unreadNotificationCount = APPLICANT_NOTIFICATIONS.filter((notification) => notification.unread).length;
  const documentAttentionCount = APPLICANT_DOCUMENTS.filter((document) =>
    ['needs-correction', 'rejected'].includes(document.status),
  ).length;

  async function handleLogout() {
    await signOut();
    navigate(ROUTES.applicant.login, { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Masthead />
      <CompactNavbar
        profile={user}
        sidebarOpen={sidebarOpen}
        unreadCount={unreadNotificationCount}
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarOpen((current) => !current)}
      />

      <div className="flex flex-1 overflow-hidden">
        <aside
          className="hidden lg:block w-64 flex-shrink-0 bg-white border-r border-slate-200 transition-all duration-300"
          style={{ width: sidebarCollapsed ? '4rem' : '16rem' }}
        >
          <ApplicantSidebar
            applicationCount={APPLICANT_APPLICATIONS.length}
            documentAttentionCount={documentAttentionCount}
            unreadNotificationCount={unreadNotificationCount}
            onLogout={handleLogout}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          />
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto" id={SECTION_IDS.MAIN_CONTENT.replace('#', '')}>
          <div className="p-2">
            <Outlet />
          </div>
        </main>
      </div>

      <Footer />
      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden animate-fade-in">
          <button
            aria-label="Close applicant navigation overlay"
            className="absolute inset-0 h-full w-full bg-slate-950/60"
            type="button"
            onClick={closeSidebar}
          />
          <aside
            aria-label="Applicant mobile navigation"
            aria-modal="true"
            className="relative h-full w-[min(20rem,90vw)] overflow-y-auto border-r border-slate-300 bg-white shadow-2xl animate-slide-in"
            id="applicant-mobile-sidebar"
            ref={mobileSidebarRef}
            role="dialog"
            tabIndex={-1}
          >
            <ApplicantSidebar
              applicationCount={APPLICANT_APPLICATIONS.length}
              documentAttentionCount={documentAttentionCount}
              unreadNotificationCount={unreadNotificationCount}
              onClose={closeSidebar}
              onLogout={handleLogout}
              onNavigate={closeSidebar}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}