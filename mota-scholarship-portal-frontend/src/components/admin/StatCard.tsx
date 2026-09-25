import { Card } from '../ui/Card';
import { AdminIcon } from './AdminIcon';
import type { AdminIconName } from './AdminIcon';

interface StatCardProps {
  label: string;
  value: string;
  detail: string;
  icon: AdminIconName;
  tone?: 'blue' | 'amber' | 'green' | 'purple' | 'slate';
  trend?: string;
}

const toneClasses = {
  blue: { icon: 'bg-blue-50 text-gov-blue', accent: 'border-l-gov-blue' },
  amber: { icon: 'bg-amber-50 text-gov-saffron-dark', accent: 'border-l-amber-500' },
  green: { icon: 'bg-emerald-50 text-emerald-700', accent: 'border-l-emerald-600' },
  purple: { icon: 'bg-purple-50 text-purple-700', accent: 'border-l-purple-500' },
  slate: { icon: 'bg-slate-100 text-slate-600', accent: 'border-l-slate-400' },
} as const;

export function StatCard({ label, value, detail, icon, tone = 'blue', trend }: StatCardProps) {
  const colors = toneClasses[tone];

  return (
    <Card className={`border-l-4 p-4 ${colors.accent}`} accentClass="">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colors.icon}`}>
          <AdminIcon className="h-5 w-5" name={icon} />
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
        {trend ? <span className="font-semibold text-emerald-700">{trend}</span> : null}
        <span>{detail}</span>
      </div>
    </Card>
  );
}
