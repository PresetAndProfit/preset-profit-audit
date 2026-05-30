import { useState } from "react";

// Slider with amber fill track, large touch target, live value display
function Slider({ label, subLabel, value, min, max, step, format, onChange, benchmarkValue }) {
  const pct = ((value - min) / (max - min)) * 100;
  const changed = value !== benchmarkValue;

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{label}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{subLabel}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {changed && (
            <span style={{
              fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase",
              color: "var(--amber)", background: "var(--amber-glow)",
              border: "1px solid rgba(245,166,35,0.3)",
              borderRadius: 3, padding: "2px 5px", fontWeight: 700,
            }}>edited</span>
          )}
          <div style={{
            fontFamily: "Syne", fontWeight: 800, fontSize: 20,
            color: changed ? "var(--amber)" : "var(--text)",
            minWidth: 64, textAlign: "right",
            transition: "color .15s",
          }}>
            {format(value)}
          </div>
        </div>
      </div>

      <div style={{ position: "relative", height: 24, display: "flex", alignItems: "center" }}>
        <input
          type="range"
          min={min} max={max} step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="assumptions-slider"
          style={{
            width: "100%",
            background: `linear-gradient(to right, var(--amber) 0%, var(--amber) ${pct}%, var(--dim) ${pct}%, var(--dim) 100%)`,
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: "var(--dim)" }}>{format(min)}</span>
        {changed && (
          <button
            onClick={() => onChange(benchmarkValue)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 10, color: "var(--muted)", padding: 0,
              textDecoration: "underline",
            }}
          >
            reset to benchmark ({format(benchmarkValue)})
          </button>
        )}
        <span style={{ fontSize: 10, color: "var(--dim)" }}>{format(max)}</span>
      </div>
    </div>
  );
}

export default function AssumptionsEditor({ assumptions, benchmarks: benchmarksProp, bizName, liveTotal, benchmarkTotal, onChange, onReset }) {
  const [open, setOpen] = useState(true);

  const sliders = [
    {
      key: "avgJobValue",
      label: "Average value per job or appointment",
      subLabel: `What ${bizName} typically charges for one service or visit`,
      min: 20, max: 2000, step: 5,
      format: v => `$${v}`,
    },
    {
      key: "monthlyJobs",
      label: "Jobs or appointments per month",
      subLabel: `How many customers ${bizName} typically serves in a month`,
      min: 1, max: 300, step: 1,
      format: v => `${v}/mo`,
    },
    {
      key: "missedCallRate",
      label: "Calls that go unanswered",
      subLabel: "Out of every 10 calls, roughly how many does no one pick up?",
      min: 5, max: 70, step: 1,
      format: v => `${v}%`,
    },
    {
      key: "noShowRate",
      label: "Appointments that no-show",
      subLabel: "What percentage of booked appointments doesn't turn up?",
      min: 0, max: 50, step: 1,
      format: v => `${v}%`,
    },
    {
      key: "leadCloseRate",
      label: "Enquiries that turn into bookings",
      subLabel: "Out of 10 people who contact you, how many actually book?",
      min: 1, max: 80, step: 1,
      format: v => `${v}%`,
    },
  ];

  // Original engine values. Falls back to live values only if no benchmark was
  // passed (keeps the editor functional rather than crashing).
  const benchmarks = benchmarksProp || assumptions;
  const anyChanged = sliders.some(s => assumptions[s.key] !== benchmarks[s.key]);

  // Calculate the diff arrow
  const diff = liveTotal - benchmarkTotal;
  const diffSign = diff > 0 ? "+" : diff < 0 ? "" : "";
  const diffColor = diff > 0 ? "var(--green)" : diff < 0 ? "var(--red)" : "var(--muted)";

  return (
    <div style={{
      background: "var(--panel)",
      border: "1px solid rgba(245,166,35,0.35)",
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 4,
    }}>

      {/* Header — always visible, click to expand/collapse */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "16px 20px", display: "flex", justifyContent: "space-between",
          alignItems: "center", gap: 12, textAlign: "left",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 15, color: "var(--text)", marginBottom: 2 }}>
            Adjust to your actual numbers
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            Drag any slider to match {bizName}'s real figures — the estimates update instantly
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {/* Live total */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 22, color: "var(--green)", lineHeight: 1 }}>
              ${liveTotal.toLocaleString()}<span style={{ fontSize: 12, fontWeight: 400, color: "var(--muted)" }}>/mo</span>
            </div>
            {diff !== 0 && (
              <div style={{ fontSize: 11, color: diffColor, marginTop: 2 }}>
                {diffSign}${Math.abs(diff).toLocaleString()} vs benchmark
              </div>
            )}
          </div>

          {/* Chevron */}
          <div style={{
            fontSize: 12, color: "var(--muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform .2s",
          }}>▼</div>
        </div>
      </button>

      {/* Sliders — collapsible */}
      {open && (
        <div style={{ padding: "0 20px 20px", display: "grid", gap: 22 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
            background: "var(--surface)", borderRadius: 6,
            fontSize: 11, color: "var(--muted)",
          }}>
            <span style={{ fontSize: 14 }}>✏️</span>
            These are your numbers. When you adjust them, the estimates below become{" "}
            <strong style={{ color: "var(--text)" }}>your calculation</strong> — not the software's guess.
          </div>

          {sliders.map(s => (
            <Slider
              key={s.key}
              label={s.label}
              subLabel={s.subLabel}
              value={assumptions[s.key]}
              benchmarkValue={benchmarks[s.key]}
              min={s.min} max={s.max} step={s.step}
              format={s.format}
              onChange={val => onChange(s.key, val)}
            />
          ))}

          {/* Summary row */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10,
            alignItems: "center", marginTop: 4,
          }}>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px" }}>
              <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>Industry benchmark</div>
              <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 18, color: "var(--muted)" }}>
                ${benchmarkTotal.toLocaleString()}<span style={{ fontSize: 11, fontWeight: 400 }}>/mo</span>
              </div>
            </div>

            <div style={{ fontSize: 18, color: diff >= 0 ? "var(--green)" : "var(--red)", fontWeight: 700 }}>
              {diff === 0 ? "=" : diff > 0 ? "→" : "→"}
            </div>

            <div style={{
              background: diff !== 0 ? "rgba(0,214,143,0.06)" : "var(--surface)",
              border: `1px solid ${diff !== 0 ? "rgba(0,214,143,0.3)" : "var(--border)"}`,
              borderRadius: 8, padding: "12px 16px",
            }}>
              <div style={{ fontSize: 10, color: diff !== 0 ? "var(--green)" : "var(--muted)", marginBottom: 4 }}>
                {diff !== 0 ? `${bizName}'s numbers` : "Your numbers (same)"}
              </div>
              <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 18, color: diff !== 0 ? "var(--green)" : "var(--muted)" }}>
                ${liveTotal.toLocaleString()}<span style={{ fontSize: 11, fontWeight: 400 }}>/mo</span>
              </div>
            </div>
          </div>

          {/* Reset all */}
          <button
            onClick={onReset}
            style={{
              background: "none", border: "1px solid var(--border)",
              borderRadius: 6, cursor: "pointer", padding: "8px 14px",
              fontFamily: "IBM Plex Mono", fontSize: 11, color: "var(--muted)",
              transition: "all .15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-bright)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}
          >
            ↺ Reset all to industry benchmarks
          </button>
        </div>
      )}
    </div>
  );
}
