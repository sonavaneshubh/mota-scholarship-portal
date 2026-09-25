import { Link } from 'react-router-dom';
import type { ApplicantNotification, ApplicantNotificationTone } from '../../types';

interface NotificationItemProps {
  notification: ApplicantNotification;
}

const toneClasses: Record<ApplicantNotificationTone, string> = {
  info: 'bg-blue-100 text-gov-blue',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-800',
  action: 'bg-orange-100 text-orange-700',
};

function NotificationIcon({ tone }: { tone: ApplicantNotificationTone }) {
  return (
    <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${toneClasses[tone]}`}>
      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        {tone === 'success' ? <path d="m5 12 4 4L19 6" /> : <path d="M12 8v4m0 4h.01M10.3 4.7 3.1 17a2 2 0 0 0 1.7 3h14.4a2 2 0 0 0 1.7-3L13.7 4.7a2 2 0 0 0-3.4 0Z" />}
      </svg>
    </span>
  );
}

export function NotificationItem({ notification }: NotificationItemProps) {
  return (
    <Link className="flex gap-3 border-b border-slate-100 px-1 py-4 last:border-b-0 hover:bg-slate-50" to={notification.href}>
      <NotificationIcon tone={notification.tone} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{notification.title}</span>
          {notification.unread ? <span className="h-2 w-2 rounded-full bg-gov-saffron" aria-label="Unread" /> : null}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-slate-600">{notification.description}</span>
        <span className="mt-2 block text-[11px] text-slate-400">{notification.timestamp}</span>
      </span>
    </Link>
  );
}
