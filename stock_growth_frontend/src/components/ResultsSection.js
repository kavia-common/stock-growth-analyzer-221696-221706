import React from "react";
import { useAppState } from "../state/appState";

// PUBLIC_INTERFACE
export default function ResultsSection() {
  /** Right-side section for displaying results (placeholder UI for now; real results wiring later). */
  const { results } = useAppState();

  return (
    <section className="card" aria-label="Results">
      <div className="cardHeader">
        <h2 className="cardTitle">Results</h2>
        <span className="badge" title="No API calls yet">
          <span className="badgeDot" aria-hidden="true" />
          Placeholder
        </span>
      </div>

      <div className="cardBody">
        {results.length === 0 ? (
          <>
            <p className="hint">
              Results will appear here after running a screen. For now, this is a placeholder panel.
            </p>
            <div className="emptyState" role="note">
              No results yet. Complete the screening form and run a query (next steps will add this).
            </div>

            <table className="resultsTable" aria-label="Results preview (placeholder)">
              <thead>
                <tr>
                  <th>Ticker</th>
                  <th>Period</th>
                  <th>Growth</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="mono">AAPL</td>
                  <td className="mono">2025-01-01 → 2025-02-01</td>
                  <td>+12.4%</td>
                </tr>
                <tr>
                  <td className="mono">MSFT</td>
                  <td className="mono">2025-01-01 → 2025-02-01</td>
                  <td>+9.1%</td>
                </tr>
              </tbody>
            </table>
          </>
        ) : (
          <table className="resultsTable" aria-label="Results table">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Period</th>
                <th>Growth</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={`${r.ticker}-${r.period.start}-${r.period.end}`}>
                  <td className="mono">{r.ticker}</td>
                  <td className="mono">
                    {r.period.start} → {r.period.end}
                  </td>
                  <td>{typeof r.growth_percent === "number" ? `${r.growth_percent.toFixed(2)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
