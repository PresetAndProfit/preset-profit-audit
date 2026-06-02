import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import Login from "./components/auth/Login.jsx";
import Signup from "./components/auth/Signup.jsx";
import ResetPassword from "./components/auth/ResetPassword.jsx";
import SharedReport from "./components/SharedReport.jsx";
import PublicAudit from "./components/PublicAudit.jsx";
import LegalPage from "./components/legal/LegalPage.jsx";
import AppShell from "./components/AppShell.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { Home, About, Methodology, SampleReport, Faq, Contact, Pricing } from "./marketing/index.jsx";

// Auth-aware root. Logged-OUT visitors get the premium public marketing home;
// logged-IN users get the application exactly as before (AppShell at "/").
// This preserves the existing authenticated experience while giving cold
// visitors a real homepage instead of a redirect to /login.
function RootRoute() {
  const { session, loading } = useAuth();
  if (loading) return null;
  return session ? (
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  ) : (
    <Home />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Router root. Public marketing pages (premium serif/gold) and the public auth/
// audit/legal routes are open. Everything else under "/*" requires a session and
// renders the authenticated AppShell (mono/amber) — unchanged.
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
        <Routes>
          {/* Public marketing */}
          <Route path="/" element={<RootRoute />} />
          <Route path="/about" element={<About />} />
          <Route path="/methodology" element={<Methodology />} />
          <Route path="/sample-report" element={<SampleReport />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/pricing" element={<Pricing />} />

          {/* Public auth / audit / legal (existing) */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/r/:token" element={<SharedReport />} />
          <Route path="/audit" element={<PublicAudit />} />
          <Route path="/terms" element={<LegalPage slug="terms" />} />
          <Route path="/privacy" element={<LegalPage slug="privacy" />} />
          <Route path="/refund" element={<LegalPage slug="refund" />} />

          {/* Authenticated application (unchanged) */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
