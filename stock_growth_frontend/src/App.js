import React, { useEffect, useState } from 'react';
import './App.css';
import SearchForm from './components/SearchForm';
import ResultsTable from './components/ResultsTable';
import { analyzeGrowth, getApiBaseUrl } from './api/client';

// PUBLIC_INTERFACE
function App() {
  /**
   * PUBLIC_INTERFACE
   * Main app: shows title/description, SearchForm and ResultsTable, and theme toggle.
   */
  const [theme, setTheme] = useState('light');
  const [results, setResults] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  async function onSearch(payload) {
    setLoading(true);
    setError('');
    setResults([]);
    setWarnings([]);
    try {
      const data = await analyzeGrowth(payload);
      // Expecting {results, warnings}; remain resilient to prior shapes
      if (data && Array.isArray(data.results)) {
        setResults(data.results);
      } else if (Array.isArray(data)) {
        setResults(data);
      } else {
        setResults([]);
      }
      if (data && Array.isArray(data.warnings)) {
        setWarnings(data.warnings);
      } else if (!Array.isArray(data)) {
        // if we got no results and no explicit warnings, guide the user
        if ((data?.results?.length ?? 0) === 0) {
          setWarnings([
            'No results were returned. This can occur if selected dates are non-trading days or the provider lacks coverage. Try nearby business days or adjust filters/universe.',
          ]);
        }
      }
    } catch (err) {
      const message =
        (err && (err.message || err.toString())) || 'Request failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="App app-root">
      <header className="topbar">
        <div className="topbar-inner container">
          <div className="brand">
            <span className="logo-dot" aria-hidden="true">⬤</span>
            <span className="brand-text">Stock Growth Analyzer</span>
          </div>
          <div className="topbar-actions">
            <span className="api-hint">API: {getApiBaseUrl()}</span>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </button>
          </div>
        </div>
      </header>

      <main className="container main-content">
        <section className="intro">
          <h1 className="title">Find Top Growing Stocks</h1>
          <p className="description">
            Enter one or more tickers, select a date or date range, optionally
            filter by growth percentage, and get the top results. Data is fetched
            from a finance source and analyzed by the backend.
          </p>
        </section>

        <section className="form-section">
          <SearchForm onSearch={onSearch} loading={loading} />
        </section>

        {warnings.length > 0 && (
          <section className="container" aria-live="polite">
            <div className="alert" style={{ background: 'rgba(234,179,8,0.12)', border: '1px solid rgba(234,179,8,0.3)', color: '#854d0e', borderRadius: 10, padding: 10 }}>
              <strong>Warnings</strong>
              <ul>
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section className="results-section">
          <ResultsTable results={results} loading={loading} error={error} />
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span className="muted">© {new Date().getFullYear()} Stock Growth Analyzer</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
