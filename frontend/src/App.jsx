import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./context/AuthContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import Navbar from "./components/organisms/Navbar.jsx";
import ProtectedRoute from "./components/molecules/ProtectedRoute.jsx";
import AdminRoute from "./components/molecules/AdminRoute.jsx";
import Home from "./pages/Home.jsx";
import Ticker from "./pages/Ticker.jsx";
import AdminAudit from "./pages/AdminAudit.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ThreatIntel from "./pages/ThreatIntel.jsx";
import ThreatIntelKev from "./pages/ThreatIntelKev.jsx";
import ThreatIntelNvd from "./pages/ThreatIntelNvd.jsx";
import ThreatIntelOtx from "./pages/ThreatIntelOtx.jsx";
import ThreatIntelMisp from "./pages/ThreatIntelMisp.jsx";
import Socials from "./pages/Socials.jsx";
import SocialsTruthSocial from "./pages/SocialsTruthSocial.jsx";
import SocialsReddit from "./pages/SocialsReddit.jsx";
import Intelligence2 from "./pages/Intelligence2.jsx";

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Navbar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/audit" element={<AdminRoute><AdminAudit /></AdminRoute>} />
              <Route path="/threat-intel" element={<ProtectedRoute><ThreatIntel /></ProtectedRoute>} />
              <Route path="/threat-intel/list/kev" element={<ProtectedRoute><ThreatIntelKev /></ProtectedRoute>} />
              <Route path="/threat-intel/list/nvd" element={<ProtectedRoute><ThreatIntelNvd /></ProtectedRoute>} />
              <Route path="/threat-intel/list/otx" element={<ProtectedRoute><ThreatIntelOtx /></ProtectedRoute>} />
              <Route path="/threat-intel/list/misp" element={<ProtectedRoute><ThreatIntelMisp /></ProtectedRoute>} />
              <Route path="/socials" element={<ProtectedRoute><Socials /></ProtectedRoute>} />
              <Route path="/socials/truth-social" element={<ProtectedRoute><SocialsTruthSocial /></ProtectedRoute>} />
              <Route path="/socials/reddit" element={<ProtectedRoute><SocialsReddit /></ProtectedRoute>} />
              <Route path="/intelligence" element={<ProtectedRoute><Intelligence2 /></ProtectedRoute>} />
              <Route path="/:ticker" element={<ProtectedRoute><Ticker /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
