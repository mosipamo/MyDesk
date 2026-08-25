import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surfaced in devtools so the real cause is easy to find/report.
    console.error("App crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, maxWidth: 640 }}>
          <h2 style={{ marginTop: 0 }}>Something broke</h2>
          <p style={{ color: "var(--ink-soft)" }}>
            The app hit an error and stopped instead of showing something broken. Nothing you
            saved is lost — reload to keep going. If this keeps happening, copy the message below.
          </p>
          <pre
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: 12,
              fontSize: 12.5,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {String(this.state.error?.stack || this.state.error)}
          </pre>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
