import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ApplicantAuthProvider } from './context/ApplicantAuthContext';
import { ApplicantLayout } from './components/applicant/ApplicantLayout';
import { SiteLayout } from './components/layout/SiteLayout';
import { ROUTES } from './lib/constants';
import { AboutMota } from './pages/AboutMota';
import { GuidelinesNotices } from './pages/GuidelinesNotices';
import { HelpGrievance } from './pages/HelpGrievance';
import { ApplicantApplicationPage } from './pages/ApplicantApplicationPage';
import { ApplicantApplicationsPage } from './pages/ApplicantApplicationsPage';
import { ApplicantDashboard } from './pages/ApplicantDashboard';
import { ApplicantDocumentsPage } from './pages/ApplicantDocumentsPage';
import { ApplicantGrievancesPage } from './pages/ApplicantGrievancesPage';
import { ApplicantGuidelinesPage } from './pages/ApplicantGuidelinesPage';
import { ApplicantHistoryPage } from './pages/ApplicantHistoryPage';
import { ApplicantNotificationsPage } from './pages/ApplicantNotificationsPage';
import { ApplicantProfilePage } from './pages/ApplicantProfilePage';
import { ApplicantSchemeDetailPage } from './pages/ApplicantSchemeDetailPage';
import { ApplicantSchemesPage } from './pages/ApplicantSchemesPage';
import { Home } from './pages/Home';
import { ScholarshipsFellowships } from './pages/ScholarshipsFellowships';

export default function App() {
  return (
    <BrowserRouter>
      <ApplicantAuthProvider>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path={ROUTES.home} element={<Home />} />
            <Route path={ROUTES.aboutMota} element={<AboutMota />} />
            <Route path={ROUTES.scholarshipsFellowships} element={<ScholarshipsFellowships />} />
            <Route path={ROUTES.guidelinesNotices} element={<GuidelinesNotices />} />
            <Route path={ROUTES.helpGrievance} element={<HelpGrievance />} />
            <Route
              path={ROUTES.applicant.login}
              element={
                <Navigate
                  replace
                  state={{ homeAuthMode: 'applicant' }}
                  to={ROUTES.homeLogin}
                />
              }
            />
            <Route
              path={ROUTES.applicant.register}
              element={
                <Navigate
                  replace
                  state={{ homeAuthMode: 'registration' }}
                  to={ROUTES.homeLogin}
                />
              }
            />
            <Route
              path={ROUTES.admin.login}
              element={
                <Navigate
                  replace
                  state={{ homeAuthMode: 'admin' }}
                  to={ROUTES.homeLogin}
                />
              }
            />
            <Route path="*" element={<Navigate replace to={ROUTES.home} />} />
          </Route>
          <Route path={ROUTES.applicant.dashboard} element={<ApplicantDashboard />} />
          <Route element={<ApplicantLayout />}>
            <Route path={ROUTES.applicant.schemes} element={<ApplicantSchemesPage />} />
            <Route path={ROUTES.applicant.schemeDetail} element={<ApplicantSchemeDetailPage />} />
            <Route path={ROUTES.applicant.applications} element={<ApplicantApplicationsPage />} />
            <Route path={ROUTES.applicant.application} element={<ApplicantApplicationPage />} />
            <Route path={ROUTES.applicant.status} element={<ApplicantApplicationPage />} />
            <Route path={ROUTES.applicant.documents} element={<ApplicantDocumentsPage />} />
            <Route path={ROUTES.applicant.history} element={<ApplicantHistoryPage />} />
            <Route path={ROUTES.applicant.grievance} element={<ApplicantGrievancesPage />} />
            <Route path={ROUTES.applicant.guidelines} element={<ApplicantGuidelinesPage />} />
            <Route path={ROUTES.applicant.notifications} element={<ApplicantNotificationsPage />} />
            <Route path={ROUTES.applicant.profile} element={<ApplicantProfilePage />} />
          </Route>
        </Routes>
      </ApplicantAuthProvider>
    </BrowserRouter>
  );
}
