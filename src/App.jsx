import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import Login from "./components/auth/Login.jsx";
import Signup from "./components/auth/Signup.jsx";
import ResetPassword from "./components/auth/ResetPassword.jsx";
import SharedReport from "./components/SharedReport.jsx";
import LegalPage from "./components/legal/LegalPage.jsx";
import AppShell from "./components/AppShell.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// Router root. Public auth routes are open; everything under "/*" requires a
// session and renders the authenticated AppShell (sidebar + views).
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/r/:token" element={<SharedReport />} />
          <Route path="/terms" element={<LegalPage slug="terms" />} />
          <Route path="/privacy" element={<LegalPage slug="privacy" />} />
          <Route path="/refund" element={<LegalPage slug="refund" />} />
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
      </AuthProvider>
    </BrowserRouter>
  );
}
