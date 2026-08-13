import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("JimatCart could not render", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="fatal-error">
          <h1>JimatCart needs a fresh start</h1>
          <p>Your saved basket is still on this device. Reload the page to try again.</p>
          <button className="button button--primary" type="button" onClick={() => window.location.reload()}>
            Reload JimatCart
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
