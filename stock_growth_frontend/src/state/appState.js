import React, { createContext, useContext, useMemo, useState } from "react";

/**
 * @typedef {{ start: string, end: string }} DateRange
 * @typedef {{ min?: number, max?: number }} GrowthRange
 * @typedef {{ ticker: string, period: { start: string, end: string }, growth_percent: number }} ScreeningResult
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
 *   results: ScreeningResult[],
 *   setResults: (value: ScreeningResult[]) => void,
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

  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("Idle (API not wired yet)");

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
      status,
      setStatus,
    }),
    [tickers, dateRange, growthRange, topN, results, status]
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
