import React, { useEffect, useMemo, useState } from 'react';

/**
 * PUBLIC_INTERFACE
 * SearchForm - collects user inputs and triggers onSearch with a normalized payload
 *
 * Props:
 * - onSearch: (payload) => void
 * - loading: boolean
 */
export default function SearchForm({ onSearch, loading }) {
  const [tickers, setTickers] = useState('');
  const [mode, setMode] = useState('single'); // 'single' | 'range'
  const [singleDate, setSingleDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minGrowthPct, setMinGrowthPct] = useState('');
  const [maxGrowthPct, setMaxGrowthPct] = useState('');
  const [limit, setLimit] = useState(10);
  const [priceField, setPriceField] = useState('close');
  const [errors, setErrors] = useState([]);

  // Persist last inputs to localStorage (optional)
  const storageKey = 'sga:lastForm';
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setTickers(parsed.tickers || '');
        setMode(parsed.mode || 'single');
        setSingleDate(parsed.singleDate || '');
        setStartDate(parsed.startDate || '');
        setEndDate(parsed.endDate || '');
        setMinGrowthPct(parsed.minGrowthPct ?? '');
        setMaxGrowthPct(parsed.maxGrowthPct ?? '');
        setLimit(parsed.limit ?? 10);
        setPriceField(parsed.priceField || 'close');
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const toSave = {
      tickers,
      mode,
      singleDate,
      startDate,
      endDate,
      minGrowthPct,
      maxGrowthPct,
      limit,
      priceField,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch {
      // ignore
    }
  }, [
    tickers,
    mode,
    singleDate,
    startDate,
    endDate,
    minGrowthPct,
    maxGrowthPct,
    limit,
    priceField,
  ]);

  const parsedTickers = useMemo(
    () =>
      (tickers || '')
        .split(',')
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean),
    [tickers]
  );

  function validate() {
    const errs = [];
    // Relaxed: allow no tickers to fetch top movers from NASDAQ
    if (mode === 'single') {
      if (!singleDate) {
        errs.push('Please select a date.');
      }
    } else {
      if (!startDate) errs.push('Please select a start date.');
      if (!endDate) errs.push('Please select an end date.');
      if (startDate && endDate && startDate > endDate) {
        errs.push('Start date must be earlier than or equal to end date.');
      }
    }
    if (minGrowthPct !== '' && isNaN(Number(minGrowthPct))) {
      errs.push('Min growth must be a number.');
    }
    if (maxGrowthPct !== '' && isNaN(Number(maxGrowthPct))) {
      errs.push('Max growth must be a number.');
    }
    if (limit !== '' && (isNaN(Number(limit)) || Number(limit) <= 0)) {
      errs.push('Limit must be a positive number.');
    }
    setErrors(errs);
    return errs.length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      start_date: mode === 'single' ? singleDate : startDate,
      end_date: mode === 'single' ? singleDate : endDate,
    };

    // Only include tickers if provided; otherwise send universe for top movers
    if (parsedTickers.length > 0) {
      payload.tickers = parsedTickers;
    } else {
      payload.universe = 'NASDAQ';
    }

    // keep limit configurable, default to 10 if empty
    if (limit === '' || Number.isNaN(Number(limit))) {
      payload.limit = 10;
    } else {
      payload.limit = Number(limit);
    }

    if (minGrowthPct !== '') payload.min_growth_pct = Number(minGrowthPct);
    if (maxGrowthPct !== '') payload.max_growth_pct = Number(maxGrowthPct);
    if (priceField) payload.price_field = priceField;

    onSearch(payload);
  }

  return (
    <form className="card form-card" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <div className="form-field full">
          <label htmlFor="tickers">Tickers (comma-separated)</label>
          <input
            id="tickers"
            type="text"
            placeholder="Leave empty for top NASDAQ movers, or enter AAPL, MSFT"
            value={tickers}
            onChange={(e) => setTickers(e.target.value)}
          />
          <span className="muted">
            Tip: Submit with no tickers to get top movers from NASDAQ (default top {limit || 10}).
          </span>
        </div>

        <div className="form-field full mode-row">
          <span className="label">Mode</span>
          <label className="radio">
            <input
              type="radio"
              name="mode"
              value="single"
              checked={mode === 'single'}
              onChange={() => setMode('single')}
            />
            <span>Single date</span>
          </label>
          <label className="radio">
            <input
              type="radio"
              name="mode"
              value="range"
              checked={mode === 'range'}
              onChange={() => setMode('range')}
            />
            <span>Date range</span>
          </label>
        </div>

        {mode === 'single' ? (
          <div className="form-field">
            <label htmlFor="single_date">Date *</label>
            <input
              id="single_date"
              type="date"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              required
            />
          </div>
        ) : (
          <>
            <div className="form-field">
              <label htmlFor="start_date">Start date *</label>
              <input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="end_date">End date *</label>
              <input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </>
        )}

        <div className="form-field">
          <label htmlFor="min_growth_pct">Min growth %</label>
          <input
            id="min_growth_pct"
            type="number"
            placeholder="e.g., 5"
            value={minGrowthPct}
            onChange={(e) => setMinGrowthPct(e.target.value)}
          />
        </div>
        <div className="form-field">
          <label htmlFor="max_growth_pct">Max growth %</label>
          <input
            id="max_growth_pct"
            type="number"
            placeholder="e.g., 50"
            value={maxGrowthPct}
            onChange={(e) => setMaxGrowthPct(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="limit">Top N</label>
          <input
            id="limit"
            type="number"
            min="1"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label htmlFor="price_field">Price field</label>
          <select
            id="price_field"
            value={priceField}
            onChange={(e) => setPriceField(e.target.value)}
          >
            <option value="close">Close</option>
            <option value="adj_close">Adj Close</option>
            <option value="open">Open</option>
          </select>
        </div>

        {errors.length > 0 && (
          <div className="form-field full">
            <div className="alert error">
              <ul>
                {errors.map((er, idx) => (
                  <li key={idx}>{er}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="form-actions full">
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? 'Analyzing…' : 'Analyze Growth'}
          </button>
        </div>
      </div>
    </form>
  );
}
