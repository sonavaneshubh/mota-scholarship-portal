import { Link } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';
import type { ApplicantScheme } from '../../lib/supabase';

const badgeToneClass: Record<ApplicantScheme['badgeTone'], string> = {
  blue: 'bg-blue-100 text-gov-blue',
  purple: 'bg-purple-100 text-purple-800',
  green: 'bg-emerald-100 text-gov-green',
  amber: 'bg-amber-100 text-gov-saffron',
};

export interface SchemeCardProps {
  scheme: ApplicantScheme;
}

export function SchemeCard({ scheme }: SchemeCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 md:p-4 flex flex-col justify-between shadow-sm hover:border-gov-blue transition">
      <div>
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded ${badgeToneClass[scheme.badgeTone]}`}
          >
            {scheme.categoryLabel}
          </span>
          {scheme.demo ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
              Unverified
            </span>
          ) : null}
          <span
            className={`text-[10px] font-semibold flex items-center gap-1 ${
              scheme.statusActive ? 'text-emerald-700' : 'text-slate-600'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                scheme.statusActive ? 'bg-emerald-600' : 'bg-slate-400'
              }`}
            />
            {scheme.statusLabel}
          </span>
        </div>

        <h3 className="font-bold text-sm text-slate-900 leading-snug">{scheme.name}</h3>
        <p className="text-xs text-slate-600 mt-2 line-clamp-3">{scheme.description}</p>

        <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs">
          {scheme.stats.map((stat) => (
            <div key={stat.label} className="flex justify-between text-slate-600">
              <span className="font-medium">{stat.label}:</span>{' '}
              <span
                className={
                  stat.emphasize ? 'font-bold text-gov-blue' : 'font-bold text-slate-800'
                }
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <Link
          className={`text-xs font-semibold ${scheme.guidelinesAvailable ? 'text-gov-blue hover:underline' : 'text-slate-400'}`}
          to={ROUTES.guidelinesNotices}
        >
          {scheme.guidelinesAvailable ? 'Guidelines' : 'Guidelines unavailable'}
        </Link>
        {scheme.applyHref ? (
          <a
            className="px-3 py-1 bg-gov-blue hover:bg-gov-blue-dark text-white text-xs font-semibold rounded transition"
            href={scheme.applyHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            Apply Now
          </a>
        ) : (
          <span className="px-3 py-1 rounded bg-slate-100 text-slate-500 text-xs font-semibold">
            Apply offline
          </span>
        )}
      </div>
    </div>
  );
}