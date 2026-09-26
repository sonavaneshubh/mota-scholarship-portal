import { Link } from 'react-router-dom';
import type { BadgeTone } from '../ui/Badge';

interface OverviewCardProps {
  label: string;
  value: string;
  detail: string;
  tone: BadgeTone;
}

const iconMap: Record<BadgeTone, React.ReactNode> = {
  red: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  ),
  amber: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  green: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4 12 14.01l-3-3" />
    </svg>
  ),
  blue: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <rect height="13" rx="2" width="16" x="4" y="3" />
      <path d="M8 11h8M8 15h5" />
    </svg>
  ),
  purple: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  slate: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
  emerald: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="M22 4 12 14.01l-3-3" />
    </svg>
  ),
};

const toneBgClass: Record<BadgeTone, string> = {
  red: 'bg-red-50 border-red-100',
  amber: 'bg-amber-50 border-amber-100',
  green: 'bg-emerald-50 border-emerald-100',
  blue: 'bg-blue-50 border-blue-100',
  purple: 'bg-purple-50 border-purple-100',
  slate: 'bg-slate-50 border-slate-100',
  emerald: 'bg-emerald-50 border-emerald-100',
};

const toneTextClass: Record<BadgeTone, string> = {
  red: 'text-red-700',
  amber: 'text-amber-700',
  green: 'text-emerald-700',
  blue: 'text-blue-700',
  purple: 'text-purple-700',
  slate: 'text-slate-700',
  emerald: 'text-emerald-700',
};

const toneIconClass: Record<BadgeTone, string> = {
  red: 'text-red-500',
  amber: 'text-amber-500',
  green: 'text-emerald-500',
  blue: 'text-blue-500',
  purple: 'text-purple-500',
  slate: 'text-slate-500',
  emerald: 'text-emerald-500',
};

export function OverviewCard({ label, value, detail, tone }: OverviewCardProps) {
  return (
    <article className={`flex flex-col rounded-xl border ${toneBgClass[tone]} p-5 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneIconClass[tone]}`}>
            {iconMap[tone]}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-extrabold {toneTextClass[tone]}">{value}</p>
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-500">{detail}</p>
      <div className="mt-4 pt-4 border-t border-slate-100">
        <Link
          className={`inline-flex items-center gap-1 text-sm font-medium ${toneTextClass[tone]} hover:underline`}
          to="#"
        >
          View Details
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </article>
  );
}