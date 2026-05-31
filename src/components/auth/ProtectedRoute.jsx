import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

// Gate for authenticated areas. While the session is resolving we show a
// lightweight loader; once resolved, no session → redirect to /login
// (preserving where the user was headed so login can send them back).
export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--ink)", color: "var(--muted)", fontFamily: "IBM Plex Mono", fontSize: 12,
        letterSpacing: "0.1em",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--amber)", animation: "pulse-amber 1s infinite" }} />
          LOADING…
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
