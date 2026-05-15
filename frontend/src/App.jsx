import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import Navbar from './components/organisms/layout/Navbar.jsx';
import ProtectedRoute from './components/molecules/routes/ProtectedRoute.jsx';
import AdminRoute from './components/molecules/routes/AdminRoute.jsx';
import Home from './pages/Home.jsx';
import Ticker from './pages/Ticker/index.jsx';
import AdminAudit from './pages/AdminAudit.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ThreatIntel from './pages/ThreatIntel/index.jsx';
import ThreatIntelKev from './pages/ThreatIntel/ThreatIntelKev.jsx';
import ThreatIntelNvd from './pages/ThreatIntel/ThreatIntelNvd.jsx';
import ThreatIntelOtx from './pages/ThreatIntel/ThreatIntelOtx.jsx';
import ThreatIntelMisp from './pages/ThreatIntel/ThreatIntelMisp.jsx';
import Socials from './pages/Socials/index.jsx';
import SocialsTruthSocial from './pages/Socials/SocialsTruthSocial.jsx';
import SocialsReddit from './pages/Socials/SocialsReddit/index.jsx';
import Intelligence from './pages/Intelligence/index.jsx';
import CyberNews from './pages/CyberNews/index.jsx';
import Alpaca from './pages/Alpaca/index.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <BrowserRouter>
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
                  path="/alpaca"
                  element={
                    <ProtectedRoute>
                      <Alpaca />
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
