import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ADMIN_NOTIFICATIONS } from '../../data/adminMockData';
import { useAdminAuth } from '../../context/useAdminAuth';
import { ROUTES } from '../../lib/constants';
import { AdminHeader } from './AdminHeader';
import { AdminSidebar } from './AdminSidebar';

export function AdminLayout() {
  const { session, signOut } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setSidebarOpen(true);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!session) {
    return <Navigate replace state={{ from: location }} to={ROUTES.admin.login} />;
  }

  function handleLogout() {
    signOut();
    navigate(ROUTES.admin.login, { replace: true });
  }

  function toggleSidebar() {
    setSidebarOpen((prev) => !prev);
  }

  const unreadNotifications = ADMIN_NOTIFICATIONS.filter((notification) => !notification.read).length;

  return (
    <div className="min-h-screen bg-gov-slate-bg text-slate-800">
      <div className="flex min-h-screen">
        <AdminSidebar
          onClose={toggleSidebar}
          open={sidebarOpen}
          isMobile={isMobile}
        />
        {sidebarOpen && isMobile ? <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-slate-950/50" type="button" onClick={toggleSidebar} /> : null}
        <div className="min-w-0 flex-1 transition-all duration-300">
          <AdminHeader onLogout={handleLogout} onMenuClick={toggleSidebar} unreadNotifications={unreadNotifications} user={session.user} sidebarOpen={sidebarOpen} isMobile={isMobile} />
          <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            <div className="mx-auto max-w-[1600px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
