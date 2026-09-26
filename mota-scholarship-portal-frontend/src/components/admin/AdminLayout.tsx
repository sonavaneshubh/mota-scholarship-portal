import { useCallback, useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ADMIN_NOTIFICATIONS } from '../../data/adminMockData';
import { useAdminAuth } from '../../context/useAdminAuth';
import { ROUTES } from '../../lib/constants';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';

type AdminViewport = 'mobile' | 'tablet' | 'desktop';

const SIDEBAR_COLLAPSED_KEY = 'mota-admin-sidebar-collapsed';
const SIDEBAR_WIDTH = '18rem';

function resolveViewport(width: number): AdminViewport {
  if (width < 768) {
    return 'mobile';
  }
  if (width < 1024) {
    return 'tablet';
  }
  return 'desktop';
}

function readStoredCollapsed(): boolean | null {
  try {
    const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === '1') return true;
    if (stored === '0') return false;
  } catch {
    return null;
  }
  return null;
}

export function AdminLayout() {
  const { session, signOut } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [viewport, setViewport] = useState<AdminViewport>(() => resolveViewport(window.innerWidth));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [storedCollapsed, setStoredCollapsed] = useState<boolean | null>(readStoredCollapsed);

  const isMobile = viewport === 'mobile';
  const collapsed = !isMobile && (storedCollapsed ?? viewport === 'tablet');

  useEffect(() => {
    const handleResize = () => {
      setViewport(resolveViewport(window.innerWidth));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDrawerOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen]);

  const toggleCollapsed = useCallback(() => {
    setStoredCollapsed((current) => {
      const next = !(current ?? viewport === 'tablet');
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        return next;
      }
      return next;
    });
  }, [viewport]);

  if (!session) {
    return <Navigate replace state={{ from: location }} to={ROUTES.admin.login} />;
  }

  function handleLogout() {
    signOut();
    navigate(ROUTES.admin.login, { replace: true });
  }

  function handleMenuClick() {
    if (isMobile) {
      setDrawerOpen((current) => !current);
      return;
    }
    if (collapsed) {
      setStoredCollapsed(false);
      return;
    }
    toggleCollapsed();
  }

  const unreadNotifications = ADMIN_NOTIFICATIONS.filter((notification) => !notification.read).length;

  return (
    <div className="min-h-screen bg-gov-slate-bg text-slate-800">
      <div className="flex min-h-screen">
        <AdminSidebar
          isMobile={isMobile}
          open={isMobile ? drawerOpen : !collapsed}
          unreadNotifications={unreadNotifications}
          onClose={() => {
            if (isMobile) {
              setDrawerOpen(false);
              return;
            }
            toggleCollapsed();
          }}
          onNavigate={() => setDrawerOpen(false)}
        />

        {isMobile && drawerOpen ? (
          <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-slate-950/50" type="button" onClick={() => setDrawerOpen(false)} />
        ) : null}

        <div
          className="flex min-w-0 flex-1 flex-col transition-[margin] duration-300 ease-in-out motion-reduce:transition-none"
          style={{ marginLeft: isMobile || collapsed ? 0 : SIDEBAR_WIDTH }}
        >
          <AdminHeader
            isMobile={isMobile}
            sidebarOpen={isMobile ? drawerOpen : !collapsed}
            unreadNotifications={unreadNotifications}
            user={session.user}
            onLogout={handleLogout}
            onMenuClick={handleMenuClick}
          />
          <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto max-w-[1600px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
