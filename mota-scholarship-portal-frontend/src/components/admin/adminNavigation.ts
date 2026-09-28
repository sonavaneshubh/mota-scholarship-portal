import { ROUTES } from '../../lib/constants';
import type { AdminIconName } from './AdminIcon';

export interface AdminNavItem {
  id: string;
  label: string;
  to: string;
  icon: AdminIconName;
  pageTitle?: string;
  end?: boolean;
  badge?: 'notifications';
  available?: false;
  /**
   * Whether this page is inside the Demo Admin's scope. Only flagged pages are
   * shown to a Demo Admin session, and they are the ones that read real Supabase
   * data through the read-only views. Anything unflagged is either
   * prototype-only (it would show invented data) or offers a write action the
   * Demo Admin must never reach.
   */
  demoReadOnly?: boolean;
}

export interface AdminNavGroup {
  id: string;
  label: string;
  icon: AdminIconName;
  items: AdminNavItem[];
}

export type AdminNavEntry = AdminNavItem | AdminNavGroup;

const applicationsPath = ROUTES.admin.applications;

export const ADMIN_NAVIGATION: AdminNavEntry[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    pageTitle: 'Dashboard overview',
    to: ROUTES.admin.dashboard,
    icon: 'dashboard',
    end: true,
    demoReadOnly: true,
  },
  {
    id: 'scholarship-management',
    label: 'Scholarship Management',
    pageTitle: 'Scholarship schemes',
    to: ROUTES.admin.scholarships,
    icon: 'scholarships',
  },
  {
    id: 'application-management',
    label: 'Application Management',
    icon: 'applications',
    items: [
      {
        id: 'all-applications',
        label: 'All Applications',
        pageTitle: 'Applications',
        to: applicationsPath,
        icon: 'applications',
        demoReadOnly: true,
      },
      {
        id: 'pending-applications',
        label: 'Pending Applications',
        pageTitle: 'Pending applications',
        to: `${applicationsPath}?status=Pending`,
        icon: 'clock',
      },
      {
        id: 'approved-applications',
        label: 'Approved Applications',
        pageTitle: 'Approved applications',
        to: `${applicationsPath}?status=Approved`,
        icon: 'check',
      },
      {
        id: 'rejected-applications',
        label: 'Rejected Applications',
        pageTitle: 'Rejected applications',
        to: `${applicationsPath}?status=Rejected`,
        icon: 'warning',
      },
    ],
  },
  {
    id: 'document-management',
    label: 'Document Management',
    pageTitle: 'Document verification',
    to: ROUTES.admin.documentVerification,
    icon: 'documents',
    demoReadOnly: true,
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    pageTitle: 'Reports & analytics',
    to: ROUTES.admin.reports,
    icon: 'reports',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    pageTitle: 'Notifications',
    to: ROUTES.admin.notifications,
    icon: 'notifications',
    badge: 'notifications',
  },
  {
    id: 'settings',
    label: 'Settings',
    pageTitle: 'Portal settings',
    to: ROUTES.admin.settings,
    icon: 'settings',
  },
];

export function isNavGroup(entry: AdminNavEntry): entry is AdminNavGroup {
  return 'items' in entry;
}

/**
 * Navigation for the current kind of admin session. The prototype admin keeps
 * the whole menu; a Demo Admin session sees only the pages that read real data
 * read-only, and a group with no such page is dropped rather than left as an
 * empty collapsible header.
 */
export function getAdminNavigation(isDemoAdmin: boolean): AdminNavEntry[] {
  if (!isDemoAdmin) {
    return ADMIN_NAVIGATION;
  }

  return ADMIN_NAVIGATION.flatMap<AdminNavEntry>((entry) => {
    if (isNavGroup(entry)) {
      const items = entry.items.filter((item) => item.demoReadOnly);
      return items.length > 0 ? [{ ...entry, items }] : [];
    }
    return entry.demoReadOnly ? [entry] : [];
  });
}

function splitTarget(to: string) {
  const separator = to.indexOf('?');
  if (separator === -1) {
    return { path: to, search: '' };
  }
  return { path: to.slice(0, separator), search: to.slice(separator + 1) };
}

function normalizeSearch(search: string) {
  const params = new URLSearchParams(search);
  params.sort();
  return params.toString();
}

export function isNavItemActive(item: AdminNavItem, pathname: string, currentSearch: string) {
  if (item.available === false) {
    return false;
  }

  const { path, search } = splitTarget(item.to);

  if (pathname === path) {
    return normalizeSearch(currentSearch) === normalizeSearch(search);
  }

  if (item.end || search !== '') {
    return false;
  }

  return pathname.startsWith(`${path}/`);
}

export function isNavEntryActive(entry: AdminNavEntry, pathname: string, currentSearch: string) {
  if (isNavGroup(entry)) {
    return entry.items.some((item) => isNavItemActive(item, pathname, currentSearch));
  }
  return isNavItemActive(entry, pathname, currentSearch);
}

const applicationDetailPattern = new RegExp(`^${ROUTES.admin.applicationDetail.replace(':id', '[^/]+')}$`);

export function getAdminPageTitle(pathname: string, search: string) {
  if (applicationDetailPattern.test(pathname)) {
    return 'Application details';
  }

  let best: AdminNavItem | null = null;
  let bestRank = 0;

  for (const entry of ADMIN_NAVIGATION) {
    const items = isNavGroup(entry) ? entry.items : [entry];
    for (const item of items) {
      if (!isNavItemActive(item, pathname, search)) {
        continue;
      }
      const rank = splitTarget(item.to).path === pathname ? 2 : 1;
      if (rank > bestRank) {
        best = item;
        bestRank = rank;
      }
    }
  }

  return best ? best.pageTitle ?? best.label : 'Admin workspace';
}
