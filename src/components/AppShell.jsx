import { useState, useEffect } from "react";
import GlobalStyles from "./GlobalStyles.jsx";
import Dashboard from "./Dashboard.jsx";
import AuditScanner from "./AuditScanner.jsx";
import ReportView from "./ReportView.jsx";
import RoadmapView from "./RoadmapView.jsx";
import OutreachView from "./OutreachView.jsx";
import MarketplaceView from "./MarketplaceView.jsx";
import AgencyConsole from "./AgencyConsole.jsx";
import ServicesView from "./ServicesView.jsx";
import LeadsView from "./LeadsView.jsx";
import IntelligencePanel from "./IntelligencePanel.jsx";
import AccountView from "./AccountView.jsx";
import AdminView from "./AdminView.jsx";
import UpgradeButton from "./UpgradeButton.jsx";
import { Tag } from "./ui/index.jsx";
import { useAudits } from "../lib/storage.js";
import { useAuth } from "../context/AuthContext.jsx";
import { computeUsage } from "../lib/usage.js";
import { authedJson } from "../lib/api.js";
import { stampStage } from "../lib/pipeline.js";
import { conversionState } from "../lib/conversion.js";

const NAV = [
  { id: "dashboard",     label: "Dashboard",    icon: "◈" },
  { id: "scan",          label: "New Audit",    icon: "⊕" },
  { id: "leads",         label: "Sales Pipeline",icon: "◎" },
  { id: "marketplace",   label: "Marketplace",  icon: "▣" },
  { id: "intelligence",  label: "Intelligence", icon: "◆" },
  { id: "services",      label: "Services",     icon: "◇" },
  { id: "account",       label: "Account",      icon: "⊚" },
];

// Shown in place of the scanner when the user has hit their plan's audit limit.
// Value-anchored: leads with the pipeline the user has already built, then offers
// a one-click upgrade straight to Stripe (no detour through the plans page).
function UpgradePanel({ plan, audits = [], usage, onAccount }) {
  const conv = conversionState(audits, plan, usage || { atLimit: true });
  const offer = conv.upgrade || { headline: `You've used your ${plan.name} audit.`, sub: "Upgrade for unlimited audits and the full pipeline.", planId: "professional" };
  return (
    <div className="page-pad" style={{ maxWidth: 560, margin: "0 auto", animation: "fadeUp .4s ease" }}>
      <div style={{ background: "var(--panel)", border: "1px solid var(--amber)", borderRadius: 10, padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 12 }}>🚀</div>
        <h1 style={{ fontFamily: "Syne", fontSize: 21, fontWeight: 800, marginBottom: 10, lineHeight: 1.3 }}>{offer.headline}</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 22, lineHeight: 1.7 }}>{offer.sub}</p>
        <UpgradeButton planId={offer.planId}>Go Unlimited — $49/mo →</UpgradeButton>
        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>14-day free trial · cancel anytime</div>
        <div style={{ marginTop: 16 }}>
          <button onClick={onAccount} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12, textDecoration: "underline", fontFamily: "IBM Plex Mono" }}>Compare all plans →</button>
        </div>
      </div>
    </div>
  );
}

