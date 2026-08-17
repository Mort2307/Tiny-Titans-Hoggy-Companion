import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Tiny Titans encountered an unexpected error.",
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("Tiny Titans application error", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="page-container" role="alert" aria-live="assertive">
        <section className="welcome-card">
          <p aria-hidden="true">🐍</p>
          <h1>Tiny Titans hit an unexpected snag</h1>
          <p>The app protected your session instead of leaving you with a blank screen.</p>
          <p>{this.state.message}</p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button type="button" onClick={this.handleReload}>Reload Tiny Titans</button>
            <button type="button" onClick={this.handleHome}>Return Home</button>
          </div>
        </section>
      </main>
    );
  }
}
