import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { applicantSchemePath } from '../../lib/constants';
import type { Scheme } from '../../types';

interface ApplicantSchemeCardProps {
  scheme: Scheme;
}

export function ApplicantSchemeCard({ scheme }: ApplicantSchemeCardProps) {
  return (
    <Card className="flex h-full flex-col p-5" accentClass="">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-gov-saffron-dark">{scheme.categoryLabel}</p>
          <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">{scheme.name}</h2>
        </div>
        <Badge tone={scheme.badgeTone}>{scheme.statusLabel}</Badge>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{scheme.description}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 border-y border-slate-100 py-3 text-xs">
        {scheme.stats.slice(0, 2).map((stat) => (
          <div key={stat.label}>
            <dt className="text-slate-500">{stat.label}</dt>
            <dd className="mt-1 font-semibold text-slate-800">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <Button className="mt-4 w-full" size="md" to={applicantSchemePath(scheme.id)} variant="outline">
        View scheme details
      </Button>
    </Card>
  );
}
