import { BasketWorkspace } from "./features/basket/BasketWorkspace";

export function App() {
  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__content">
          <a className="brand" href="#main-content" aria-label="JimatCart home">
            <span className="brand__mark" aria-hidden="true">
              JC
            </span>
            <span>JimatCart</span>
          </a>

          <div className="hero">
            <h1>Make every ringgit count.</h1>
            <p className="hero__purpose">
              Compare your grocery basket across nearby shops and see whether a
              second stop is genuinely worth the extra trip.
            </p>
          </div>
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
