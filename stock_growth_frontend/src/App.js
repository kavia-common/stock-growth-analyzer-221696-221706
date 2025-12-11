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
    try {
      const data = await analyzeGrowth(payload);
      // Expecting array; handle unexpected shapes gracefully
      if (Array.isArray(data)) {
        setResults(data);
      } else if (data && Array.isArray(data.results)) {
        setResults(data.results);
      } else {
        setResults([]);
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
