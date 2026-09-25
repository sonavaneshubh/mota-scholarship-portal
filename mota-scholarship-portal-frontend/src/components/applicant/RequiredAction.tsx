import { Link } from 'react-router-dom';
import type { ApplicantRequiredAction } from '../../types';

interface RequiredActionProps {
  action: ApplicantRequiredAction;
}

const toneClasses: Record<ApplicantRequiredAction['tone'], string> = {
  blue: 'border-blue-200 bg-blue-50 text-blue-900 border-l-blue-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-900 border-l-amber-500',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-900 border-l-emerald-600',
};

export function RequiredAction({ action }: RequiredActionProps) {
  return (
    <aside className={`rounded-r-lg border border-l-4 p-4 shadow-sm ${toneClasses[action.tone]}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/70">
            <svg aria-hidden="true" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path clipRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92ZM10 13a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm0-8a1 1 0 0 1 1 1v3a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1Z" fillRule="evenodd" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold">Immediate action: {action.title}</h2>
            <p className="mt-1 text-xs leading-relaxed opacity-90">{action.description}</p>
            <p className="mt-1 text-[11px] font-semibold opacity-75">{action.dueLabel}</p>
          </div>
        </div>
        <Link className="inline-flex min-h-11 shrink-0 items-center justify-center rounded bg-amber-700 px-3.5 text-xs font-bold text-white transition hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-700 focus:ring-offset-2" to={action.href}>
          {action.ctaLabel} →
        </Link>
      </div>
    </aside>
  );
}
