import { Link } from 'react-router-dom';
import type { ApplicantRequiredAction } from '../../types';

interface RequiredActionProps {
  action: ApplicantRequiredAction;
}

const toneClasses: Record<ApplicantRequiredAction['tone'], string> = {
  blue: 'border-blue-200 bg-blue-50 text-gov-blue',
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export function RequiredAction({ action }: RequiredActionProps) {
  return (
    <div className={`rounded-lg border p-4 ${toneClasses[action.tone]}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-bold">{action.title}</h2>
          <p className="mt-1 text-xs leading-relaxed opacity-90">{action.description}</p>
          <p className="mt-2 text-[11px] font-semibold opacity-75">{action.dueLabel}</p>
        </div>
        <Link className="inline-flex min-h-11 shrink-0 items-center justify-center rounded bg-white px-3 text-xs font-bold underline underline-offset-2 hover:bg-slate-50" to={action.href}>
          {action.ctaLabel}
        </Link>
      </div>
    </div>
  );
}
