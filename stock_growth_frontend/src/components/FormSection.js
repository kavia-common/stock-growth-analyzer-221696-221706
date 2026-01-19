import React, { useEffect, useMemo, useState } from "react";
import { submitScreeningQuery } from "../api/client";
import { useAppState } from "../state/appState";

/**
 * Parse a free-form ticker entry string into normalized tickers:
 * - accepts comma/space/newline separated tokens
 * - uppercases
 * - removes empties/duplicates
 * @param {string} raw
 * @returns {string[]}
 */
function parseTickers(raw) {
  const tokens = String(raw)
    .split(/[\s,]+/g)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);

  // De-dupe while preserving order.
  const seen = new Set();
  const unique = [];
  for (const t of tokens) {
    if (!seen.has(t)) {
      unique.push(t);
      seen.add(t);
    }
  }
  return unique;
}

/**
 * @param {any} err
 * @returns {string}
 */
function getErrorMessage(err) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  return "Request failed";
}

/**
 * @param {string} value
 * @returns {number|undefined}
 */
function parseOptionalNumber(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Build field-level validation errors following the OpenAPI constraints:
 * - tickers: required non-empty array
 * - date_range.start/end: required
 * - growth_range: optional; if provided, min/max must be numbers; if both present, min <= max
 * - top_n: optional integer; default 10
 *
 * @param {{ tickersRaw: string, start: string, end: string, growthMin: string, growthMax: string, topN: string }} values
 * @returns {{ tickersRaw?: string, start?: string, end?: string, growthMin?: string, growthMax?: string, topN?: string, form?: string }}
 */
function validate(values) {
  /** @type {ReturnType<typeof validate>} */
  const errors = {};

  const tickers = parseTickers(values.tickersRaw);
  if (tickers.length === 0) {
    errors.tickersRaw = "Enter at least one ticker (comma/space separated).";
  }

  if (!values.start) {
    errors.start = "Start date is required.";
  }
  if (!values.end) {
    errors.end = "End date is required.";
  }
  if (values.start && values.end && values.start > values.end) {
    errors.end = "End date must be on or after start date.";
  }

  const min = parseOptionalNumber(values.growthMin);
  const max = parseOptionalNumber(values.growthMax);

  if (Number.isNaN(min)) {
    errors.growthMin = "Min growth must be a number (e.g. -5 or 12.5).";
  }
  if (Number.isNaN(max)) {
    errors.growthMax = "Max growth must be a number (e.g. 25).";
  }
  if (typeof min === "number" && typeof max === "number" && min > max) {
    errors.growthMax = "Max growth must be greater than or equal to min growth.";
  }

  const topNRaw = String(values.topN ?? "").trim();
  if (topNRaw) {
    const parsedTop = Number(topNRaw);
    if (!Number.isInteger(parsedTop) || parsedTop <= 0) {
      errors.topN = "Top N must be a positive integer.";
    }
  }

  return errors;
}

// PUBLIC_INTERFACE
export default function FormSection() {
  /** Screening form: builds request body, validates, submits query, and updates global state used by results/polling. */
  const {
    tickers,
    setTickers,
    dateRange,
    setDateRange,
    growthRange,
    setGrowthRange,
    topN,
    setTopN,
    setResults,
    setQueryId,
    setResponseStatus,
    isLoading,
    setIsLoading,
    setError,
    setRateLimit,
    setResultsMeta,
    setPhase,
    setStatus,
  } = useAppState();

  // Local controlled inputs (we still mirror into global state on submit / key changes).
  const [tickersRaw, setTickersRaw] = useState(tickers.join(", "));
  const [start, setStart] = useState(dateRange.start);
  const [end, setEnd] = useState(dateRange.end);
  const [growthMin, setGrowthMin] = useState(
    typeof growthRange.min === "number" ? String(growthRange.min) : ""
  );
  const [growthMax, setGrowthMax] = useState(
    typeof growthRange.max === "number" ? String(growthRange.max) : ""
  );
  const [topNInput, setTopNInput] = useState(String(topN));

  const [touched, setTouched] = useState({});
  const errors = useMemo(
    () => validate({ tickersRaw, start, end, growthMin, growthMax, topN: topNInput }),
    [tickersRaw, start, end, growthMin, growthMax, topNInput]
  );

  const isValid = Object.keys(errors).length === 0;

  // Keep local inputs in sync if global state is updated elsewhere.
  useEffect(() => {
    setTickersRaw(tickers.join(", "));
  }, [tickers]);

  useEffect(() => {
    setStart(dateRange.start);
    setEnd(dateRange.end);
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    setGrowthMin(typeof growthRange.min === "number" ? String(growthRange.min) : "");
    setGrowthMax(typeof growthRange.max === "number" ? String(growthRange.max) : "");
  }, [growthRange.min, growthRange.max]);

  useEffect(() => {
    setTopNInput(String(topN));
  }, [topN]);

  /**
   * @returns {import("../api/client").ScreeningRequest}
   */
  function buildRequestBody() {
    const parsedTickers = parseTickers(tickersRaw);
    const min = parseOptionalNumber(growthMin);
    const max = parseOptionalNumber(growthMax);

    /** @type {any} */
    const body = {
      tickers: parsedTickers,
      date_range: { start, end },
      top_n: topNInput.trim() ? Number(topNInput.trim()) : 10,
    };

    const growth_range = {};
    if (typeof min === "number") growth_range.min = min;
    if (typeof max === "number") growth_range.max = max;
    if (Object.keys(growth_range).length > 0) {
      body.growth_range = growth_range;
    }

    return body;
  }

  async function onSubmit(e) {
    e.preventDefault();

    // Mark all fields touched to reveal validation messages.
    setTouched({
      tickersRaw: true,
      start: true,
      end: true,
      growthMin: true,
      growthMax: true,
      topN: true,
    });

    const currentErrors = validate({ tickersRaw, start, end, growthMin, growthMax, topN: topNInput });
    if (Object.keys(currentErrors).length > 0) {
      setStatus("Validation error");
      return;
    }

    // Cancel any previous poller by clearing queryId/status first (poller watches this).
    setQueryId("");
    setResponseStatus("idle");
    setPhase("submitting");
    setIsLoading(true);
    setError(null);
    setRateLimit(null);
    setResults([]);
    setResultsMeta({});

    // Mirror validated values into global state.
    const parsedTickers = parseTickers(tickersRaw);
    setTickers(parsedTickers);
    setDateRange({ start, end });

    const min = parseOptionalNumber(growthMin);
    const max = parseOptionalNumber(growthMax);
    const nextGrowth = {};
    if (typeof min === "number") nextGrowth.min = min;
    if (typeof max === "number") nextGrowth.max = max;
    setGrowthRange(nextGrowth);

    const computedTopN = topNInput.trim() ? Number(topNInput.trim()) : 10;
    setTopN(computedTopN);

    setStatus("Submitting…");

    try {
      const res = await submitScreeningQuery(buildRequestBody());

      setQueryId(res.query_id || "");
      setResponseStatus(res.status || "pending");
      setResults(Array.isArray(res.results) ? res.results : []);
      setResultsMeta({ lastUpdatedAtMs: Date.now() });

      if (res.status === "pending") {
        setPhase("polling");
        setStatus("Pending… polling for results");
      } else if (res.status === "completed") {
        setPhase("completed");
        setIsLoading(false);
        setStatus("Completed");
      } else {
        setPhase("error");
        setIsLoading(false);
        setStatus("Error");
      }
    } catch (err) {
      // Note: 429 handling during POST is also surfaced here.
      const retryAfterSeconds =
        err && typeof err === "object" && "retryAfterSeconds" in err
          ? err.retryAfterSeconds
          : undefined;

      if (err && typeof err === "object" && "status" in err && err.status === 429) {
        setRateLimit({
          message: "Rate limited by API. Please wait before retrying.",
          retryAfterSeconds: typeof retryAfterSeconds === "number" ? retryAfterSeconds : undefined,
          lastHitAtMs: Date.now(),
        });
      }

      setError({
        error: {
          code: err && typeof err === "object" && "code" in err ? err.code : undefined,
          message: getErrorMessage(err),
          details: err && typeof err === "object" && "details" in err ? err.details : undefined,
        },
      });
      setPhase("error");
      setResponseStatus("error");
      setIsLoading(false);
      setStatus("Error");
    }
  }

  const show = (field) => Boolean(touched[field]) && Boolean(errors[field]);

  return (
    <section className="card" aria-label="Screening form">
      <div className="cardHeader">
        <h2 className="cardTitle">Screening</h2>
        <span className="badge" title="Validated form + API submission">
          <span className="badgeDot" aria-hidden="true" />
          Steps 03–05
        </span>
      </div>

      <div className="cardBody">
        <p className="hint">
          Enter tickers, choose a date range, optionally set growth filters, then run the screen.
        </p>

        <form className="formGrid" onSubmit={onSubmit} noValidate>
          <div className="formRow">
            <label className="label" htmlFor="tickers">
              Tickers <span className="required">*</span>
            </label>
            <textarea
              id="tickers"
              className={`input textarea ${show("tickersRaw") ? "inputError" : ""}`}
              rows={3}
              placeholder="AAPL, MSFT, NVDA"
              value={tickersRaw}
              onChange={(e) => setTickersRaw(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, tickersRaw: true }))}
            />
            <div className="fieldHint">Tip: separate by commas, spaces, or new lines.</div>
            {show("tickersRaw") ? (
              <div className="fieldError" role="alert">
                {errors.tickersRaw}
              </div>
            ) : null}
          </div>

          <div className="formRow twoCol">
            <div>
              <label className="label" htmlFor="start">
                Start date <span className="required">*</span>
              </label>
              <input
                id="start"
                className={`input ${show("start") ? "inputError" : ""}`}
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, start: true }))}
                required
              />
              {show("start") ? (
                <div className="fieldError" role="alert">
                  {errors.start}
                </div>
              ) : null}
            </div>

            <div>
              <label className="label" htmlFor="end">
                End date <span className="required">*</span>
              </label>
              <input
                id="end"
                className={`input ${show("end") ? "inputError" : ""}`}
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, end: true }))}
                required
              />
              {show("end") ? (
                <div className="fieldError" role="alert">
                  {errors.end}
                </div>
              ) : null}
            </div>
          </div>

          <div className="formRow twoCol">
            <div>
              <label className="label" htmlFor="growthMin">
                Min growth (%)
              </label>
              <input
                id="growthMin"
                className={`input ${show("growthMin") ? "inputError" : ""}`}
                inputMode="decimal"
                placeholder="e.g. 0"
                value={growthMin}
                onChange={(e) => setGrowthMin(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, growthMin: true }))}
              />
              {show("growthMin") ? (
                <div className="fieldError" role="alert">
                  {errors.growthMin}
                </div>
              ) : null}
            </div>

            <div>
              <label className="label" htmlFor="growthMax">
                Max growth (%)
              </label>
              <input
                id="growthMax"
                className={`input ${show("growthMax") ? "inputError" : ""}`}
                inputMode="decimal"
                placeholder="e.g. 50"
                value={growthMax}
                onChange={(e) => setGrowthMax(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, growthMax: true }))}
              />
              {show("growthMax") ? (
                <div className="fieldError" role="alert">
                  {errors.growthMax}
                </div>
              ) : null}
            </div>
          </div>

          <div className="formRow twoCol">
            <div>
              <label className="label" htmlFor="topN">
                Top N
              </label>
              <input
                id="topN"
                className={`input ${show("topN") ? "inputError" : ""}`}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="10"
                value={topNInput}
                onChange={(e) => setTopNInput(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, topN: true }))}
              />
              <div className="fieldHint">Defaults to 10 when empty.</div>
              {show("topN") ? (
                <div className="fieldError" role="alert">
                  {errors.topN}
                </div>
              ) : null}
            </div>

            <div className="formActions">
              <button className="btn btnPrimary" type="submit" disabled={!isValid || isLoading}>
                {isLoading ? "Running…" : "Run screen"}
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setTickersRaw("");
                  setGrowthMin("");
                  setGrowthMax("");
                  setTopNInput("10");
                  setTouched({});
                }}
                disabled={isLoading}
              >
                Clear
              </button>
            </div>
          </div>

          {!isValid ? (
            <div className="formErrorBanner" role="note">
              Fix the highlighted fields to run the screen.
            </div>
          ) : null}
        </form>
      </div>
    </section>
  );
}
