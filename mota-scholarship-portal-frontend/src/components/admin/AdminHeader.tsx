import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';
import type { AdminUser } from '../../types/admin';
import { AdminIcon } from './AdminIcon';
import { getAdminPageTitle } from './adminNavigation';

interface AdminHeaderProps {
  user: AdminUser;
  unreadNotifications: number;
  onMenuClick: () => void;
  onLogout: () => void;
  sidebarOpen: boolean;
  isMobile: boolean;
}

export function AdminHeader({ user, unreadNotifications, onMenuClick, onLogout, sidebarOpen, isMobile }: AdminHeaderProps) {
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const title = getAdminPageTitle(location.pathname, location.search);
  // The Demo Admin has no notification feed and no write actions, so the bell
  // would be a dead control that implies a queue behind it.
  const isReadOnlyDemo = user.role === 'Demo Admin';

  function handleLogout() {
    setProfileOpen(false);
    onLogout();
  }

  const showMenuButton = isMobile || !sidebarOpen;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur transition-all duration-300">
      <div className="flex min-h-20 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          {showMenuButton && (
            <button aria-label="Toggle admin navigation" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100" type="button" onClick={onMenuClick}>
              <AdminIcon className="h-5 w-5" name="menu" />
            </button>
          )}
          <div className="min-w-0">
            <p className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-gov-saffron-dark sm:block">Administration workspace</p>
            <h1 className="truncate text-base font-bold text-gov-blue-dark sm:mt-1 sm:text-lg">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {isReadOnlyDemo ? (
            <span className="hidden items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-800 sm:inline-flex">
              <AdminIcon className="h-3.5 w-3.5" name="lock" /> Read-only demo
            </span>
          ) : (
            <NavLink aria-label="View admin notifications" className="relative flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-gov-blue" to={ROUTES.admin.notifications}>
              <AdminIcon className="h-5 w-5" name="notifications" />
              {unreadNotifications > 0 ? <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gov-saffron px-1 text-[9px] font-bold text-white">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span> : null}
            </NavLink>
          )}

          <div className="relative">
            <button
              aria-expanded={profileOpen}
              className="flex min-h-10 items-center gap-2 rounded-md px-1.5 text-left hover:bg-slate-100 sm:px-2"
              type="button"
              onClick={() => setProfileOpen((current) => !current)}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-gov-blue">{user.initials}</span>
              <span className="hidden max-w-36 sm:block">
                <span className="block truncate text-xs font-bold text-slate-800">{user.name}</span>
                <span className="block truncate text-[11px] text-slate-500">{user.role}</span>
              </span>
              <AdminIcon className="hidden h-4 w-4 text-slate-500 sm:block" name="chevron-down" />
            </button>
            {profileOpen ? (
              <div className="absolute right-0 top-12 z-40 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="text-sm font-bold text-slate-900">{user.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{user.email}</p>
                  <p className="mt-2 text-[11px] font-semibold text-gov-blue">{user.adminId} · {user.role}</p>
                </div>
                <NavLink className="mt-1 flex min-h-10 items-center gap-2 rounded px-3 text-sm text-slate-700 hover:bg-slate-100" to={ROUTES.admin.settings} onClick={() => setProfileOpen(false)}>
                  <AdminIcon className="h-4 w-4" name="settings" />
                  Account settings
                </NavLink>
                <button className="flex min-h-10 w-full items-center gap-2 rounded px-3 text-left text-sm text-red-700 hover:bg-red-50" type="button" onClick={handleLogout}>
                  <AdminIcon className="h-4 w-4" name="logout" />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
