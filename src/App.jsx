import { useState } from "react";
import GlobalStyles from "./components/GlobalStyles.jsx";
import Dashboard from "./components/Dashboard.jsx";
import AuditScanner from "./components/AuditScanner.jsx";
import ReportView from "./components/ReportView.jsx";
import ServicesView from "./components/ServicesView.jsx";
import LeadsView from "./components/LeadsView.jsx";
import IntelligencePanel from "./components/IntelligencePanel.jsx";
import { useAudits } from "./lib/storage.js";

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND NOTE: When you're ready to add AI, create POST /api/generate-audit
// on your server. Store your API key in process.env.ANTHROPIC_API_KEY there.
// The frontend currently uses a fully client-side audit engine (no backend needed).
// ─────────────────────────────────────────────────────────────────────────────

const NAV = [
  { id: "dashboard",     label: "Dashboard",    icon: "◈" },
  { id: "scan",          label: "New Audit",    icon: "⊕" },
  { id: "leads",         label: "Lead Pipeline",icon: "◎" },
  { id: "intelligence",  label: "Intelligence", icon: "◆" },
  { id: "services",      label: "Services",     icon: "◇" },
];

export default function App() {
  const { audits, save, remove } = useAudits();
  const [view, setView]       = useState("dashboard");
  const [report, setReport]   = useState(null);
  const [open, setOpen]       = useState(false);
  const [scanning, setScanning] = useState(false);

  const go = v => { setView(v); setOpen(false); };

  const openReport = audit => {
    setReport(audit);
    setView("report");
  };

  const handleScanComplete = r => {
    save(r);          // auto-save immediately — never lose a completed audit
    setReport(r);
    setView("report");
  };

  const handleSaveAudit = r => save(r);

  const handleDeleteAudit = id => {
    remove(id);
    if (report && report.id === id) {
      setReport(null);
      setView("dashboard");
    }
  };

  const used = audits.length;

  return (
    <div className="main-layout">
      <GlobalStyles />

      {/* Mobile top bar */}
      <div className="mobile-bar" style={{ position: "fixed", top: 0, left: 0, right: 0, height: 52, background: "var(--panel)", borderBottom: "1px solid var(--border)", zIndex: 30, alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
        <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 16 }}>
          <span style={{ color: "var(--amber)" }}>PRESET</span>
          <span style={{ color: "var(--text)" }}>&amp;PROFIT</span>
        </div>
        <button onClick={() => setOpen(o => !o)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", padding: "6px 10px", cursor: "pointer", fontSize: 16 }}>☰</button>
      </div>

      {open && <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 19 }} />}

      {/* Sidebar */}
      <div className={`sidebar${open ? " open" : ""}`}>
        <div style={{ padding: "24px 20px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 16, letterSpacing: "-0.02em" }}>
            <span style={{ color: "var(--amber)" }}>PRESET</span>
            <span style={{ color: "var(--text)" }}>&amp;PROFIT</span>
          </div>
          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, letterSpacing: "0.08em" }}>FREE BUSINESS REPORTS</div>
        </div>

        <nav style={{ padding: "12px 10px", flex: 1 }}>
          {NAV.map(item => {
            // When viewing a report, treat "dashboard" as the active parent
            const isActive = view === item.id || (view === "report" && item.id === "dashboard");
            return (
              <button
                key={item.id}
                onClick={() => { setReport(null); go(item.id); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                  background: isActive ? "var(--amber-glow)" : "transparent",
                  color: isActive ? "var(--amber)" : "var(--muted)",
                  fontFamily: "IBM Plex Mono", fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  marginBottom: 2, textAlign: "left", letterSpacing: "0.02em",
                  borderLeft: isActive ? "2px solid var(--amber)" : "2px solid transparent",
                  transition: "all .15s",
                }}
              >
                <span style={{ fontSize: 14 }}>{item.icon}</span>{item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: scanning ? "var(--amber)" : "var(--green)",
              animation: scanning ? "pulse-amber 1s infinite" : "none",
            }} />
            <span style={{ fontSize: 10, color: scanning ? "var(--amber)" : "var(--green)", letterSpacing: "0.08em" }}>
              {scanning ? "SCANNING…" : "SYSTEM READY"}
            </span>
          </div>
          <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>{used} audit{used !== 1 ? "s" : ""} saved locally</div>
          <div style={{ height: 3, background: "var(--surface)", borderRadius: 2 }}>
            <div style={{ height: "100%", width: `${Math.min(100, used * 4)}%`, background: "var(--amber)", borderRadius: 2, transition: "width .5s ease" }} />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        <style>{`@media(max-width:640px){.main-content{padding-top:52px!important}}`}</style>

        {view === "dashboard" && (
          <Dashboard
            audits={audits}
            onScan={() => go("scan")}
            onViewReport={openReport}
            onDeleteAudit={handleDeleteAudit}
          />
        )}

        {view === "scan" && (
          <AuditScanner
            onComplete={handleScanComplete}
            onScanStart={() => setScanning(true)}
            onScanEnd={() => setScanning(false)}
          />
        )}

        {view === "report" && report && (
          <ReportView
            report={report}
            onBack={() => go("dashboard")}
            onSave={handleSaveAudit}
            isAlreadySaved={audits.some(a => a.id === report.id)}
          />
        )}

        {view === "leads" && (
          <LeadsView
            audits={audits}
            onViewReport={openReport}
            onDeleteAudit={handleDeleteAudit}
          />
        )}

        {view === "intelligence" && (
          <IntelligencePanel audits={audits} />
        )}

        {view === "services" && <ServicesView />}
      </div>
    </div>
  );
}
