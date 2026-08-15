import { BasketWorkspace } from "./features/basket/BasketWorkspace";

export function App() {
  return (
    <div className="app-shell">
      <header className="site-header site-header--slim">
        <div className="site-header__content">
          <a className="brand" href="#main-content" aria-label="JimatCart home">
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
