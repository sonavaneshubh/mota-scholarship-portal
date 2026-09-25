import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { SiteLayout } from './components/layout/SiteLayout';
import { ROUTES } from './lib/constants';
import { AdminLogin } from './pages/AdminLogin';
import { ApplicantLogin } from './pages/ApplicantLogin';
import { ApplicantRegistration } from './pages/ApplicantRegistration';
import { Home } from './pages/Home';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path={ROUTES.home} element={<Home />} />
          <Route path={ROUTES.applicant.login} element={<ApplicantLogin />} />
          <Route path={ROUTES.applicant.register} element={<ApplicantRegistration />} />
          <Route path={ROUTES.admin.login} element={<AdminLogin />} />
          <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}