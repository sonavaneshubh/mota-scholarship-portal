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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (!session) {
    return <Navigate replace state={{ from: location }} to={ROUTES.admin.login} />;
  }

  function handleLogout() {
    signOut();
    navigate(ROUTES.admin.login, { replace: true });
  }

  const unreadNotifications = ADMIN_NOTIFICATIONS.filter((notification) => !notification.read).length;

  return (
    <div className="min-h-screen bg-gov-slate-bg text-slate-800">
      <div className="flex min-h-screen">
        <AdminSidebar onClose={() => setSidebarOpen(false)} open={sidebarOpen} />
        {sidebarOpen ? <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" type="button" onClick={() => setSidebarOpen(false)} /> : null}
        <div className="min-w-0 flex-1">
          <AdminHeader onLogout={handleLogout} onMenuClick={() => setSidebarOpen(true)} unreadNotifications={unreadNotifications} user={session.user} />
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
