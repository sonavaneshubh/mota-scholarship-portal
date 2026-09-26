import {
  ALL_GUIDELINES_ARE_SUPERSEDED,
  SCHEME_GUIDELINES,
} from '../../data/schemeGuidelines';
import { ROUTES } from '../../lib/constants';
import { Link } from 'react-router-dom';
import { Badge } from '../ui/Badge';

export function NewsCirculars() {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-sm lg:col-span-5" id="notices">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
        <h3 className="text-sm font-bold text-gov-blue-dark uppercase tracking-wide flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-gov-saffron rounded-full" />
          Scheme Guidelines
        </h3>
        <Badge tone="blue">{SCHEME_GUIDELINES.length} PDFs</Badge>
      </div>

      {ALL_GUIDELINES_ARE_SUPERSEDED ? (
        <p className="mb-3 flex gap-2 rounded border border-amber-300 bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-900">
          <span aria-hidden="true" className="font-bold">
            !
          </span>
          <span>
            These guidelines cover the 2021-22 to 2025-26 scheme period, which has
            ended. Check with the Ministry for the current rules before applying.
          </span>
        </p>
      ) : null}

      <ul className="space-y-3 text-xs divide-y divide-slate-100">
        {SCHEME_GUIDELINES.map((item) => (
          <li key={item.code} className="pt-2">
            <div className="flex items-start gap-2">
              <span className="bg-red-100 text-red-700 px-1 py-0.5 rounded text-[10px] font-bold shrink-0">
                PDF
              </span>
              <div className="min-w-0 flex-1">
                <a
                  className="font-medium text-gov-blue hover:underline"
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.title}
                </a>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {item.code} &middot; {item.pages} pages &middot; {item.fileSize}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 pt-3 border-t border-slate-200 text-[10px] text-slate-500">
        Documents open in a new tab.{' '}
        <Link className="text-gov-blue hover:underline font-medium" to={ROUTES.guidelinesNotices}>
          View all guidelines &amp; notices
        </Link>
      </div>
    </div>
  );
}
