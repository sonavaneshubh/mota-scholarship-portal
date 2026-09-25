import type { ReactNode } from 'react';

export type BadgeTone =
  | 'red'
  | 'amber'
  | 'green'
  | 'blue'
  | 'purple'
  | 'slate'
  | 'emerald';

const toneClasses: Record<BadgeTone, string> = {
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-800',
  green: 'bg-emerald-100 text-gov-green',
  blue: 'bg-blue-100 text-gov-blue',
  purple: 'bg-purple-100 text-purple-800',
  slate: 'bg-slate-100 text-slate-600',
  emerald: 'bg-emerald-50 text-emerald-700',
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  dotClass?: string;
}

export function Badge({ tone = 'slate', children, className = '', dotClass }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${toneClasses[tone]} ${className}`}
    >
      {dotClass ? <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} /> : null}
      {children}
    </span>
  );
}