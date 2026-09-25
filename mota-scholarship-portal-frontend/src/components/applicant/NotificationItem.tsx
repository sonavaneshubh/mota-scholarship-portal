import { Link } from 'react-router-dom';
import type { ApplicantNotification, ApplicantNotificationTone } from '../../types';

interface NotificationItemProps {
  notification: ApplicantNotification;
  compact?: boolean;
}

const iconToneClasses: Record<ApplicantNotificationTone, string> = {
  info: 'bg-blue-100 text-gov-blue',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-800',
  action: 'bg-amber-100 text-amber-800',
};

const dotToneClasses: Record<ApplicantNotificationTone, string> = {
  info: 'bg-blue-600',
  success: 'bg-emerald-600',
  warning: 'bg-amber-600',
  action: 'bg-amber-500',
};

function NotificationIcon({ tone }: { tone: ApplicantNotificationTone }) {
  return (
    <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${iconToneClasses[tone]}`}>
      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        {tone === 'success' ? <path d="m5 12 4 4L19 6" /> : <path d="M12 8v4m0 4h.01M10.3 4.7 3.1 17a2 2 0 0 0 1.7 3h14.4a2 2 0 0 0 1.7-3L13.7 4.7a2 2 0 0 0-3.4 0Z" />}
      </svg>
    </span>
  );
}

export function NotificationItem({ notification, compact = false }: NotificationItemProps) {
  if (compact) {
    return (
      <Link className="flex items-start gap-2.5 border-b border-slate-100 px-1 py-3 last:border-b-0 hover:bg-slate-50" to={notification.href}>
        <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotToneClasses[notification.tone]}`} />
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-slate-800">
            {notification.title}
            {notification.unread ? <span className="sr-only"> (unread)</span> : null}
          </span>
          <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">{notification.description}</span>
          <span className="mt-1 block text-[10px] text-slate-400">{notification.timestamp}</span>
        </span>
      </Link>
    );
  }

  return (
    <Link className={`flex gap-3 border-b border-slate-100 px-1 py-4 last:border-b-0 hover:bg-slate-50 ${notification.unread ? 'bg-blue-50/50' : ''}`} to={notification.href}>
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
