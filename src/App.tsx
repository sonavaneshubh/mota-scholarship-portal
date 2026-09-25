import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ApplicantAuthProvider } from './context/ApplicantAuthContext';
import { ApplicantLayout } from './components/applicant/ApplicantLayout';
import { SiteLayout } from './components/layout/SiteLayout';
import { ROUTES } from './lib/constants';
import { ApplicantApplicationPage } from './pages/ApplicantApplicationPage';
import { ApplicantApplicationsPage } from './pages/ApplicantApplicationsPage';
import { ApplicantDashboard } from './pages/ApplicantDashboard';
import { ApplicantDocumentsPage } from './pages/ApplicantDocumentsPage';
import { ApplicantNotificationsPage } from './pages/ApplicantNotificationsPage';
import { ApplicantProfilePage } from './pages/ApplicantProfilePage';
import { ApplicantSchemeDetailPage } from './pages/ApplicantSchemeDetailPage';
import { ApplicantSchemesPage } from './pages/ApplicantSchemesPage';
import { Home } from './pages/Home';

export default function App() {
  return (
    <BrowserRouter>
      <ApplicantAuthProvider>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path={ROUTES.home} element={<Home />} />
            <Route path={ROUTES.applicant.login} element={<Navigate replace to={ROUTES.homeLogin} />} />
            <Route path={ROUTES.applicant.register} element={<Navigate replace to={ROUTES.homeLogin} />} />
            <Route path={ROUTES.admin.login} element={<Navigate replace to={ROUTES.homeLogin} />} />
            <Route path="*" element={<Navigate replace to={ROUTES.home} />} />
          </Route>
          <Route element={<ApplicantLayout />}>
            <Route path={ROUTES.applicant.dashboard} element={<ApplicantDashboard />} />
            <Route path={ROUTES.applicant.schemes} element={<ApplicantSchemesPage />} />
            <Route path={ROUTES.applicant.schemeDetail} element={<ApplicantSchemeDetailPage />} />
            <Route path={ROUTES.applicant.applications} element={<ApplicantApplicationsPage />} />
            <Route path={ROUTES.applicant.application} element={<ApplicantApplicationPage />} />
            <Route path={ROUTES.applicant.status} element={<ApplicantApplicationPage />} />
            <Route path={ROUTES.applicant.documents} element={<ApplicantDocumentsPage />} />
            <Route path={ROUTES.applicant.notifications} element={<ApplicantNotificationsPage />} />
            <Route path={ROUTES.applicant.profile} element={<ApplicantProfilePage />} />
          </Route>
        </Routes>
      </ApplicantAuthProvider>
    </BrowserRouter>
  );
}
