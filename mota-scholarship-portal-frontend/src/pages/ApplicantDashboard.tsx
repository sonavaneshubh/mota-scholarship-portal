import { Navigate, useLocation } from 'react-router-dom';
import { useApplicantAuth } from '../context/useApplicantAuth';
import { ROUTES } from '../lib/constants';
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
      <ProfileStatus />
      <EligibleSchemes />
    </div>
  );
}
