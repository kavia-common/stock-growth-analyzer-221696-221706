import React, { useMemo, useState } from 'react';

/**
 * PUBLIC_INTERFACE
 * ResultsTable - displays results with sortable columns.
 *
 * Props:
 * - results: Array of items with fields:
 *   { ticker, start_date, end_date, start_price, end_price, growth_pct, absolute_return, data_points }
 * - loading: boolean
 * - error: string | null
 */
export default function ResultsTable({ results, loading, error }) {
  const [sort, setSort] = useState({ key: 'growth_pct', dir: 'desc' });

  const columns = [
    { key: 'ticker', label: 'Ticker' },
    { key: 'period', label: 'Period' },
    { key: 'start_price', label: 'Start Price' },
    { key: 'end_price', label: 'End Price' },
    { key: 'growth_pct', label: 'Growth %' },
    { key: 'absolute_return', label: 'Absolute Return' },
    { key: 'data_points', label: 'Data Points' },
  ];

  function onSortClick(key) {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { key, dir: 'asc' };
    });
  }

  const tableData = useMemo(() => {
    if (!Array.isArray(results)) return [];
    return results.map((r) => ({
      ...r,
      period: `${r.start_date} → ${r.end_date}`,
    }));
  }, [results]);

  const sorted = useMemo(() => {
    const arr = [...tableData];
    const { key, dir } = sort;
    const factor = dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      // special for period: sort by end_date then start_date
      if (key === 'period') {
        const aKey = `${a.end_date}|${a.start_date}`;
        const bKey = `${b.end_date}|${b.start_date}`;
        return aKey.localeCompare(bKey) * factor;
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * factor;
      }
      return String(av).localeCompare(String(bv)) * factor;
    });
    return arr;
  }, [tableData, sort]);

  return (
    <div className="card table-card">
      <div className="table-header">
        <h2 className="table-title">Results</h2>
      </div>

      {loading && <div className="info">Loading results…</div>}
      {error && <div className="alert error">{error}</div>}
      {!loading && !error && sorted.length === 0 && (
        <div className="muted">No results yet. Submit a search to see results.</div>
      )}

      {!loading && !error && sorted.length > 0 && (
        <div className="table-responsive">
          <table className="results-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>
                    <button
                      type="button"
                      className="th-btn"
                      onClick={() => onSortClick(c.key)}
                      aria-label={`Sort by ${c.label}`}
                    >
                      <span>{c.label}</span>
                      <span className="sort-indicator">
                        {sort.key === c.key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, idx) => (
                <tr key={`${r.ticker}-${idx}`}>
                  <td>{r.ticker}</td>
                  <td>{r.period}</td>
                  <td>{formatCurrency(r.start_price)}</td>
                  <td>{formatCurrency(r.end_price)}</td>
                  <td>{formatPercent(r.growth_pct)}</td>
                  <td>{formatCurrency(r.absolute_return)}</td>
                  <td>{r.data_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatCurrency(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '-';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

function formatPercent(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '-';
  return `${n.toFixed(2)}%`;
}
