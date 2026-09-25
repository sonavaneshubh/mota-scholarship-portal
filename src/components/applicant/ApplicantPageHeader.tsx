import type { ReactNode } from 'react';

interface ApplicantPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function ApplicantPageHeader({ eyebrow, title, description, action }: ApplicantPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-bold text-gov-blue-dark sm:text-3xl">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
