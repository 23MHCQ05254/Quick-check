import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell.jsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.jsx';
import AuthPage from './pages/AuthPage.jsx';
import CertificationCatalogPage from './pages/CertificationCatalogPage.jsx';
import CertificatesPage from './pages/CertificatesPage.jsx';
import MentorCatalogManager from './pages/MentorCatalogManager.jsx';
import MentorDashboard from './pages/MentorDashboard.jsx';
import PortfolioPage from './pages/PortfolioPage.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import StudentsPage from './pages/StudentsPage.jsx';
import TemplateManager from './pages/TemplateManager.jsx';
import UploadCertificatePage from './pages/UploadCertificatePage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/portfolio/:slug" element={<PortfolioPage />} />

      <Route element={<ProtectedRoute roles={['STUDENT', 'MENTOR']} />}>
        <Route element={<AppShell />}>
          <Route path="/student" element={<ProtectedRoute roles={['STUDENT']} nested />}>
            <Route index element={<StudentDashboard />} />
            <Route path="catalog" element={<CertificationCatalogPage />} />
            <Route path="upload" element={<UploadCertificatePage />} />
            <Route path="certificates" element={<CertificatesPage />} />
          </Route>

          <Route path="/mentor" element={<ProtectedRoute roles={['MENTOR']} nested />}>
            <Route index element={<MentorDashboard />} />
            <Route path="catalog" element={<MentorCatalogManager />} />
            <Route path="templates" element={<TemplateManager />} />
            <Route path="students" element={<StudentsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
