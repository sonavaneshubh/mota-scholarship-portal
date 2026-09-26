import { PORTAL_SCHEMES } from '../../data/portalSchemes';
import { SchemeTable } from './SchemeTable';

export function EligibleSchemes() {
  return (
    <section className="min-w-0 px-3 pt-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
          <h2 className="text-[14px] font-bold text-[#0B2A4A]">
            Suggested Eligible Schemes (On the basis of Caste, Religion and Income)
          </h2>
        </div>

        <span className="flex-shrink-0 rounded-[3px] border border-slate-300 bg-slate-50 px-2.5 py-1 text-[12px] font-semibold text-slate-700">
          Showing {PORTAL_SCHEMES.length} Schemes
        </span>
      </div>

      <SchemeTable schemes={PORTAL_SCHEMES} />
    </section>
  );
}
