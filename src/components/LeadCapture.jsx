import { useState } from "react";
import { Field, Btn } from "./ui/index.jsx";

export default function LeadCapture({ onSubmit }) {
  const [email, setEmail]   = useState("");
  const [name, setName]     = useState("");
  const [done, setDone]     = useState(false);

  const handleSubmit = e => {
    e.preventDefault();
    if (!email.trim()) return;
    onSubmit?.({ name, email });
    setDone(true);
  };

  if (done) {
    return (
      <div style={{ background: "rgba(0,214,143,0.08)", border: "1px solid rgba(0,214,143,0.3)", borderRadius: 8, padding: "20px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 22, marginBottom: 8 }}>✓</div>
        <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 15, color: "var(--green)" }}>You're on the list</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>We'll be in touch with your report shortly.</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "24px 28px", display: "grid", gap: 14 }}>
      <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 15, marginBottom: 2 }}>Get the Full Report</div>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>Enter your details to receive a branded PDF audit.</div>
      <Field label="Your Name" value={name} onChange={setName} placeholder="Jane Smith" />
      <Field label="Email Address *" type="email" value={email} onChange={setEmail} placeholder="jane@business.com" />
      <Btn full>Send My Report</Btn>
    </form>
  );
}
