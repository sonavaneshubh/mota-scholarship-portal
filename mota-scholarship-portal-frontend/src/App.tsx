import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminAuthProvider } from './context/AdminAuthContext';
import { ApplicantAuthProvider } from './context/ApplicantAuthContext';
import { AdminLayout } from './components/admin/AdminLayout';
import { ApplicantLayout } from './components/applicant/ApplicantLayout';
import { SiteLayout } from './components/layout/SiteLayout';
import { ROUTES } from './lib/constants';
import { AboutMota } from './pages/AboutMota';
import { AdminLogin } from './pages/AdminLogin';
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
import { GuidelinesNotices } from './pages/GuidelinesNotices';
import { HelpGrievance } from './pages/HelpGrievance';
import { Home } from './pages/Home';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ScholarshipsFellowships } from './pages/ScholarshipsFellowships';
import { Applications } from './pages/admin/Applications';
import { ApplicationDetails } from './pages/admin/ApplicationDetails';
import { DocumentVerification } from './pages/admin/DocumentVerification';
import { ScholarshipSchemes } from './pages/admin/ScholarshipSchemes';
import { Reports } from './pages/admin/Reports';
import { AdminUsers } from './pages/admin/AdminUsers';
import { Notifications } from './pages/admin/Notifications';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminDashboard } from './pages/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <ApplicantAuthProvider>
          <Routes>
            <Route path={ROUTES.admin.login} element={<AdminLogin />} />
            <Route element={<AdminLayout />}>
              <Route path={ROUTES.admin.dashboard} element={<AdminDashboard />} />
              <Route path={ROUTES.admin.applications} element={<Applications />} />
              <Route path={ROUTES.admin.applicationDetail} element={<ApplicationDetails />} />
              <Route path={ROUTES.admin.documentVerification} element={<DocumentVerification />} />
              <Route path={ROUTES.admin.scholarships} element={<ScholarshipSchemes />} />
              <Route path={ROUTES.admin.reports} element={<Reports />} />
              <Route path={ROUTES.admin.users} element={<AdminUsers />} />
              <Route path={ROUTES.admin.notifications} element={<Notifications />} />
              <Route path={ROUTES.admin.settings} element={<AdminSettings />} />
            </Route>

            <Route element={<SiteLayout />}>
              <Route path={ROUTES.home} element={<Home />} />
              <Route path={ROUTES.aboutMota} element={<AboutMota />} />
              <Route path={ROUTES.scholarshipsFellowships} element={<ScholarshipsFellowships />} />
              <Route path={ROUTES.guidelinesNotices} element={<GuidelinesNotices />} />
              <Route path={ROUTES.helpGrievance} element={<HelpGrievance />} />
              <Route path={ROUTES.applicant.login} element={<Home />} />
              <Route path={ROUTES.applicant.register} element={<Home />} />
              <Route path={ROUTES.resetPassword} element={<ResetPasswordPage />} />
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

            <Route path="*" element={<Navigate replace to={ROUTES.home} />} />
          </Routes>
        </ApplicantAuthProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}

