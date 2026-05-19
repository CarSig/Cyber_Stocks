import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import InspectHighlight from './components/common/InspectHighlight';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { TimezoneProvider } from './context/TimezoneContext';
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/routes/ProtectedRoute';
import AdminRoute from './components/routes/AdminRoute';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const Home = lazy(() => import('./pages/Home'));
const Ticker = lazy(() => import('./pages/Ticker/index'));
const AdminAudit = lazy(() => import('./pages/AdminAudit'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminFeedback = lazy(() => import('./pages/AdminFeedback'));
const ThreatIntel = lazy(() => import('./pages/ThreatIntel/index'));
const ThreatIntelKev = lazy(() => import('./pages/ThreatIntel/ThreatIntelKev'));
const ThreatIntelNvd = lazy(() => import('./pages/ThreatIntel/ThreatIntelNvd'));
const ThreatIntelOtx = lazy(() => import('./pages/ThreatIntel/ThreatIntelOtx'));
const ThreatIntelMisp = lazy(() => import('./pages/ThreatIntel/ThreatIntelMisp'));
const Socials = lazy(() => import('./pages/Socials/index'));
const SocialsTruthSocial = lazy(() => import('./pages/Socials/SocialsTruthSocial'));
const SocialsReddit = lazy(() => import('./pages/Socials/SocialsReddit/index'));
const Intelligence = lazy(() => import('./pages/Intelligence/index'));
const CyberNews = lazy(() => import('./pages/CyberNews/index'));
const Events = lazy(() => import('./pages/Events/index'));

export default function App() {
  return (
    <ThemeProvider>
      <TimezoneProvider>
        <AuthProvider>
          <NotificationProvider>
            <BrowserRouter>
              <InspectHighlight />
              <Navbar />
              <main className="app-main">
                <ErrorBoundary>
                <Suspense>
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
                </Suspense>
              </ErrorBoundary>
              </main>
            </BrowserRouter>
          </NotificationProvider>
        </AuthProvider>
      </TimezoneProvider>
    </ThemeProvider>
  );
}
