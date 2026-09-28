import { Navigate, useLocation } from 'react-router-dom';
import { useApplicantAuth } from '../context/useApplicantAuth';
import { ROUTES } from '../lib/constants';
import { isSupabaseConfigured, supabaseConfigNotice } from '../lib/supabase';
import { ProfileStatus } from '../components/applicant/ProfileStatus';
import { EligibleSchemes } from '../components/applicant/EligibleSchemes';

export function ApplicantDashboard() {
  const { session, user } = useApplicantAuth();
  const location = useLocation();

  if (!session || !user) {
    return (
      <Navigate
        replace
        state={{
          homeAuthMode: 'applicant',
          from: { pathname: location.pathname, search: location.search, hash: location.hash },
        }}
        to={ROUTES.homeLogin}
      />
    );
  }

  return (
    <div className="min-w-0">
      {/*
        An empty dashboard is indistinguishable from a portal with no schemes and
        no profile, so the reason is stated on the page instead. Every panel
        below reads through `supabase`, and each one short-circuits to an empty
        result when there is no client — silently, because "no data" is also the
        honest answer for a brand-new applicant.
      */}
      {!isSupabaseConfigured ? (
        <p
          className="m-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] leading-relaxed text-amber-900"
          role="alert"
        >
          {supabaseConfigNotice}
        </p>
      ) : null}

      <ProfileStatus />
      <EligibleSchemes />
    </div>
  );
}
