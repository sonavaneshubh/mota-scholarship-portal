import { Link } from 'react-router-dom';
import { SchemeDirectory } from '../components/home/SchemeDirectory';
import { ROUTES } from '../lib/constants';

export function ScholarshipsFellowships() {
  return (
    <div className="bg-gov-slate-bg">
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Link
            to={ROUTES.home}
            className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-gov-blue shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-gov-saffron hover:bg-amber-50 hover:text-gov-blue-dark focus-visible:ring-2 focus-visible:ring-gov-saffron focus-visible:ring-offset-2"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-base leading-none text-gov-blue transition group-hover:bg-amber-100 group-hover:text-gov-saffron-dark" aria-hidden="true">
              ←
            </span>
            <span>Back to Home</span>
          </Link>
          <div className="mt-5 max-w-3xl">
            <span className="text-xs font-bold text-gov-saffron uppercase tracking-wider">
              Scholarship directory
            </span>
            <h1 className="mt-2 text-2xl md:text-4xl font-extrabold tracking-tight text-gov-blue-dark">
              Scholarships &amp; Fellowships
            </h1>
            <p className="mt-3 text-sm md:text-base leading-relaxed text-slate-700">
              Every scholarship scheme published on this portal. Eligibility, benefits, required
              documents and deadlines are taken from each scheme&rsquo;s own official notification.
            </p>
          </div>
        </div>
      </section>

      <SchemeDirectory />
    </div>
  );
}
