import { Link } from 'react-router-dom';
import type { ApplicantQuickAction, ApplicantQuickActionIcon } from '../../types';

interface QuickActionCardProps {
  action: ApplicantQuickAction;
}

const iconClasses: Record<ApplicantQuickActionIcon, string> = {
  scheme: 'bg-blue-100 text-gov-blue',
  documents: 'bg-amber-100 text-amber-800',
  notifications: 'bg-purple-100 text-purple-700',
  profile: 'bg-emerald-100 text-emerald-700',
};

function QuickActionIcon({ icon }: { icon: ApplicantQuickActionIcon }) {
  return (
    <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconClasses[icon]}`}>
      <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24">
        {icon === 'scheme' ? <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z M4 5.5v16M8 7h8M8 11h8" /> : null}
        {icon === 'documents' ? <path d="M6 3h9l3 3v15H6zM14 3v4h4M9 12h6M9 16h6" /> : null}
        {icon === 'notifications' ? <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /> : null}
        {icon === 'profile' ? <path d="M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /> : null}
      </svg>
    </span>
  );
}

export function QuickActionCard({ action }: QuickActionCardProps) {
  return (
    <Link className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-blue-200 hover:shadow-sm" to={action.href}>
      <QuickActionIcon icon={action.icon} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-800">{action.title}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">{action.description}</span>
      </span>
      <span className="shrink-0 text-xs font-bold text-gov-blue">{action.ctaLabel} →</span>
    </Link>
  );
}
