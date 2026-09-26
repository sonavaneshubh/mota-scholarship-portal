import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AdminIcon } from './AdminIcon';
import {
  ADMIN_NAVIGATION,
  isNavEntryActive,
  isNavGroup,
  isNavItemActive,
} from './adminNavigation';
import type { AdminNavGroup, AdminNavItem } from './adminNavigation';

interface AdminSidebarProps {
  unreadNotifications: number;
  isMobile: boolean;
  open: boolean;
  onNavigate: () => void;
  onClose: () => void;
}

const expandedLinkClass =
  'group relative flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors';
const activeLinkClass = 'bg-white text-gov-blue shadow-sm';
const idleLinkClass = 'text-blue-100/80 hover:bg-white/10 hover:text-white';
const subLinkBase =
  'group relative flex min-h-10 w-full items-center gap-2.5 rounded-md py-2 pl-4 pr-3 text-[13px] font-medium transition-colors';
const activeSubLinkClass = 'bg-white text-gov-blue shadow-sm';
const idleSubLinkClass = 'text-blue-100/75 hover:bg-white/10 hover:text-white';

function SidebarBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span className="ml-auto inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-gov-saffron px-1.5 py-0.5 text-[10px] font-bold text-white">
      {count > 9 ? '9+' : count}
    </span>
  );
}

interface SidebarNavLinkProps {
  item: AdminNavItem;
  active: boolean;
  isSubItem: boolean;
  badgeCount: number;
  activeItemRef: RefObject<HTMLAnchorElement>;
  onNavigate: () => void;
}

function SidebarNavLink({ item, active, isSubItem, badgeCount, activeItemRef, onNavigate }: SidebarNavLinkProps) {
  const hasBadge = item.badge === 'notifications' && badgeCount > 0;

  if (item.available === false) {
    return (
      <span aria-disabled="true" className={`${subLinkBase} cursor-not-allowed text-blue-100/40`} role="link">
        <AdminIcon className="h-5 w-5 shrink-0" name={item.icon} />
        <span className="truncate">{item.label}</span>
        <span className="ml-auto shrink-0 rounded border border-white/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-blue-200/70">
          Soon
        </span>
      </span>
    );
  }

  const linkClass = [
    isSubItem ? subLinkBase : expandedLinkClass,
    active ? (isSubItem ? activeSubLinkClass : activeLinkClass) : isSubItem ? idleSubLinkClass : idleLinkClass,
  ].join(' ');

  const iconClass = `h-5 w-5 shrink-0 ${active ? 'text-gov-saffron-dark' : isSubItem ? 'text-blue-200/80' : 'text-blue-200'}`;

  return (
    <Link
      aria-current={active ? 'page' : undefined}
      className={linkClass}
      ref={active ? activeItemRef : undefined}
      to={item.to}
      onClick={onNavigate}
    >
      {active ? <span aria-hidden="true" className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-gov-saffron" /> : null}
      <AdminIcon className={iconClass} name={item.icon} />
      <span className="truncate">{item.label}</span>
      {hasBadge ? <SidebarBadge count={badgeCount} /> : null}
    </Link>
  );
}

interface SidebarGroupProps {
  group: AdminNavGroup;
  open: boolean;
  pathname: string;
  search: string;
  unreadNotifications: number;
  activeItemRef: RefObject<HTMLAnchorElement>;
  onNavigate: () => void;
  onToggle: (id: string) => void;
}

function SidebarGroup({ group, open, pathname, search, unreadNotifications, activeItemRef, onNavigate, onToggle }: SidebarGroupProps) {
  const groupActive = group.items.some((item) => isNavItemActive(item, pathname, search));

  return (
    <div>
      <button
        aria-expanded={open}
        className={`group flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
          groupActive ? 'bg-white/10 text-white' : 'text-blue-100/80 hover:bg-white/10 hover:text-white'
        }`}
        type="button"
        onClick={() => onToggle(group.id)}
      >
        <AdminIcon className="h-5 w-5 shrink-0 text-blue-200" name={group.icon} />
        <span className="truncate">{group.label}</span>
        <AdminIcon
          className={`ml-auto h-4 w-4 shrink-0 text-blue-200 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          name="chevron-down"
        />
      </button>

      <div
        className={`relative mt-1 space-y-1 overflow-hidden pl-4 transition-[max-height,opacity] duration-200 ease-out ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <span aria-hidden="true" className="absolute bottom-2 left-[0.6875rem] top-2 w-px bg-white/12" />
        {group.items.map((item) => (
          <SidebarNavLink
            active={isNavItemActive(item, pathname, search)}
            activeItemRef={activeItemRef}
            badgeCount={unreadNotifications}
            isSubItem
            item={item}
            key={item.id}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

export function AdminSidebar({
  unreadNotifications,
  isMobile,
  open,
  onNavigate,
  onClose,
}: AdminSidebarProps) {
  const location = useLocation();
  const pathname = location.pathname;
  const search = location.search;
  const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>({});
  const activeItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [pathname, search, open]);

  function isGroupOpen(group: AdminNavGroup) {
    if (isNavEntryActive(group, pathname, search)) {
      return true;
    }
    return groupOverrides[group.id] ?? true;
  }

  function toggleGroup(id: string) {
    setGroupOverrides((current) => ({ ...current, [id]: !(current[id] ?? true) }));
  }

  return (
    <aside
      aria-hidden={!open}
      aria-label="Admin navigation"
      className={[
        'fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-gov-blue-dark text-white shadow-2xl',
        'transition-[transform,visibility] duration-300 ease-in-out motion-reduce:transition-none',
        open ? 'visible translate-x-0' : 'invisible -translate-x-full',
      ].join(' ')}
    >
      <div className="flex h-20 shrink-0 items-center gap-2 border-b border-white/10 px-5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold tracking-wide text-white">MOTA Scholarship</p>
          <p className="mt-1 truncate text-[11px] uppercase tracking-[0.18em] text-blue-200">Administration</p>
        </div>
        <button
          aria-label={isMobile ? 'Close admin navigation' : 'Collapse sidebar'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-blue-100 transition-colors hover:bg-white/10 hover:text-white"
          title={isMobile ? 'Close admin navigation' : 'Collapse sidebar'}
          type="button"
          onClick={onClose}
        >
          <AdminIcon className="h-5 w-5" name={isMobile ? 'close' : 'chevron-left'} />
        </button>
      </div>

      <nav aria-label="Admin sections" className="scrollbar-none flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {ADMIN_NAVIGATION.map((entry) =>
          isNavGroup(entry) ? (
            <SidebarGroup
              activeItemRef={activeItemRef}
              group={entry}
              key={entry.id}
              open={isGroupOpen(entry)}
              pathname={pathname}
              search={search}
              unreadNotifications={unreadNotifications}
              onNavigate={onNavigate}
              onToggle={toggleGroup}
            />
          ) : (
            <SidebarNavLink
              active={isNavItemActive(entry, pathname, search)}
              activeItemRef={activeItemRef}
              badgeCount={unreadNotifications}
              isSubItem={false}
              item={entry}
              key={entry.id}
              onNavigate={onNavigate}
            />
          ),
        )}
      </nav>

      <div className="shrink-0 border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-[10px] text-blue-200/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>Demo environment</span>
        </div>
      </div>
    </aside>
  );
}
