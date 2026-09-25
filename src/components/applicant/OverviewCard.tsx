import { Card } from '../ui/Card';
import type { BadgeTone } from '../ui/Badge';
import { Badge } from '../ui/Badge';

interface OverviewCardProps {
  label: string;
  value: string;
  detail: string;
  tone: BadgeTone;
}

export function OverviewCard({ label, value, detail, tone }: OverviewCardProps) {
  return (
    <Card className="p-4" accentClass="">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-slate-600">{label}</p>
        <Badge tone={tone}>{label === 'Profile' ? 'Active' : 'Demo'}</Badge>
      </div>
      <p className="mt-3 text-2xl font-bold text-gov-blue-dark">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </Card>
  );
}
