import { useEligibleSchemes } from '../../hooks/useEligibleSchemes';
import { SchemeTable } from './SchemeTable';

export function EligibleSchemes() {
  const { schemes, loading, error } = useEligibleSchemes();

  return (
    <section className="min-w-0 px-3 pt-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-emerald-600 ring-4 ring-emerald-100"
          />
          <h2 className="text-[14px] font-bold text-[#0B2A4A]">Available Schemes</h2>
        </div>

        {!loading && !error ? (
          <span className="flex-shrink-0 rounded-[3px] border border-slate-300 bg-slate-50 px-2.5 py-1 text-[12px] font-semibold text-slate-700">
            Showing {schemes.length} Schemes
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
          Unable to load schemes right now. Please refresh the page to try again.
        </p>
      ) : (
        <SchemeTable loading={loading} schemes={schemes} />
      )}
    </section>
  );
}
