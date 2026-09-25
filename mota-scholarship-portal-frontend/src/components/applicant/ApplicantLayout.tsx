import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApplicantAuth } from '../../context/useApplicantAuth';
import {
  APPLICANT_APPLICATIONS,
  APPLICANT_DOCUMENTS,
  APPLICANT_NOTIFICATIONS,
} from '../../data/applicantData';
import { ROUTES, SECTION_IDS } from '../../lib/constants';
import { AnnouncementTicker } from '../layout/AnnouncementTicker';
import { Footer } from '../layout/Footer';
import { Masthead } from '../layout/Masthead';
import { TopAccessibilityBar } from '../layout/TopAccessibilityBar';
import { ApplicantHeader } from './ApplicantHeader';
import { ApplicantSidebar } from './ApplicantSidebar';

export function ApplicantLayout() {
  const { session, user, role, loading, signOut } = useApplicantAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const unreadNotificationCount = APPLICANT_NOTIFICATIONS.filter((notification) => notification.unread).length;
  const documentAttentionCount = APPLICANT_DOCUMENTS.filter((document) =>
    ['needs-correction', 'rejected'].includes(document.status),
  ).length;
  const categoryVerified = APPLICANT_DOCUMENTS.some(
    (document) => document.type === 'Category' && document.status === 'verified',
  );

  function handleLogout() {
    signOut();
    navigate(ROUTES.homeLogin, { replace: true });
  }

  return (
    <div className="min-h-screen bg-gov-slate-bg">
      <div ref={backgroundRef} className="flex min-h-screen flex-col">
        <TopAccessibilityBar />
        <Masthead />
        <ApplicantHeader
          profile={session.user}
          sidebarOpen={sidebarOpen}
          unreadCount={unreadNotificationCount}
          onLogout={handleLogout}
          onToggleSidebar={() => setSidebarOpen((current) => !current)}
        />
        <AnnouncementTicker />

        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-950">
          Demo applicant workspace. Records are sample data; uploads, submissions, AI checks, and grievance delivery are not connected to a backend.
        </div>

        <main className="min-w-0 flex-grow" id={SECTION_IDS.MAIN_CONTENT.replace('#', '')}>
          <div className="mx-auto grid min-w-0 max-w-[90rem] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-6">
            <aside className="hidden min-w-0 lg:block">
              <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded border border-slate-200 bg-white shadow-sm">
                <ApplicantSidebar
                  applicationCount={APPLICANT_APPLICATIONS.length}
                  categoryVerified={categoryVerified}
                  documentAttentionCount={documentAttentionCount}
                  idPrefix="desktop-applicant-sidebar"
                  profile={session.user}
                  unreadNotificationCount={unreadNotificationCount}
                  onLogout={handleLogout}
                />
              </div>
            </aside>

            <div className="min-w-0" key={location.pathname}>
              <Outlet />
            </div>
          </div>
        </main>

        <Footer />
  if (loading) {
    return null;
  }

  if (!session || !user || role !== 'applicant') {
    return <Navigate replace state={{ from: location }} to={ROUTES.applicant.login} />;
  }

  async function handleLogout() {
    const result = await signOut();

    if (result.success) {
      navigate(ROUTES.applicant.login, { replace: true });
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gov-slate-bg">
      <ApplicantHeader onLogout={handleLogout} profile={user} />
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
        Authentication uses Supabase. Application and document data remain sample content in this phase.
      </div>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close applicant navigation overlay"
            className="absolute inset-0 h-full w-full bg-slate-950/60"
            type="button"
            onClick={closeSidebar}
          />
          <aside
            aria-label="Applicant mobile navigation"
            aria-modal="true"
            className="relative h-full w-[min(20rem,90vw)] overflow-y-auto border-r border-slate-300 bg-white shadow-2xl"
            id="applicant-mobile-sidebar"
            ref={mobileSidebarRef}
            role="dialog"
            tabIndex={-1}
          >
            <ApplicantSidebar
              applicationCount={APPLICANT_APPLICATIONS.length}
              categoryVerified={categoryVerified}
              documentAttentionCount={documentAttentionCount}
              idPrefix="mobile-applicant-sidebar"
              profile={session.user}
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
