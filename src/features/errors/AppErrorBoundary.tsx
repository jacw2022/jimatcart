import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { BASKET_STORAGE_KEY } from "../../storage/basketStorage";

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
    console.error("JimatCart crashed", error, info);
  }

  clearSavedBasketAndReload = () => {
    try {
      window.localStorage.removeItem(BASKET_STORAGE_KEY);
    } catch {
      // Ignore storage failures; reload still gives a clean boot path.
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="fatal-error">
          <h1>JimatCart needs a fresh start</h1>
          <p>
            Something went wrong. You can reload, or clear the saved basket if
            the problem repeats.
          </p>
          <div className="fatal-error__actions">
            <button
              className="button button--primary"
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload JimatCart
            </button>
            <button
              className="button button--danger-solid"
              type="button"
              onClick={this.clearSavedBasketAndReload}
            >
              Clear saved basket and reload
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
