import type { BadgeTone } from '../ui/Badge';
import { Badge } from '../ui/Badge';

interface OverviewCardProps {
  label: string;
  value: string;
  detail: string;
  tone: BadgeTone;
  badgeLabel?: string;
}

const valueClasses: Record<BadgeTone, string> = {
  red: 'text-red-700',
  amber: 'text-amber-600',
  green: 'text-emerald-700',
  blue: 'text-slate-900',
  purple: 'text-purple-700',
  slate: 'text-slate-900',
  emerald: 'text-emerald-700',
};

export function OverviewCard({ label, value, detail, tone, badgeLabel }: OverviewCardProps) {
  const urgent = tone === 'amber';

  return (
    <article className={`flex min-w-0 flex-col justify-between rounded-lg border bg-white p-4 shadow-sm ${urgent ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-xs font-semibold uppercase tracking-wider ${urgent ? 'text-amber-900' : 'text-slate-500'}`}>{label}</p>
        <Badge className="shrink-0" tone={tone}>{badgeLabel ?? 'Demo'}</Badge>
      </div>
      <p className={`my-2 text-3xl font-extrabold ${valueClasses[tone]}`}>{value}</p>
      <p className={`text-[11px] font-medium ${urgent ? 'text-amber-800' : 'text-slate-500'}`}>{detail}</p>
    </article>
  );
}
