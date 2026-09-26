import { PORTAL_ACADEMIC_YEAR } from '../../data/portalSchemes';

export function ProfileStatus() {
  return (
    <section className="border-b border-slate-200 bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-amber-500 ring-4 ring-amber-100" />
          <h2 className="truncate text-[14px] font-bold text-[#0B2A4A]">
            Profile Status (AY {PORTAL_ACADEMIC_YEAR})
          </h2>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="text-[13px] font-medium text-slate-600">Profile Completeness</span>
          <span className="inline-flex min-w-[46px] items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[12px] font-bold text-emerald-700">
            100%
          </span>
        </div>
      </div>

      <div
        aria-label="Profile completeness 100 percent"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={100}
        className="mt-2 h-[8px] w-full overflow-hidden rounded-full bg-emerald-100"
        role="progressbar"
      >
        <div className="h-full w-full rounded-full bg-emerald-600" />
      </div>
    </section>
  );
}
