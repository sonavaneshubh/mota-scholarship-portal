import { NavLink } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';
import { AdminIcon } from './AdminIcon';
import type { AdminIconName } from './AdminIcon';

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
}

interface SidebarItem {
  label: string;
  to: string;
  icon: AdminIconName;
  end?: boolean;
}

const primaryItems: SidebarItem[] = [
  { label: 'Dashboard', to: ROUTES.admin.dashboard, icon: 'dashboard', end: true },
  { label: 'Applications', to: ROUTES.admin.applications, icon: 'applications' },
  { label: 'Document verification', to: ROUTES.admin.documentVerification, icon: 'documents' },
  { label: 'Scholarship schemes', to: ROUTES.admin.scholarships, icon: 'scholarships' },
];

const managementItems: SidebarItem[] = [
  { label: 'Reports & analytics', to: ROUTES.admin.reports, icon: 'reports' },
  { label: 'Admin users', to: ROUTES.admin.users, icon: 'users' },
  { label: 'Notifications', to: ROUTES.admin.notifications, icon: 'notifications' },
  { label: 'Settings', to: ROUTES.admin.settings, icon: 'settings' },
  { label: 'Audit logs', to: ROUTES.admin.auditLogs, icon: 'clock' },
  { label: 'Data export', to: ROUTES.admin.dataExport, icon: 'download' },
  { label: 'System health', to: ROUTES.admin.systemHealth, icon: 'heartbeat' },
];

function navClass({ isActive }: { isActive: boolean }) {
  return `group flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition ${
    isActive
      ? 'bg-white text-gov-blue shadow-sm'
      : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
  }`;
}

function SidebarLink({ item, onClose }: { item: SidebarItem; onClose: () => void }) {
  return (
    <NavLink className={navClass} end={item.end} onClick={onClose} to={item.to}>
      {({ isActive }) => (
        <>
          <AdminIcon className={`h-5 w-5 shrink-0 ${isActive ? 'text-gov-saffron-dark' : 'text-blue-200'}`} name={item.icon} />
          <span>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

export function AdminSidebar({ open, onClose, isMobile }: AdminSidebarProps) {
  if (!isMobile && !open) return null;

  return (
    <aside className={`flex flex-col bg-gov-blue-dark text-white lg:flex-none w-72 transition-transform duration-300 ease-in-out ${isMobile ? 'fixed inset-y-0 left-0 z-40' : ''} ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-20 items-center justify-between border-b border-white/10 px-5">
        <div className="flex-1">
          <p className="text-sm font-bold tracking-wide text-white">MOTA Scholarship</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-blue-200">Administration</p>
        </div>
        <button aria-label="Close navigation" className="flex h-9 w-9 items-center justify-center rounded text-blue-100 hover:bg-white/10" type="button" onClick={onClose}>
          <AdminIcon className="h-5 w-5" name="close" />
        </button>
      </div>

      <nav aria-label="Admin navigation" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        <div>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200/70">Workspace</p>
          <div className="space-y-1">{primaryItems.map((item) => <SidebarLink item={item} key={item.to} onClose={onClose} />)}</div>
        </div>
        <div>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200/70">Management</p>
          <div className="space-y-1">{managementItems.map((item) => <SidebarLink item={item} key={item.to} onClose={onClose} />)}</div>
        </div>
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-center gap-2 text-xs text-blue-100/80">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>Demo environment</span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-blue-200/60">For prototype evaluation only. Production access will use secure backend authentication.</p>
      </div>
    </aside>
  );
}
