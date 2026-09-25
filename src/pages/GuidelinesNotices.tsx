import { Link } from 'react-router-dom';
import { ANNOUNCEMENTS } from '../data/mockData';
import { NewsCirculars } from '../components/home/NewsCirculars';
import { ROUTES } from '../lib/constants';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

export function GuidelinesNotices() {
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
            <Badge tone="blue">Portal information</Badge>
            <Badge tone="amber">Demo notices</Badge>
          </div>
          <h1 className="mt-3 text-2xl md:text-4xl font-extrabold tracking-tight text-gov-blue-dark">
            Guidelines &amp; Notices
          </h1>
          <p className="mt-3 text-sm md:text-base leading-relaxed text-slate-700">
            Review the sample circulars and notices retained in this prototype before they are
            replaced by verified official publications.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8">
            <Card className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-gov-blue-dark">Current sample notices</h2>
                <Badge tone="amber">Not official</Badge>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                The following content is demo data for evaluating the portal workflow. It must not
                be treated as a current scholarship, fellowship, or government notification.
              </p>
              <ul className="mt-5 divide-y divide-slate-100">
                {ANNOUNCEMENTS.map((announcement) => (
                  <li key={announcement.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="slate">{announcement.mark}</Badge>
                      <span className="text-[11px] text-slate-500">Prototype notice</span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-700">{announcement.text}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          <div className="lg:col-span-4">
            <NewsCirculars />
          </div>
        </div>
      </div>
    </section>
  );
}
