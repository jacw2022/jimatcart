import { BasketWorkspace } from "./features/basket/BasketWorkspace";
import { GO_WELCOME_EVENT } from "./features/basket/wizardEvents";

export function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header site-header--slim">
        <div className="site-header__content">
          <a
            className="brand"
            href="#main-content"
            aria-label="JimatCart"
            onClick={(event) => {
              event.preventDefault();
              window.dispatchEvent(new Event(GO_WELCOME_EVENT));
              document.getElementById("main-content")?.focus({ preventScroll: true });
            }}
          >
            <img
              className="brand__mark"
              src="/jimatcart-mark.png"
              alt=""
              width={40}
              height={40}
              decoding="async"
            />
            <span>JimatCart</span>
          </a>
        </div>
      </header>

      <main id="main-content" className="main-content" tabIndex={-1}>
        <div className="workspace-grid">
          <BasketWorkspace />
        </div>
      </main>

      <footer className="site-footer">
        <p>
          JimatCart uses prices you enter manually. Check current prices and
          availability before you shop.
        </p>
      </footer>
    </div>
  );
}
