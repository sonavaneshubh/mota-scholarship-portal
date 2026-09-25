import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApplicantAuth } from '../../context/useApplicantAuth';
import { ROUTES, SECTION_IDS } from '../../lib/constants';
import { ApplicantHeader } from './ApplicantHeader';

export function ApplicantLayout() {
  const { session, user, role, loading, signOut } = useApplicantAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return null;
  }

  if (!session || !user || role !== 'applicant') {
    return <Navigate replace state={{ from: location }} to={ROUTES.applicant.login} />;
  }

  async function handleLogout() {
    const result = await signOut();

    if (result.success) {
      navigate(ROUTES.applicant.login, { replace: true });
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gov-slate-bg">
      <ApplicantHeader onLogout={handleLogout} profile={user} />
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
        Authentication uses Supabase. Application and document data remain sample content in this phase.
      </div>
      <main className="flex-grow" id={SECTION_IDS.MAIN_CONTENT.replace('#', '')}>
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-500">
        Applicant Portal prototype · Ministry of Tribal Affairs
      </footer>
    </div>
  );
}
