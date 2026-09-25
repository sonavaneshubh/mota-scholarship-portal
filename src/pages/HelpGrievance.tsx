import { Link } from 'react-router-dom';
import { GOVERNMENT_INITIATIVES } from '../data/mockData';
import { ROUTES, SITE } from '../lib/constants';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { SectionHeading } from '../components/ui/SectionHeading';

export function HelpGrievance() {
  const grievanceInitiative = GOVERNMENT_INITIATIVES.find((initiative) => initiative.id === 'grievance');

  return (
    <section className="bg-gov-slate-bg py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4">
        <Link
          to={ROUTES.home}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-gov-blue underline underline-offset-2 hover:text-gov-saffron"
        >
          ← Back to Home
        </Link>

        <div className="mt-5 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="blue">Portal support</Badge>
            <Badge tone="amber">Prototype / Demo</Badge>
          </div>
          <h1 className="mt-3 text-2xl md:text-4xl font-extrabold tracking-tight text-gov-blue-dark">
            Help &amp; Grievance
          </h1>
          <p className="mt-3 text-sm md:text-base leading-relaxed text-slate-700">
            Find the existing support and grievance information for this scholarship and fellowship
            portal prototype.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-bold text-gov-blue-dark">How to get help</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              Use the portal pages to understand the workflow before submitting information. This
              build does not submit applications, grievances, or personal data to a live service.
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
              <li className="flex items-start gap-2">
                <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-gov-blue" />
                Review the sample scholarship and fellowship directory for scheme categories.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-gov-blue" />
                Read the sample guidelines and notices for workflow expectations.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-gov-blue" />
                Use the existing applicant or administrator login card for the prototype UI.
              </li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-4">
              <Link className="text-sm font-bold text-gov-blue hover:text-gov-saffron" to={ROUTES.scholarshipsFellowships}>
                Explore Scholarships &amp; Fellowships →
              </Link>
              <Link className="text-sm font-bold text-gov-blue hover:text-gov-saffron" to={ROUTES.guidelinesNotices}>
                View Guidelines &amp; Notices →
              </Link>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="text-lg font-bold text-gov-blue-dark">Support details</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Helpdesk</dt>
                <dd className="mt-1 font-semibold text-slate-900">{SITE.helpdeskLabel}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Phone</dt>
                <dd className="mt-1 font-semibold text-gov-blue">{SITE.helpdeskPhone}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Hours</dt>
                <dd className="mt-1 text-slate-700">{SITE.helpdeskHours}</dd>
              </div>
            </dl>
            <p className="mt-5 rounded border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              These support details are prototype placeholders. Do not treat them as an official
              grievance or contact channel.
            </p>
          </Card>
        </div>

        <Card className="mt-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gov-blue-dark">Grievance desk</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-700">
                The existing project data lists the grievance desk as{' '}
                <span className="font-semibold text-slate-900">
                  {grievanceInitiative?.name ?? 'Grievance Desk'}
                </span>{' '}
                with status{' '}
                <span className="font-semibold text-slate-900">
                  {grievanceInitiative?.status ?? 'Planned'}
                </span>
                . No live submission or tracking service is included in this build.
              </p>
            </div>
            <Badge tone="slate">Planned integration</Badge>
          </div>
        </Card>

        <div className="mt-8">
          <SectionHeading
            eyebrow="Related information"
            title="Continue exploring the portal"
            description="Use the dedicated pages for the ministry context and the scholarship workflow."
          />
          <div className="flex flex-wrap gap-4">
            <Link className="text-sm font-bold text-gov-blue hover:text-gov-saffron" to={ROUTES.aboutMota}>
              Read About MoTA →
            </Link>
            <Link className="text-sm font-bold text-gov-blue hover:text-gov-saffron" to={ROUTES.home}>
              Return to Home →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
