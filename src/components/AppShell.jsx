import { useState } from "react";
import GlobalStyles from "./GlobalStyles.jsx";
import Dashboard from "./Dashboard.jsx";
import AuditScanner from "./AuditScanner.jsx";
import ReportView from "./ReportView.jsx";
import ServicesView from "./ServicesView.jsx";
import LeadsView from "./LeadsView.jsx";
import IntelligencePanel from "./IntelligencePanel.jsx";
import AccountView from "./AccountView.jsx";
import AdminView from "./AdminView.jsx";
import { Btn, Tag } from "./ui/index.jsx";
import { useAudits } from "../lib/storage.js";
import { useAuth } from "../context/AuthContext.jsx";
import { computeUsage } from "../lib/usage.js";
import { authedJson } from "../lib/api.js";

const NAV = [
  { id: "dashboard",     label: "Dashboard",    icon: "◈" },
  { id: "scan",          label: "New Audit",    icon: "⊕" },
  { id: "leads",         label: "Lead Pipeline",icon: "◎" },
  { id: "intelligence",  label: "Intelligence", icon: "◆" },
  { id: "services",      label: "Services",     icon: "◇" },
  { id: "account",       label: "Account",      icon: "⊚" },
];

// Shown in place of the scanner when the user has hit their plan's audit limit.
function UpgradePanel({ plan, onAccount }) {
  return (
    <div className="page-pad" style={{ maxWidth: 560, margin: "0 auto", animation: "fadeUp .4s ease" }}>
      <div style={{ background: "var(--panel)", border: "1px solid var(--amber)", borderRadius: 10, padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>🔒</div>
        <h1 style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>You've used your {plan.name} audits</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
          The {plan.name} plan includes {plan.auditLimit} audit{plan.auditLimit !== 1 ? "s" : ""}
          {plan.period === "month" ? " per month" : ""}. Upgrade to run more and unlock un-watermarked
          reports and score tracking.
        </p>
        <Btn onClick={onAccount}>View plans →</Btn>
      </div>
    </div>
  );
}

export default function AppShell() {
  const { user, profile, plan, subscription, signOut } = useAuth();
  const { audits, save, remove } = useAudits();

  // Land on the Account view when returning from Stripe Checkout / billing
  // portal (success_url & return_url carry ?checkout= or ?view=account).
  const [view, setView]   = useState(() => {
    if (typeof window === "undefined") return "dashboard";
    const p = new URLSearchParams(window.location.search);
    return (p.get("checkout") || p.get("view") === "account") ? "account" : "dashboard";
  });
  const [report, setReport] = useState(null);
  const [open, setOpen]   = useState(false);
  const [scanning, setScanning] = useState(false);

  const usage = computeUsage(audits, plan, subscription);

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

  // White-label branding for Agency reports (from the user's profile).
  const branding = plan.whiteLabel
    ? { name: profile?.company_name || null, logoUrl: profile?.brand_logo_url || null, color: profile?.brand_color || null }
    : null;

  // Agency-only share-link generator passed into ReportView.
  const handleShare = async (audit) => {
    const { ok, json } = await authedJson("/api/share/create", { body: { auditId: audit.id } });
    return ok ? json?.url : null;
  };

  const handleDeleteAudit = id => {
    remove(id);
    if (report && report.id === id) {
      setReport(null);
      setView("dashboard");
    }
  };

  const usagePct = usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;

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
          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, letterSpacing: "0.08em" }}>BUSINESS AUDIT PLATFORM</div>
        </div>

        <nav style={{ padding: "12px 10px", flex: 1 }}>
          {(profile?.is_admin ? [...NAV, { id: "admin", label: "Admin", icon: "⚙" }] : NAV).map(item => {
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

        {/* Plan + usage + account */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Tag color="var(--amber)">{plan.name}</Tag>
            <span style={{ fontSize: 10, color: scanning ? "var(--amber)" : "var(--green)", letterSpacing: "0.06em" }}>
              {scanning ? "SCANNING…" : "READY"}
            </span>
          </div>
          <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>
            {usage.unlimited
              ? `${usage.used} audit${usage.used !== 1 ? "s" : ""} · Unlimited`
              : `${usage.used} / ${usage.limit} audit${usage.limit !== 1 ? "s" : ""} used${usage.period === "month" ? " this month" : ""}`}
          </div>
          <div style={{ height: 3, background: "var(--surface)", borderRadius: 2, marginBottom: 12 }}>
            <div style={{ height: "100%", width: usage.unlimited ? "100%" : `${usagePct}%`, background: usage.unlimited ? "var(--green)" : usage.atLimit ? "var(--red)" : "var(--amber)", borderRadius: 2, transition: "width .5s ease" }} />
          </div>
          <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profile?.full_name || user?.email}
          </div>
          <button onClick={signOut} style={{
            width: "100%", background: "transparent", border: "1px solid var(--border-bright)",
            borderRadius: 6, color: "var(--muted)", padding: "7px 10px", cursor: "pointer",
            fontFamily: "IBM Plex Mono", fontSize: 11, letterSpacing: "0.04em",
          }}>Sign out</button>
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
          usage.atLimit
            ? <UpgradePanel plan={plan} onAccount={() => go("account")} />
            : <AuditScanner
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
            branding={branding}
            watermark={plan.watermark}
            onShare={plan.shareLinks ? handleShare : null}
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

        {view === "account" && <AccountView audits={audits} />}

        {view === "admin" && profile?.is_admin && <AdminView />}
      </div>
    </div>
  );
}
