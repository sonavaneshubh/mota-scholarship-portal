import type { ReactNode, SVGProps } from 'react';

export type AdminIconName =
  | 'dashboard'
  | 'applications'
  | 'documents'
  | 'scholarships'
  | 'reports'
  | 'users'
  | 'settings'
  | 'notifications'
  | 'menu'
  | 'close'
  | 'search'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'arrow-right'
  | 'logout'
  | 'download'
  | 'eye'
  | 'check'
  | 'warning'
  | 'filter'
  | 'calendar'
  | 'bank'
  | 'user'
  | 'plus'
  | 'edit'
  | 'more'
  | 'lock'
  | 'refresh'
  | 'info'
  | 'file'
  | 'clock'
  | 'heartbeat'
  | 'trend-up'
  | 'external';

const iconPaths: Record<AdminIconName, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  applications: <><path d="M8 4h8" /><path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1Z" /><path d="M6 5H4v16h16V5h-2" /><path d="M8 10h8M8 14h6" /><path d="m8 18 1.5 1.5L13 16" /></>,
  documents: <><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4M9 12h6M9 16h4" /><path d="m16 18 1.5 1.5L20 17" /></>,
  scholarships: <><circle cx="12" cy="8" r="4" /><path d="m9 11-2 10 5-3 5 3-2-10" /><path d="M8 8h8" /></>,
  reports: <><path d="M4 19V5M4 19h17" /><path d="M8 16v-4M12 16V8M16 16v-6M20 16v-9" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  settings: <><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2.4v-.2a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.6 15a1.7 1.7 0 0 0-1.56-1.03H6.8v-2.4h.24A1.7 1.7 0 0 0 8.6 10a1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.7-1.7.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56V5h2.4v.2a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 19.4 10a1.7 1.7 0 0 0 1.56 1.03h.24v2.4h-.24A1.7 1.7 0 0 0 19.4 15Z" /></>,
  notifications: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-left': <path d="m15 18-6-6 6-6" />,
  'chevron-right': <path d="m9 18 6-6-6-6" />,
  'arrow-right': <><path d="M4 12h16" /><path d="m14 6 6 6-6 6" /></>,
  logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M21 19V5a2 2 0 0 0-2-2h-6" /></>,
  download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5M4 21h16" /></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  warning: <><path d="m12 3 10 18H2L12 3Z" /><path d="M12 9v4M12 17h.01" /></>,
  filter: <><path d="M4 5h16M7 12h10M10 19h4" /></>,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  bank: <><path d="m3 10 9-6 9 6" /><path d="M5 10h14M6 10v8M10 10v8M14 10v8M18 10v8M3 20h18" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  edit: <><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17l-1 3Z" /><path d="m14.5 7.5 3 3" /></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
  lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-14.7-3L3 11" /><path d="M3 5v6h6" /><path d="M4 13a8 8 0 0 0 14.7 3L21 13" /><path d="M21 19v-6h-6" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  file: <><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4M9 12h6M9 16h4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  'trend-up': <><path d="m4 16 5-5 3 3 7-8" /><path d="M14 6h5v5" /></>,
  heartbeat: <><path d="M4 12h2l3-8 3 11 3-11 3 8h2" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></>,
};

export function AdminIcon({ name, className = 'h-5 w-5', ...props }: { name: AdminIconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...props}
    >
      {iconPaths[name]}
    </svg>
  );
}
