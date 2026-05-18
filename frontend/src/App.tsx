import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import InspectHighlight from './components/atoms/InspectHighlight';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/organisms/layout/Navbar';
import ProtectedRoute from './components/molecules/routes/ProtectedRoute';
import AdminRoute from './components/molecules/routes/AdminRoute';
import Home from './pages/Home';
import Ticker from './pages/Ticker/index';
import AdminAudit from './pages/AdminAudit';
import AdminDashboard from './pages/AdminDashboard';
import AdminFeedback from './pages/AdminFeedback';
import ThreatIntel from './pages/ThreatIntel/index';
import ThreatIntelKev from './pages/ThreatIntel/ThreatIntelKev';
import ThreatIntelNvd from './pages/ThreatIntel/ThreatIntelNvd';
import ThreatIntelOtx from './pages/ThreatIntel/ThreatIntelOtx';
import ThreatIntelMisp from './pages/ThreatIntel/ThreatIntelMisp';
import Socials from './pages/Socials/index';
import SocialsTruthSocial from './pages/Socials/SocialsTruthSocial';
import SocialsReddit from './pages/Socials/SocialsReddit/index';
import Intelligence from './pages/Intelligence/index';
import CyberNews from './pages/CyberNews/index';
import Events from './pages/Events/index';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
            <InspectHighlight />
            <Navbar />
            <main className="app-main">
              <Routes>
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Home />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/audit"
                  element={
                    <AdminRoute>
                      <AdminAudit />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/feedback"
                  element={
                    <AdminRoute>
                      <AdminFeedback />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/threat-intel"
                  element={
                    <ProtectedRoute>
                      <ThreatIntel />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/threat-intel/list/kev"
                  element={
                    <ProtectedRoute>
                      <ThreatIntelKev />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/threat-intel/list/nvd"
                  element={
                    <ProtectedRoute>
                      <ThreatIntelNvd />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/threat-intel/list/otx"
                  element={
                    <ProtectedRoute>
                      <ThreatIntelOtx />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/threat-intel/list/misp"
                  element={
                    <ProtectedRoute>
                      <ThreatIntelMisp />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/socials"
                  element={
                    <ProtectedRoute>
                      <Socials />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/socials/truth-social"
                  element={
                    <ProtectedRoute>
                      <SocialsTruthSocial />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/socials/reddit"
                  element={
                    <ProtectedRoute>
                      <SocialsReddit />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/intelligence"
                  element={
                    <ProtectedRoute>
                      <Intelligence />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cyber-news"
                  element={
                    <ProtectedRoute>
                      <CyberNews />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/events"
                  element={
                    <ProtectedRoute>
                      <Events />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/:ticker"
                  element={
                    <ProtectedRoute>
                      <Ticker />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
