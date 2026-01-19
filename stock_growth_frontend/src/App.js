import React from "react";
import "./App.css";
import FormSection from "./components/FormSection";
import ResultsSection from "./components/ResultsSection";
import { AppStateProvider, useAppState } from "./state/appState";

function ShellLayout() {
  const { status } = useAppState();

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="container">
          <div className="topBarInner">
            <div className="brand">
              <div className="brandMark" aria-hidden="true" />
              <div className="brandText">
                <div className="titleRow">
                  <h1 className="title">Stock Growth Analyzer</h1>
                  <span className="badge" title="Light theme shell">
                    <span className="badgeDot" aria-hidden="true" />
                    Light / Modern
                  </span>
                </div>
                <p className="subtitle">
                  Screen tickers by growth over a date range — validated form, sortable results, and
                  polling with backoff.
                </p>
              </div>
            </div>

            <div className="statusPill" aria-label="App status">
              <span className="statusDot" aria-hidden="true" />
              <span>{status}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <div className="grid">
            <FormSection />
            <ResultsSection />
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footerInner">
            <div>
              <strong>Tip:</strong> On mobile, sections stack for easier scanning.
            </div>
            <div>v0.1 • Form + results wired • Polling enabled</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// PUBLIC_INTERFACE
function App() {
  /** App entry component: provides state scaffolding and renders the baseline UI shell. */
  return (
    <AppStateProvider>
      <ShellLayout />
    </AppStateProvider>
  );
}

export default App;
