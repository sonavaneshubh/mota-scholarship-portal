import { useParams } from 'react-router-dom';
import { APPLICANT_APPLICATIONS } from '../data/applicantData';
import { SCHEMES } from '../data/mockData';
import { PORTAL_SCHEMES } from '../data/portalSchemes';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { ApplicationStatusBadge } from '../components/applicant/StatusBadge';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ROUTES } from '../lib/constants';

export function ApplicantSchemeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const scheme = SCHEMES.find((item) => item.id === id);
  const portalScheme = PORTAL_SCHEMES.find((item) => item.id === id);

  if (!scheme && portalScheme) {
    return (
      <div className="space-y-4 py-1 sm:py-2">
        <ApplicantPageHeader
          action={<Button size="md" to={ROUTES.applicant.dashboard} variant="outline">Back to Home</Button>}
          description={`${portalScheme.department} · ${portalScheme.type}`}
          eyebrow="Suggested eligible scheme"
          title={portalScheme.name}
        />
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="scroll-mt-24 p-5 lg:col-span-2" id="guidelines">
            <h2 className="text-base font-bold text-gov-blue-dark">Scheme guidelines (GR)</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Official government resolutions for this scheme are not connected in this prototype. Confirm the
              notification and criteria on the Maharashtra scholarship portal before applying.
            </p>
          </Card>
          <Card accentClass="border-l-4 border-gov-saffron" className="h-fit scroll-mt-24 p-5" id="application-action">
            <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Application action</p>
            <h2 className="mt-1 text-base font-bold text-gov-blue-dark">Ready to apply?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              The submission flow is represented in the applicant workspace for this demo, but no application can be
              submitted yet.
            </p>
            <Button className="mt-4 w-full" disabled size="md" type="button" variant="primary">
              Apply unavailable in demo
            </Button>
            <Button className="mt-2 w-full" size="md" to={ROUTES.applicant.applications} variant="outline">
              View my applications
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (!scheme) {
    return (
      <div className="space-y-6 py-1 sm:py-2">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-gov-blue-dark">Scheme not found</h1>
          <Button className="mt-5" size="md" to={ROUTES.applicant.schemes} variant="outline">Back to schemes</Button>
        </Card>
      </div>
    );
  }

  const existingApplication = APPLICANT_APPLICATIONS.find((application) => application.schemeId === scheme.id);

  return (
    <div className="space-y-6 py-1 sm:py-2">
      <ApplicantPageHeader
        action={<Button size="md" to={ROUTES.applicant.schemes} variant="outline">Back to schemes</Button>}
        description={scheme.description}
        eyebrow={`${scheme.categoryLabel} · Sample listing`}
        title={scheme.name}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={scheme.badgeTone}>{scheme.statusLabel}</Badge>
            <span className="text-xs text-slate-500">Reference: {scheme.id}</span>
          </div>
          <h2 className="mt-5 text-lg font-bold text-gov-blue-dark">Scheme overview</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">This placeholder presents the information architecture for a future scheme detail page. Official eligibility, benefits, and deadlines are not connected in this prototype.</p>
          <dl className="mt-6 grid gap-4 border-y border-slate-100 py-5 sm:grid-cols-3">
            {scheme.stats.map((stat) => <div key={stat.label}><dt className="text-xs text-slate-500">{stat.label}</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{stat.value}</dd></div>)}
          </dl>
          <div className="mt-5 rounded border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
            <p className="font-bold">Eligibility boundary</p>
            <p className="mt-1">Your profile can be used to review likely fields, but this listing does not determine eligibility. Confirm the official notification and criteria when the service is connected.</p>
          </div>
        </Card>

        <Card className="h-fit scroll-mt-24 p-5" accentClass="border-l-4 border-gov-saffron" id="application-action">
          <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Application action</p>
          <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Ready to apply?</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">The submission flow is represented in the applicant workspace for this demo, but no application can be submitted yet.</p>
          {existingApplication ? (
            <div className="mt-4 rounded border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gov-blue">Existing sample record</p>
              <div className="mt-2 flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-800">{existingApplication.id}</span><ApplicationStatusBadge status={existingApplication.status} label={existingApplication.statusLabel} /></div>
            </div>
          ) : null}
          <Button className="mt-5 w-full" disabled size="md" type="button" variant="primary">Apply unavailable in demo</Button>
          <Button className="mt-2 w-full" size="md" to={ROUTES.applicant.applications} variant="outline">View my applications</Button>
        </Card>
      </div>
    </div>
  );
}
