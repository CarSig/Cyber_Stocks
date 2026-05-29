import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import InspectHighlight from './components/common/layout/InspectHighlight';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { TimezoneProvider } from './context/TimezoneContext';
import Navbar from './components/layout/Navbar';
import RouteBoundary from './components/layout/RouteBoundary';
import AdminRouteBoundary from './components/layout/AdminRouteBoundary';
import { ErrorBoundary } from './components/common/feedback/ErrorBoundary';

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
const Intel = lazy(() => import('./pages/Intel'));
const Events = lazy(() => import('./pages/Events'));
const EdgarArchive = lazy(() => import('./pages/EdgarArchive/index'));
const Insiders = lazy(() => import('./pages/Insiders/index'));
const InsidersCompanies = lazy(() => import('./pages/Insiders/CompaniesList'));
const InsidersCompany = lazy(() => import('./pages/Insiders/CompanyInsiders'));
const InsidersAll = lazy(() => import('./pages/Insiders/AllInsiders'));
const InsidersPerson = lazy(() => import('./pages/Insiders/PersonPage'));
const InsidersLeaderboard = lazy(() => import('./pages/Insiders/Leaderboard'));
const Research = lazy(() => import('./pages/Research/index'));
const InsiderIntel = lazy(() => import('./pages/InsiderIntel/index'));
const EdgarUses = lazy(() => import('./pages/Research/EdgarUses'));
const EdgarDeeper = lazy(() => import('./pages/Research/EdgarDeeper'));
const EdgarEntities = lazy(() => import('./pages/Research/EdgarEntities'));
const Edgar8kItems = lazy(() => import('./pages/Research/Edgar8kItems'));
const GovContracts = lazy(() => import('./pages/Research/GovContracts'));
const UsaSpending = lazy(() => import('./pages/Research/UsaSpending'));

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
                          <RouteBoundary name="Home">
                            <Home />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/admin"
                        element={
                          <AdminRouteBoundary name="AdminDashboard">
                            <AdminDashboard />
                          </AdminRouteBoundary>
                        }
                      />
                      <Route
                        path="/admin/audit"
                        element={
                          <AdminRouteBoundary name="AdminAudit">
                            <AdminAudit />
                          </AdminRouteBoundary>
                        }
                      />
                      <Route
                        path="/admin/feedback"
                        element={
                          <AdminRouteBoundary name="AdminFeedback">
                            <AdminFeedback />
                          </AdminRouteBoundary>
                        }
                      />
                      <Route
                        path="/intel"
                        element={
                          <RouteBoundary name="Intel">
                            <Intel />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/threat-intel"
                        element={
                          <RouteBoundary name="ThreatIntel">
                            <ThreatIntel />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/threat-intel/list/kev"
                        element={
                          <RouteBoundary name="ThreatIntelKev">
                            <ThreatIntelKev />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/threat-intel/list/nvd"
                        element={
                          <RouteBoundary name="ThreatIntelNvd">
                            <ThreatIntelNvd />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/threat-intel/list/otx"
                        element={
                          <RouteBoundary name="ThreatIntelOtx">
                            <ThreatIntelOtx />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/threat-intel/list/misp"
                        element={
                          <RouteBoundary name="ThreatIntelMisp">
                            <ThreatIntelMisp />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/socials"
                        element={
                          <RouteBoundary name="Socials">
                            <Socials />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/socials/truth-social"
                        element={
                          <RouteBoundary name="SocialsTruthSocial">
                            <SocialsTruthSocial />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/socials/reddit"
                        element={
                          <RouteBoundary name="SocialsReddit">
                            <SocialsReddit />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/intelligence"
                        element={
                          <RouteBoundary name="Intelligence">
                            <Intelligence />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/cyber-news"
                        element={
                          <RouteBoundary name="CyberNews">
                            <CyberNews />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/events"
                        element={
                          <RouteBoundary name="Events">
                            <Events />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/edgar-archive"
                        element={
                          <RouteBoundary name="EdgarArchive">
                            <EdgarArchive />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/insiders"
                        element={
                          <RouteBoundary name="Insiders">
                            <Insiders />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/insiders/companies"
                        element={
                          <RouteBoundary name="InsidersCompanies">
                            <InsidersCompanies />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/insiders/company/:ticker"
                        element={
                          <RouteBoundary name="InsidersCompany">
                            <InsidersCompany />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/insiders/all"
                        element={
                          <RouteBoundary name="InsidersAll">
                            <InsidersAll />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/insiders/leaderboard"
                        element={
                          <RouteBoundary name="InsidersLeaderboard">
                            <InsidersLeaderboard />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/insiders/person/:personCik"
                        element={
                          <RouteBoundary name="InsidersPerson">
                            <InsidersPerson />
                          </RouteBoundary>
                        }
                      />
                      <Route
                        path="/research"
                        element={
                          <AdminRouteBoundary name="Research">
                            <Research />
                          </AdminRouteBoundary>
                        }
                      />
                      <Route
                        path="/research/insider-intel"
                        element={
                          <AdminRouteBoundary name="InsiderIntel">
                            <InsiderIntel />
                          </AdminRouteBoundary>
                        }
                      />
                      <Route
                        path="/research/edgar-uses"
                        element={
                          <AdminRouteBoundary name="ResearchEdgarUses">
                            <EdgarUses />
                          </AdminRouteBoundary>
                        }
                      />
                      <Route
                        path="/research/edgar-deeper"
                        element={
                          <AdminRouteBoundary name="ResearchEdgarDeeper">
                            <EdgarDeeper />
                          </AdminRouteBoundary>
                        }
                      />
                      <Route
                        path="/research/edgar-entities"
                        element={
                          <AdminRouteBoundary name="ResearchEdgarEntities">
                            <EdgarEntities />
                          </AdminRouteBoundary>
                        }
                      />
                      <Route
                        path="/research/edgar-8k-items"
                        element={
                          <AdminRouteBoundary name="ResearchEdgar8kItems">
                            <Edgar8kItems />
                          </AdminRouteBoundary>
                        }
                      />
                      <Route
                        path="/research/gov-contracts"
                        element={
                          <AdminRouteBoundary name="ResearchGovContracts">
                            <GovContracts />
                          </AdminRouteBoundary>
                        }
                      />
                      <Route
                        path="/research/usa-spending"
                        element={
                          <AdminRouteBoundary name="ResearchUsaSpending">
                            <UsaSpending />
                          </AdminRouteBoundary>
                        }
                      />

                      <Route
                        path="/:ticker"
                        element={
                          <RouteBoundary name="Ticker">
                            <Ticker />
                          </RouteBoundary>
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
