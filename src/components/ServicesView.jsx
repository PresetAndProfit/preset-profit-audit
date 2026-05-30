import { SERVICE_PACKAGES } from "../lib/constants.js";

export default function ServicesView() {
  return (
    <div className="page-pad" style={{ animation: "fadeUp .4s ease" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 11, color: "var(--amber)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Preset &amp; Profit</div>
        <h1 style={{ fontFamily: "Syne", fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>Automation Services &amp; Packages</h1>
        <p style={{ color: "var(--muted)", marginTop: 8, fontSize: 14, maxWidth: 500, margin: "8px auto 0" }}>Done-for-you business automation. We build the systems; you collect the revenue.</p>
      </div>

      <div className="pricing-grid">
        {SERVICE_PACKAGES.map(pkg => (
          <div key={pkg.name} style={{
            background: "var(--panel)", border: `1px solid ${pkg.highlight ? pkg.color : "var(--border)"}`,
            borderRadius: 12, padding: "28px 24px", position: "relative",
            boxShadow: pkg.highlight ? `0 0 40px ${pkg.color}20` : "none",
          }}>
            {pkg.highlight && (
              <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: pkg.color, color: "var(--ink)", padding: "4px 14px", borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>{pkg.tag}</div>
            )}
            <div style={{ fontSize: 10, color: pkg.color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>{pkg.tag}</div>
            <div style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{pkg.name}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 16 }}>
              <span style={{ fontFamily: "Syne", fontSize: 38, fontWeight: 800, color: pkg.color }}>{pkg.price}</span>
              <span style={{ color: "var(--muted)", fontSize: 13 }}>{pkg.priceNote}</span>
            </div>
            <div style={{ borderTop: "1px solid var(--border)", margin: "0 0 16px" }} />
            <div style={{ display: "grid", gap: 10, marginBottom: 24 }}>
              {pkg.deliverables.map(d => (
                <div key={d} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13 }}>
                  <span style={{ color: pkg.color, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span>{d}</span>
                </div>
              ))}
            </div>
            <div>
              <a
                href="https://presetandprofit.com/call"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block", width: "100%", padding: 11, borderRadius: 6, cursor: "pointer",
                  fontFamily: "IBM Plex Mono", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em",
                  transition: "all .2s", border: `1px solid ${pkg.color}`,
                  background: pkg.highlight ? pkg.color : "transparent",
                  color: pkg.highlight ? "var(--ink)" : pkg.color,
                  textAlign: "center", textDecoration: "none", boxSizing: "border-box",
                }}
              >{pkg.cta}</a>
              <div style={{ textAlign: "center", fontSize: 10, color: "var(--muted)", marginTop: 8, letterSpacing: "0.05em" }}>
                FREE STRATEGY CALL · NO OBLIGATION
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 980, margin: "28px auto 0", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: "20px 28px", display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontSize: 28 }}>🛡</div>
        <div>
          <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Results-First Guarantee</div>
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>Every setup includes a 30-day check-in. If the automation isn&apos;t working, we fix it at no charge. We don&apos;t consider a project done until you see results.</div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 24, color: "var(--muted)", fontSize: 12 }}>
        Questions? Email <span style={{ color: "var(--amber)" }}>hello@presetandprofit.com</span> · All projects start with a free strategy call
      </div>
    </div>
  );
}
