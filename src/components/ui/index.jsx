import { useState } from "react";

export function ScoreRing({ score, size = 64, stroke = 5 }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const color = score >= 80 ? "#00d68f" : score >= 60 ? "#f5a623" : "#ff4757";
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)} strokeLinecap="round"
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 1.2s ease" }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fill={color} fontSize={size * 0.22} fontFamily="IBM Plex Mono" fontWeight="600">{score}</text>
    </svg>
  );
}

export function Tag({ children, color }) {
  return (
    <span style={{
      fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600,
      padding: "3px 8px", borderRadius: 3, border: `1px solid ${color}40`, color,
      background: `${color}12`,
    }}>{children}</span>
  );
}

export function StatCard({ label, value, delta, accent }) {
  return (
    <div style={{
      background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8,
      padding: "20px 24px", position: "relative", overflow: "hidden",
    }}>
      <div style={{ width: 2, height: "100%", background: accent, position: "absolute", left: 0, top: 0, borderRadius: "4px 0 0 4px" }} />
      <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "Syne", color: "var(--text)" }}>{value}</div>
      {delta && <div style={{ fontSize: 11, color: "var(--green)", marginTop: 4 }}>{delta}</div>}
    </div>
  );
}

export function Field({ label, value, onChange, placeholder, type = "text", disabled }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: "100%", background: "var(--surface)", borderRadius: 6, padding: "10px 14px",
          color: "var(--text)", fontFamily: "IBM Plex Mono", fontSize: 13, outline: "none",
          border: `1px solid ${focused ? "var(--amber)" : "var(--border)"}`, transition: "border-color .2s",
        }}
      />
    </div>
  );
}

export function Select({ label, value, onChange, options, disabled }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>{label}</label>
      <select
        value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        style={{
          width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 6, padding: "10px 14px", color: "var(--text)",
          fontFamily: "IBM Plex Mono", fontSize: 13, outline: "none",
        }}
      >
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

export function Btn({ children, onClick, variant = "primary", full, small, disabled, href }) {
  const base = {
    border: "none", borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "IBM Plex Mono", letterSpacing: "0.04em", fontWeight: 600,
    transition: "all .18s", opacity: disabled ? 0.5 : 1,
    padding: small ? "7px 14px" : "10px 18px", fontSize: small ? 11 : 12,
    width: full ? "100%" : undefined, textDecoration: "none", display: "inline-block",
  };
  const v = {
    primary: { background: "var(--amber)", color: "var(--ink)" },
    ghost:   { background: "transparent", color: "var(--text)", border: "1px solid var(--border-bright)" },
    success: { background: "rgba(0,214,143,0.12)", color: "var(--green)", border: "1px solid rgba(0,214,143,0.3)" },
    muted:   { background: "var(--dim)", color: "var(--muted)" },
  };
  const s = { ...base, ...(disabled ? v.muted : v[variant]) };
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" style={s}>{children}</a>;
  return <button onClick={onClick} disabled={disabled} style={s}>{children}</button>;
}
