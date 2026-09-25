import { useParams } from 'react-router-dom';
import { SCHEMES } from '../data/mockData';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ROUTES } from '../lib/constants';

export function ApplicantSchemeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const scheme = SCHEMES.find((item) => item.id === id);

  if (!scheme) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-xl font-bold text-gov-blue-dark">Scheme not found</h1>
          <Button className="mt-5" size="md" to={ROUTES.applicant.schemes} variant="outline">Back to schemes</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <ApplicantPageHeader
        action={<Button size="md" to={ROUTES.applicant.schemes} variant="outline">Back to schemes</Button>}
        description={scheme.description}
        eyebrow={`${scheme.categoryLabel} · Sample listing`}
        title={scheme.name}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2" accentClass="">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={scheme.badgeTone}>{scheme.statusLabel}</Badge>
            <span className="text-xs text-slate-500">Reference: {scheme.id}</span>
          </div>
          <h2 className="mt-5 text-lg font-bold text-gov-blue-dark">Scheme overview</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">This placeholder presents the information architecture for a future scheme detail page. Official eligibility, benefits, and deadlines are not connected in this prototype.</p>
          <dl className="mt-6 grid gap-4 border-y border-slate-100 py-5 sm:grid-cols-3">
            {scheme.stats.map((stat) => <div key={stat.label}><dt className="text-xs text-slate-500">{stat.label}</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{stat.value}</dd></div>)}
          </dl>
        </Card>
        <Card className="h-fit p-5" accentClass="">
          <h2 className="text-lg font-bold text-gov-blue-dark">Ready to apply?</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">The application flow is represented in the applicant workspace for this demo.</p>
          <Button className="mt-5 w-full" size="md" to={ROUTES.applicant.applications} variant="accent">View my applications</Button>
        </Card>
      </div>
    </div>
  );
}
