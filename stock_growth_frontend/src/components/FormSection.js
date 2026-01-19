import React from "react";
import { useAppState } from "../state/appState";
import styles from "../App.css";

// PUBLIC_INTERFACE
export default function FormSection() {
  /** Left-side section for screening inputs (placeholder UI for now; real form added in step 03). */
  const { tickers, dateRange, growthRange, topN } = useAppState();

  return (
    <section className="card" aria-label="Screening form">
      <div className="cardHeader">
        <h2 className="cardTitle">Screening</h2>
        <span className="badge" title="Placeholder UI until form step is implemented">
          <span className="badgeDot" aria-hidden="true" />
          Step 01 Shell
        </span>
      </div>

      <div className="cardBody">
        <p className="hint">
          Enter tickers, choose a date range, optionally set growth filters, then run the screen.
          (Form inputs will be implemented in the next step.)
        </p>

        <div className="placeholderForm" aria-hidden="true">
          <div className="placeholderField" />
          <div className="placeholderField" />
          <div className="placeholderFieldSmall" />
        </div>

        <div className="kvList" aria-label="Current state preview">
          <div className="kvRow">
            <div className="kvKey">Tickers</div>
            <div className="kvVal">{tickers.length ? tickers.join(", ") : "—"}</div>
          </div>

          <div className="kvRow">
            <div className="kvKey">Date range</div>
            <div className="kvVal">
              {dateRange.start || "—"} → {dateRange.end || "—"}
            </div>
          </div>

          <div className="kvRow">
            <div className="kvKey">Growth range</div>
            <div className="kvVal">
              {typeof growthRange.min === "number" ? growthRange.min : "—"}% →{" "}
              {typeof growthRange.max === "number" ? growthRange.max : "—"}%
            </div>
          </div>

          <div className="kvRow">
            <div className="kvKey">Top N</div>
            <div className="kvVal">{topN}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