// Full-screen maintenance gate shown to non-admins when maintenance mode is on.
function MaintenanceScreen({ onSignOut }) {
  return (
    <>
      <GlobalStyles />
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg, #0a0a0f)" }}>
        <div style={{ maxWidth: 440, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🛠️</div>
          <h1 style={{ fontFamily: "Syne", fontSize: 24, fontWeight: 800, marginBottom: 10 }}>We'll be right back</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
            Preset &amp; Profit is undergoing scheduled maintenance. Your data is safe — please check back shortly.
          </p>
          <button onClick={onSignOut} style={{ background: "transparent", border: "1px solid var(--border-bright)", borderRadius: 6, color: "var(--muted)", padding: "8px 16px", cursor: "pointer", fontFamily: "IBM Plex Mono", fontSize: 12 }}>Sign out</button>
        </div>
      </div>
    </>
  );
}

export default function AppShell() {
  const { user, profile, plan, subscription, signOut } = useAuth();
  const { audits, save, remove, updateDeal, startActivation } = useAudits();

  // Admin = profile flag OR the owner email (mirrors the server allowlist).
  const isAdmin = !!profile?.is_admin || (user?.email || "").toLowerCase() === "justin@presetprofit.com";

  // System status (maintenance mode etc.) — public booleans, polled once.
  const [sys, setSys] = useState(null);
  useEffect(() => {
    let active = true;
    fetch("/api/system/status").then((r) => r.json()).then((d) => { if (active) setSys(d); }).catch(() => {});
    return () => { active = false; };
  }, []);

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

  // Keep the active deal in sync with the audits list so stage stamps + CRM
  // edits made anywhere reflect immediately in the report/roadmap/outreach views.
  const liveReport = report ? audits.find(a => a.id === report.id) || report : null;

  const openReport = audit => {
    setReport(audit);
    setView("report");
  };

  // Pipeline transitions — each engine entry stamps the deal forward.
  const openRoadmapFor = audit => {
    setReport(audit);
    setView("roadmap");
    if (audit) stampStage(updateDeal, audit, "roadmap", { detail: "roadmap opened" });
  };
  const openOutreachFor = audit => {
    setReport(audit);
    setView("outreach");
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

  // Booking/CTA identity — every plan. Threads the operator's real booking link
  // and contact into outreach copy and the proposal's "Book the call" button, so
  // every artifact drives a trackable booked call (the funnel's money event).
  const cta = {
    calendarUrl: profile?.calendar_url || null,
    contactEmail: user?.email || null,
    senderName: profile?.full_name || null,
    senderCompany: (branding && branding.name) || profile?.company_name || null,
  };

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

  // Maintenance gate — non-admins see the maintenance screen (all hooks above ran).
  if (sys?.maintenance && !isAdmin) return <MaintenanceScreen onSignOut={signOut} />;

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
          {[
            ...NAV,
            ...(plan.whiteLabel ? [{ id: "agency", label: "Agency Console", icon: "❖" }] : []),
            ...(isAdmin ? [{ id: "admin", label: "Admin", icon: "⚙" }] : []),
          ].map(item => {
            // A deal opened from the pipeline keeps "Sales Pipeline" active across
            // its report/roadmap/outreach sub-views; a fresh scan stays under Dashboard.
            const dealViews = view === "report" || view === "roadmap" || view === "outreach";
            const isActive = view === item.id || (dealViews && item.id === "leads");
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
            plan={plan}
            usage={usage}
            onAccount={() => go("account")}
            onPipeline={() => go("leads")}
          />
        )}

        {view === "scan" && (
          usage.atLimit
            ? <UpgradePanel plan={plan} audits={audits} usage={usage} onAccount={() => go("account")} />
            : <AuditScanner
                onComplete={handleScanComplete}
                onScanStart={() => setScanning(true)}
                onScanEnd={() => setScanning(false)}
              />
        )}

        {view === "report" && liveReport && (
          <ReportView
            report={liveReport}
            onBack={() => go("dashboard")}
            onSave={handleSaveAudit}
            isAlreadySaved={audits.some(a => a.id === liveReport.id)}
            branding={branding}
            watermark={plan.watermark}
            onShare={plan.shareLinks ? handleShare : null}
            onGenerateRoadmap={openRoadmapFor}
          />
        )}

        {view === "roadmap" && liveReport && (
          <RoadmapView
            report={liveReport}
            onBack={() => setView("report")}
            branding={branding}
            watermark={plan.watermark}
            updateDeal={updateDeal}
            cta={cta}
            onGenerateOutreach={() => openOutreachFor(liveReport)}
          />
        )}

        {view === "outreach" && liveReport && (
          <OutreachView
            report={liveReport}
            onBack={() => setView("roadmap")}
            branding={branding}
            updateDeal={updateDeal}
            cta={cta}
            onStartActivation={startActivation}
          />
        )}

        {view === "leads" && (
          <LeadsView
            audits={audits}
            updateDeal={updateDeal}
            onViewReport={openReport}
            onViewRoadmap={openRoadmapFor}
            onViewOutreach={openOutreachFor}
            onDeleteAudit={handleDeleteAudit}
            onStartActivation={startActivation}
          />
        )}

        {view === "marketplace" && (
          <MarketplaceView audits={audits} plan={plan} onPipeline={() => go("leads")} />
        )}

        {view === "agency" && plan.whiteLabel && (
          <AgencyConsole
            audits={audits}
            updateDeal={updateDeal}
            branding={branding}
            onViewReport={openReport}
            onViewRoadmap={openRoadmapFor}
            onShare={handleShare}
          />
        )}

        {view === "intelligence" && (
          <IntelligencePanel audits={audits} />
        )}

        {view === "services" && <ServicesView onMarketplace={() => go("marketplace")} />}

        {view === "account" && <AccountView audits={audits} />}

        {view === "admin" && isAdmin && <AdminView />}
      </div>
    </div>
  );
}
