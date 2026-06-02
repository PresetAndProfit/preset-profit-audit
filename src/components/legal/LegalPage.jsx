import { useParams, Link } from "react-router-dom";
import GlobalStyles from "../GlobalStyles.jsx";
import { LEGAL_DOCS, COMPANY } from "../../lib/legalContent.js";

// Public legal pages at /terms, /privacy, /refund. Content lives in
// src/lib/legalContent.js (fill the {{PLACEHOLDERS}} before launch).
export default function LegalPage({ slug: slugProp }) {
  const params = useParams();
  const slug = slugProp || params.slug;
  const doc = LEGAL_DOCS[slug];

  if (!doc) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--ink)", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "IBM Plex Mono" }}>
        <GlobalStyles />
        Not found. <Link to="/" style={{ color: "var(--amber)", marginLeft: 6 }}>Home</Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--ink)", color: "var(--text)" }}>
      <GlobalStyles />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "40px 20px 80px" }}>
        <Link to="/" style={{ fontSize: 12, color: "var(--muted)", fontFamily: "IBM Plex Mono", textDecoration: "none" }}>← Back</Link>
        <h1 style={{ fontFamily: "Sora", fontSize: 28, fontWeight: 800, margin: "16px 0 4px" }}>{doc.title}</h1>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 28 }}>
          {COMPANY.product} · Effective {COMPANY.effectiveDate}
        </div>
        {doc.sections.map(([heading, body]) => (
          <div key={heading} style={{ marginBottom: 22 }}>
            <h2 style={{ fontFamily: "Sora", fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{heading}</h2>
            <p style={{ fontSize: 13, lineHeight: 1.7, color: "var(--muted)" }}>{body}</p>
          </div>
        ))}
        <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--muted)" }}>
          <Link to="/terms" style={{ color: "var(--amber)", marginRight: 16 }}>Terms</Link>
          <Link to="/privacy" style={{ color: "var(--amber)", marginRight: 16 }}>Privacy</Link>
          <Link to="/refund" style={{ color: "var(--amber)" }}>Refund & Cancellation</Link>
        </div>
      </div>
    </div>
  );
}
