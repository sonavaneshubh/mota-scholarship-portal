import { Link } from 'react-router-dom';
import { ROUTES, SITE } from '../lib/constants';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { SectionHeading } from '../components/ui/SectionHeading';

export function AboutMota() {
  return (
    <>
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Link
            to={ROUTES.home}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-gov-blue underline underline-offset-2 hover:text-gov-saffron"
          >
            ← Back to Home
          </Link>
          <div className="mt-5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="blue">About MoTA</Badge>
              <Badge tone="amber">Prototype / Demo</Badge>
            </div>
            <h1 className="mt-3 text-2xl md:text-4xl font-extrabold tracking-tight text-gov-blue-dark">
              Ministry of Tribal Affairs
            </h1>
            <p className="mt-3 text-sm md:text-base leading-relaxed text-slate-700">
              Information about the Ministry of Tribal Affairs, its purpose, mandate, and
              responsibilities.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        <section aria-labelledby="ministry-overview-heading">
          <SectionHeading
            id="ministry-overview-heading"
            eyebrow="Official context"
            title="Ministry of Tribal Affairs overview"
            description="The following information is carried forward from the verified project content available in this portal."
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="p-5 sm:p-6">
              <h3 className="text-lg font-bold text-gov-blue-dark">Overview</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                The Ministry was set up in 1999 after the bifurcation of the Ministry of Social
                Justice and Empowerment with the objective of providing a more focused approach
                towards integrated socio-economic development of the Scheduled Tribes (STs).
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                Its programmes are intended to support and supplement the efforts of other Central
                Ministries, State Governments, and voluntary organizations, taking into account the
                educational and economic status of STs.
              </p>
            </Card>

            <Card className="p-5 sm:p-6">
              <h3 className="text-lg font-bold text-gov-blue-dark">Vision and mission</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                The purpose described in the project is integrated socio-economic development of
                Scheduled Tribes, with attention to their educational and economic status.
              </p>
            </Card>
          </div>
        </section>

        <section aria-labelledby="role-responsibilities-heading">
          <SectionHeading
            id="role-responsibilities-heading"
            eyebrow="Mandate"
            title="Role and responsibilities of MoTA"
            description="The Ministry’s stated purpose and mandate, as described in the project content."
          />
          <Card className="p-5 sm:p-6">
            <ul className="space-y-3 text-sm leading-relaxed text-slate-700">
              <li className="flex items-start gap-2">
                <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-gov-saffron" />
                Support and supplement the efforts of other Central Ministries, State Governments,
                and voluntary organizations.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-gov-saffron" />
                Take into account the educational and economic status of STs in the development
                approach.
              </li>
            </ul>
          </Card>
        </section>

        <section aria-labelledby="official-information-heading">
          <SectionHeading
            id="official-information-heading"
            eyebrow="Reference information"
            title="Relevant official information"
            description="Identity and status information available in the project, with prototype boundaries made explicit."
          />
          <Card className="p-5 sm:p-6">
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Government</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  {SITE.govtLineEn} • {SITE.govtLineHi}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Ministry</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">
                  {SITE.nameEn} • {SITE.nameHi}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-500">Portal</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-900">{SITE.portalName}</dd>
              </div>
            </dl>

            <div className="mt-6 rounded border border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
              <strong>Information boundary:</strong> {SITE.prototypeLabel} — this interface is not a
              deployed MoTA system. The project contains sample schemes, demo notices, placeholder
              integrations, and demo support details; it does not provide current official scheme
              criteria, deadlines, notifications, or grievance processing.
            </div>

            <div className="mt-5 flex flex-wrap gap-4">
              <Link className="text-sm font-bold text-gov-blue hover:text-gov-saffron" to={ROUTES.guidelinesNotices}>
                View Guidelines &amp; Notices →
              </Link>
              <Link className="text-sm font-bold text-gov-blue hover:text-gov-saffron" to={ROUTES.helpGrievance}>
                Visit Help &amp; Grievance →
              </Link>
            </div>
          </Card>
        </section>
      </div>
    </>
  );
}
