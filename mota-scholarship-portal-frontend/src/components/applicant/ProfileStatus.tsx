import { useEffect, useState } from 'react';
import { fetchCompleteness } from '../../services/profileService';
import { supabase } from '../../lib/supabase';
import { EMPTY_PROFILE_COMPLETENESS } from '../../types/profile';
import type { ProfileCompleteness } from '../../types/profile';

/**
 * Profile completeness on the dashboard.
 *
 * The percentage is whatever the database computes via
 * public.applicant_profile_completeness() — the same function the profile page
 * uses. It is deliberately not derived from the session or from a count of
 * non-empty fields in the browser, because that is how a dashboard ends up
 * claiming 100% for a profile that is actually empty.
 */
export function ProfileStatus() {
  const [completeness, setCompleteness] = useState<ProfileCompleteness>(EMPTY_PROFILE_COMPLETENESS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    void (async () => {
      const result = await fetchCompleteness();
      if (!active) return;
      if (result.ok && result.data) {
        setCompleteness(result.data);
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  const percent = completeness.overall;
  const isComplete = percent >= 100;

  return (
    <section className="border-b border-slate-200 bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ring-4 ${
              isComplete ? 'bg-emerald-500 ring-emerald-100' : 'bg-amber-500 ring-amber-100'
            }`}
          />
          <h2 className="truncate text-[14px] font-bold text-[#0B2A4A]">
            Profile Status
          </h2>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <span className="text-[13px] font-medium text-slate-600">Profile Completeness</span>
          <span
            className={`inline-flex min-w-[46px] items-center justify-center rounded-full px-2 py-0.5 text-[12px] font-bold ${
              isComplete
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            {loading ? '—' : `${percent}%`}
          </span>
        </div>
      </div>

      <div
        aria-label={`Profile completeness ${percent} percent`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percent}
        className="mt-2 h-[8px] w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
      >
        <div
          className={`h-full rounded-full transition-all ${isComplete ? 'bg-emerald-600' : 'bg-amber-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {!loading && !isComplete ? (
        <p className="mt-1.5 text-[11px] text-slate-500">
          {completeness.complete_sections} of {completeness.section_count} sections complete. Finish them to
          apply to schemes.
        </p>
      ) : null}
    </section>
  );
}
