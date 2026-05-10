import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell.jsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.jsx';
import AuthPage from './pages/AuthPage.jsx';
import CertificationCatalogPage from './pages/CertificationCatalogPage.jsx';
import CertificatesPage from './pages/CertificatesPage.jsx';
import CertificateModerationPage from './pages/CertificateModerationPage.jsx';
import InstitutionalAnalyticsPage from './pages/InstitutionalAnalyticsPage.jsx';
import MentorActivityPage from './pages/MentorActivityPage.jsx';
import MentorCatalogManager from './pages/MentorCatalogManager.jsx';
import MentorDashboard from './pages/MentorDashboard.jsx';
import MentorReviewQueuePage from './pages/MentorReviewQueuePage.jsx';
import PortfolioPage from './pages/PortfolioPage.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import StudentsPage from './pages/StudentsPage.jsx';
import TemplateManager from './pages/TemplateManager.jsx';
import UploadCertificatePage from './pages/UploadCertificatePage.jsx';

function LegacyStudentRedirect() {
  const { pathname } = useLocation();
  const target = pathname.replace('/student', '/dashboard');
  return <Navigate to={target} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/portfolio/:slug" element={<PortfolioPage />} />

      <Route element={<ProtectedRoute roles={['STUDENT', 'MENTOR']} />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<ProtectedRoute roles={['STUDENT']} nested />}>
            <Route index element={<StudentDashboard />} />
            <Route path="catalog" element={<CertificationCatalogPage />} />
            <Route path="upload" element={<UploadCertificatePage />} />
            <Route path="certificates" element={<CertificatesPage />} />
          </Route>

          <Route path="/mentor" element={<ProtectedRoute roles={['MENTOR']} nested />}>
            <Route index element={<Navigate to="/mentor/dashboard" replace />} />
            <Route path="dashboard" element={<MentorDashboard />} />
            <Route path="review" element={<MentorReviewQueuePage />} />
            <Route path="moderation" element={<CertificateModerationPage />} />
            <Route path="analytics" element={<InstitutionalAnalyticsPage />} />
            <Route path="activity" element={<MentorActivityPage />} />
            <Route path="catalog" element={<MentorCatalogManager />} />
            <Route path="templates" element={<TemplateManager />} />
            <Route path="students" element={<StudentsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/student" element={<Navigate to="/dashboard" replace />} />
      <Route path="/student/*" element={<LegacyStudentRedirect />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
