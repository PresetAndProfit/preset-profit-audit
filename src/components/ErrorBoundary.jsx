import { Component } from "react";

// App-wide error boundary. Without this, any render-time throw unmounts the
// whole React tree and the user sees a silent blank screen. This catches it and
// shows the actual error (instead of going blank), so failures are diagnosable
// in production and the user gets a recovery action.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface to the console for production debugging.
    console.error("[ErrorBoundary] render error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#0a0a0f", color: "#e8e8ef", fontFamily: "monospace", padding: 24,
      }}>
        <div style={{ maxWidth: 560, textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ fontSize: 18, marginBottom: 10, color: "#f5a623" }}>Something went wrong</h1>
          <p style={{ fontSize: 13, color: "#9a9ab0", lineHeight: 1.6, marginBottom: 16 }}>
            The app hit an unexpected error while loading. Try reloading — if it persists, the message below helps us fix it.
          </p>
          <pre style={{
            textAlign: "left", fontSize: 11, color: "#ff6b7a", background: "#16161f",
            border: "1px solid #242430", borderRadius: 8, padding: 12, overflowX: "auto", whiteSpace: "pre-wrap",
          }}>{String(this.state.error?.message || this.state.error)}</pre>
          <button
            onClick={() => { window.location.href = "/"; }}
            style={{
              marginTop: 16, background: "#f5a623", color: "#0a0a0f", border: "none",
              borderRadius: 6, padding: "10px 20px", cursor: "pointer", fontFamily: "monospace",
              fontSize: 13, fontWeight: 700,
            }}
          >Reload</button>
        </div>
      </div>
    );
  }
}
