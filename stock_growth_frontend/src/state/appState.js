import React, { createContext, useContext, useMemo, useState } from "react";

/**
 * @typedef {{ start: string, end: string }} DateRange
 * @typedef {{ min?: number, max?: number }} GrowthRange
 * @typedef {{ ticker: string, period: { start: string, end: string }, growth_percent: number }} ScreeningResult
 *
 * @typedef {"idle"|"submitting"|"polling"|"completed"|"error"} UiPhase
 */

/**
 * @typedef {{ message: string, retryAfterSeconds?: number, lastHitAtMs?: number }} RateLimitInfo
 */

/**
 * @typedef {{ lastUpdatedAtMs?: number }} ResultsMeta
 */

/**
 * @typedef {{ error?: { code?: string, message?: string, details?: string } }} ApiErrorShape
 */

/**
 * @typedef {{ status?: "pending"|"completed"|"error", query_id?: string, results?: ScreeningResult[] }} ScreeningResponseShape
 */

/**
 * @typedef {{
 *   tickers: string[],
 *   setTickers: (value: string[]) => void,
 *   dateRange: DateRange,
 *   setDateRange: (value: DateRange) => void,
 *   growthRange: GrowthRange,
 *   setGrowthRange: (value: GrowthRange) => void,
 *   topN: number,
 *   setTopN: (value: number) => void,
 *
 *   results: ScreeningResult[],
 *   setResults: (value: ScreeningResult[]) => void,
 *
 *   queryId: string,
 *   setQueryId: (value: string) => void,
 *
 *   responseStatus: "idle"|"pending"|"completed"|"error",
 *   setResponseStatus: (value: "idle"|"pending"|"completed"|"error") => void,
 *
 *   phase: UiPhase,
 *   setPhase: (value: UiPhase) => void,
 *
 *   isLoading: boolean,
 *   setIsLoading: (value: boolean) => void,
 *
 *   error: ApiErrorShape | null,
 *   setError: (value: ApiErrorShape | null) => void,
 *
 *   rateLimit: RateLimitInfo | null,
 *   setRateLimit: (value: RateLimitInfo | null) => void,
 *
 *   resultsMeta: ResultsMeta,
 *   setResultsMeta: (value: ResultsMeta) => void,
 *
 *   status: string,
 *   setStatus: (value: string) => void,
 * }} AppState
 */

const AppStateContext = createContext(/** @type {AppState | null} */ (null));

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// PUBLIC_INTERFACE
export function AppStateProvider({ children }) {
  /** This provider holds UI state scaffolding for the screening form + results. */
  const [tickers, setTickers] = useState(["AAPL", "MSFT", "NVDA"]);
  const [dateRange, setDateRange] = useState({ start: daysAgoISO(30), end: todayISO() });
  const [growthRange, setGrowthRange] = useState({});
  const [topN, setTopN] = useState(10);

  const [results, setResults] = useState(/** @type {ScreeningResult[]} */ ([]));

  const [queryId, setQueryId] = useState("");
  const [responseStatus, setResponseStatus] = useState(/** @type {AppState["responseStatus"]} */ ("idle"));

  const [phase, setPhase] = useState(/** @type {UiPhase} */ ("idle"));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(/** @type {ApiErrorShape | null} */ (null));
  const [rateLimit, setRateLimit] = useState(/** @type {RateLimitInfo | null} */ (null));
  const [resultsMeta, setResultsMeta] = useState(/** @type {ResultsMeta} */ ({}));

  const [status, setStatus] = useState("Idle");

  const value = useMemo(
    () => ({
      tickers,
      setTickers,
      dateRange,
      setDateRange,
      growthRange,
      setGrowthRange,
      topN,
      setTopN,

      results,
      setResults,

      queryId,
      setQueryId,

      responseStatus,
      setResponseStatus,

      phase,
      setPhase,

      isLoading,
      setIsLoading,

      error,
      setError,

      rateLimit,
      setRateLimit,

      resultsMeta,
      setResultsMeta,

      status,
      setStatus,
    }),
    [
      tickers,
      dateRange,
      growthRange,
      topN,
      results,
      queryId,
      responseStatus,
      phase,
      isLoading,
      error,
      rateLimit,
      resultsMeta,
      status,
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

// PUBLIC_INTERFACE
export function useAppState() {
  /** Hook to access the app's UI state scaffolding (tickers/date range/growth range/top N/results/status). */
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within an AppStateProvider");
  }
  return ctx;
}
