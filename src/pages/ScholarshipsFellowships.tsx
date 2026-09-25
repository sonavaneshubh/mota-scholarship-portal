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
            className="inline-flex min-h-11 items-center text-sm font-semibold text-gov-blue underline underline-offset-2 hover:text-gov-saffron"
          >
            ← Back to Home
          </Link>
          <div className="mt-5 max-w-3xl">
            <span className="text-xs font-bold text-gov-saffron uppercase tracking-wider">
              Scholarship directory
            </span>
            <h1 className="mt-2 text-2xl md:text-4xl font-extrabold tracking-tight text-gov-blue-dark">
              Scholarships &amp; Fellowships
            </h1>
            <p className="mt-3 text-sm md:text-base leading-relaxed text-slate-700">
              Browse the existing sample scheme directory for this prototype. Entries remain
              explicitly marked as demo configurations rather than official schemes.
            </p>
          </div>
        </div>
      </section>

      <SchemeDirectory />
    </div>
  );
}
