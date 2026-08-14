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

          <div className="header-hero-grid">
            <div className="hero">
              <h1>Make every ringgit count.</h1>
              <p className="hero__purpose">See if a second stop saves you money.</p>
            </div>
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
