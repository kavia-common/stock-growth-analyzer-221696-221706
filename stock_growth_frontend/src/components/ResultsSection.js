import React, { useEffect, useMemo, useRef, useState } from "react";
import { getScreeningResults } from "../api/client";
import { useAppState } from "../state/appState";

/**
 * @typedef {"ticker"|"periodStart"|"periodEnd"|"growth"} SortKey
 * @typedef {"asc"|"desc"} SortDir
 */

/**
 * @param {any} err
 * @returns {{ message: string, code?: string, details?: string, retryAfterSeconds?: number, status?: number }}
 */
function normalizeApiError(err) {
  if (!err) return { message: "Unknown error" };
  if (typeof err === "string") return { message: err };
  if (err && typeof err === "object") {
    return {
      message: typeof err.message === "string" ? err.message : "Request failed",
      code: typeof err.code === "string" ? err.code : undefined,
      details: typeof err.details === "string" ? err.details : undefined,
      retryAfterSeconds:
        "retryAfterSeconds" in err && typeof err.retryAfterSeconds === "number"
          ? err.retryAfterSeconds
          : undefined,
      status: "status" in err && typeof err.status === "number" ? err.status : undefined,
    };
  }
  return { message: "Request failed" };
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Compute the next polling delay (exponential backoff).
 * @param {number} attempt 0-based attempt
 * @param {number} capMs
 * @returns {number}
 */
function backoffDelayMs(attempt, capMs) {
  const base = 1000; // 1s
  const next = base * Math.pow(2, Math.max(0, attempt)); // 1,2,4,8,...
  return Math.min(next, capMs);
}

/**
 * @param {any} result
 * @returns {string}
 */
function rowKey(result) {
  const t = result?.ticker ?? "";
  const s = result?.period?.start ?? "";
  const e = result?.period?.end ?? "";
  return `${t}-${s}-${e}`;
}

/**
 * @param {any} n
 * @returns {string}
 */
function fmtPct(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/**
 * @param {any[]} results
 * @param {SortKey} key
 * @param {SortDir} dir
 * @returns {any[]}
 */
function sortResults(results, key, dir) {
  const factor = dir === "asc" ? 1 : -1;
  const copy = [...results];

  copy.sort((a, b) => {
    if (key === "ticker") {
      const av = String(a?.ticker ?? "");
      const bv = String(b?.ticker ?? "");
      return av.localeCompare(bv) * factor;
    }

    if (key === "periodStart") {
      const av = String(a?.period?.start ?? "");
      const bv = String(b?.period?.start ?? "");
      return av.localeCompare(bv) * factor;
    }

    if (key === "periodEnd") {
      const av = String(a?.period?.end ?? "");
      const bv = String(b?.period?.end ?? "");
      return av.localeCompare(bv) * factor;
    }

    // growth
    const ag = typeof a?.growth_percent === "number" ? a.growth_percent : Number.NEGATIVE_INFINITY;
    const bg = typeof b?.growth_percent === "number" ? b.growth_percent : Number.NEGATIVE_INFINITY;
    return (ag - bg) * factor;
  });

  return copy;
}

/**
 * @param {SortKey} key
 * @returns {string}
 */
function sortLabel(key) {
  if (key === "ticker") return "Ticker";
  if (key === "periodStart") return "Start";
  if (key === "periodEnd") return "End";
  return "Growth %";
}

// PUBLIC_INTERFACE
export default function ResultsSection() {
  /** Results panel: renders sortable results table and manages polling/backoff for pending queries. */
  const {
    queryId,
    responseStatus,
    setResponseStatus,
    results,
    setResults,
    isLoading,
    setIsLoading,
    error,
    setError,
    rateLimit,
    setRateLimit,
    resultsMeta,
    setResultsMeta,
    phase,
    setPhase,
    setStatus,
  } = useAppState();

  const [sortKey, setSortKey] = useState(/** @type {SortKey} */ ("growth"));
  const [sortDir, setSortDir] = useState(/** @type {SortDir} */ ("desc"));

  // Used to cancel/ignore in-flight polling when new submission happens or on unmount.
  const pollRunIdRef = useRef(0);

  const sortedResults = useMemo(() => sortResults(results, sortKey, sortDir), [results, sortKey, sortDir]);

  function toggleSort(nextKey) {
    if (nextKey === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(nextKey);
      // default direction: growth desc, others asc
      setSortDir(nextKey === "growth" ? "desc" : "asc");
    }
  }

  useEffect(() => {
    // Polling is activated only when we have a queryId and the backend reports "pending".
    if (!queryId || responseStatus !== "pending") return;

    let isCancelled = false;
    const thisRunId = ++pollRunIdRef.current;

    const capMs = 12000; // reasonable cap
    const maxAttempts = 50; // safety bound

    async function pollLoop() {
      setPhase("polling");
      setIsLoading(true);
      setStatus("Pending… polling for results");

      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (isCancelled || pollRunIdRef.current !== thisRunId) return;

        // Wait before request (attempt 0 waits 1s, then 2s, 4s...)
        const delay = backoffDelayMs(attempt, capMs);
        await sleep(delay);

        if (isCancelled || pollRunIdRef.current !== thisRunId) return;

        try {
          const res = await getScreeningResults(queryId);

          setRateLimit(null);
          setResults(Array.isArray(res.results) ? res.results : []);
          setResultsMeta({ ...resultsMeta, lastUpdatedAtMs: Date.now() });
          setResponseStatus(res.status || "pending");

          if (res.status === "completed") {
            setPhase("completed");
            setIsLoading(false);
            setStatus("Completed");
            return;
          }

          if (res.status === "error") {
            setPhase("error");
            setIsLoading(false);
            setStatus("Error");
            return;
          }

          // still pending; loop continues
        } catch (err) {
          const normalized = normalizeApiError(err);

          // 429 handling: honor Retry-After (seconds) when present.
          if (normalized.status === 429) {
            const waitSeconds =
              typeof normalized.retryAfterSeconds === "number" ? normalized.retryAfterSeconds : undefined;

            setRateLimit({
              message:
                typeof waitSeconds === "number"
                  ? `Rate limited. Waiting ${waitSeconds}s before retrying…`
                  : "Rate limited. Waiting before retrying…",
              retryAfterSeconds: waitSeconds,
              lastHitAtMs: Date.now(),
            });

            if (typeof waitSeconds === "number" && waitSeconds >= 0) {
              await sleep(waitSeconds * 1000);
              continue;
            }

            // If we don't know how long to wait, fall back to normal backoff and continue.
            continue;
          }

          // Non-429 error: stop polling and surface error.
          setError({
            error: {
              code: normalized.code,
              message: normalized.message,
              details: normalized.details,
            },
          });
          setPhase("error");
          setResponseStatus("error");
          setIsLoading(false);
          setStatus("Error");
          return;
        }
      }

      // Max attempts reached: stop with error to avoid infinite polling.
      setError({
        error: {
          code: "POLL_TIMEOUT",
          message: "Polling timed out. Please try again.",
        },
      });
      setPhase("error");
      setResponseStatus("error");
      setIsLoading(false);
      setStatus("Error");
    }

    pollLoop();

    return () => {
      isCancelled = true;
      // Incrementing pollRunIdRef cancels/ignores any in-flight loop.
      pollRunIdRef.current += 1;
    };
    // Intentionally do not include resultsMeta in deps (would restart loop on each update).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryId, responseStatus, setError, setIsLoading, setPhase, setRateLimit, setResponseStatus, setResults, setStatus]);

  // Cleanup on unmount (defensive)
  useEffect(() => {
    return () => {
      pollRunIdRef.current += 1;
    };
  }, []);

  const hasEverRun = Boolean(queryId);

  const headerBadgeLabel = useMemo(() => {
    if (!hasEverRun) return "Idle";
    if (phase === "submitting") return "Submitting";
    if (phase === "polling") return "Polling";
    if (phase === "completed") return "Completed";
    if (phase === "error") return "Error";
    return "Idle";
  }, [hasEverRun, phase]);

  return (
    <section className="card" aria-label="Results">
      <div className="cardHeader">
        <h2 className="cardTitle">Results</h2>
        <span className="badge" title="API-driven results with polling + sorting">
          <span className="badgeDot" aria-hidden="true" />
          {headerBadgeLabel}
        </span>
      </div>

      <div className="cardBody">
        {rateLimit ? (
          <div className="banner bannerWarn" role="status" aria-live="polite">
            <strong>Rate limit:</strong> {rateLimit.message}
          </div>
        ) : null}

        {error?.error?.message ? (
          <div className="banner bannerError" role="alert">
            <strong>Error:</strong> {error.error.message}
            {error.error.details ? <div className="bannerDetails">{error.error.details}</div> : null}
          </div>
        ) : null}

        {!hasEverRun ? (
          <div className="emptyState" role="note">
            No results yet. Run a screen to fetch growth results.
          </div>
        ) : null}

        {hasEverRun && isLoading && results.length === 0 ? (
          <div className="emptyState" role="status" aria-live="polite">
            Loading results…
          </div>
        ) : null}

        {hasEverRun && !isLoading && results.length === 0 && responseStatus !== "pending" && !error ? (
          <div className="emptyState" role="note">
            No results returned for this query.
          </div>
        ) : null}

        {results.length > 0 ? (
          <div className="tableWrap" aria-label="Results table container">
            <table className="resultsTable" aria-label="Results table">
              <thead>
                <tr>
                  <th>
                    <button
                      type="button"
                      className="sortBtn"
                      onClick={() => toggleSort("ticker")}
                      aria-label={`Sort by ${sortLabel("ticker")}`}
                    >
                      Ticker {sortKey === "ticker" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="sortBtn"
                      onClick={() => toggleSort("periodStart")}
                      aria-label={`Sort by ${sortLabel("periodStart")}`}
                    >
                      Start {sortKey === "periodStart" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th>
                    <button
                      type="button"
                      className="sortBtn"
                      onClick={() => toggleSort("periodEnd")}
                      aria-label={`Sort by ${sortLabel("periodEnd")}`}
                    >
                      End {sortKey === "periodEnd" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </button>
                  </th>
                  <th className="right">
                    <button
                      type="button"
                      className="sortBtn right"
                      onClick={() => toggleSort("growth")}
                      aria-label={`Sort by ${sortLabel("growth")}`}
                    >
                      Growth {sortKey === "growth" ? (sortDir === "asc" ? "▲" : "▼") : ""}%
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map((r) => (
                  <tr key={rowKey(r)}>
                    <td className="mono">{r.ticker}</td>
                    <td className="mono">{r.period?.start ?? "—"}</td>
                    <td className="mono">{r.period?.end ?? "—"}</td>
                    <td className="right">{fmtPct(r.growth_percent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="tableMeta" aria-label="Results metadata">
              <div className="hint">
                {responseStatus === "pending" ? "Status: pending (polling…)" : `Status: ${responseStatus}`}
              </div>
              <div className="hint">
                {resultsMeta.lastUpdatedAtMs
                  ? `Last update: ${new Date(resultsMeta.lastUpdatedAtMs).toLocaleTimeString()}`
                  : ""}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
