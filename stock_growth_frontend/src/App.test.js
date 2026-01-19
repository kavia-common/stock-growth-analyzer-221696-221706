import React, { act } from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

jest.setTimeout(15000);

// Mock the API client module used by FormSection and ResultsSection.
jest.mock("./api/client", () => ({
  submitScreeningQuery: jest.fn(),
  getScreeningResults: jest.fn(),
}));

/** @typedef {import("./api/client").ApiError} ApiError */

const { submitScreeningQuery, getScreeningResults } = require("./api/client");

/**
 * Helper to render the app for tests.
 * Keeping this as a function makes it easy to add wrappers later if needed.
 */
function renderApp() {
  return render(<App />);
}

describe("Stock Growth Analyzer - basic flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("form validation blocks submit when required fields are missing (tickers/start/end)", async () => {
    const user = userEvent.setup();
    renderApp();

    // Clear defaults and attempt to submit.
    await user.clear(screen.getByLabelText(/Tickers/i));
    await user.clear(screen.getByLabelText(/Start date/i));
    await user.clear(screen.getByLabelText(/End date/i));

    await user.click(screen.getByRole("button", { name: /Run screen/i }));

    // Validate that submission never happened.
    expect(submitScreeningQuery).not.toHaveBeenCalled();

    // Validation banner should be visible.
    expect(screen.getByRole("note", { name: /Fix the highlighted fields/i })).toBeInTheDocument();

    // Individual field errors should show after submit (touched set to true).
    const alerts = screen.getAllByRole("alert");
    const alertText = alerts.map((a) => a.textContent || "").join(" ");
    expect(alertText).toMatch(/Enter at least one ticker/i);
    expect(alertText).toMatch(/Start date is required/i);
    expect(alertText).toMatch(/End date is required/i);
  });

  test("valid submission triggers loading state and subsequent results rendering (completed response)", async () => {
    const user = userEvent.setup();

    submitScreeningQuery.mockResolvedValueOnce({
      query_id: "q-123",
      status: "completed",
      results: [
        { ticker: "AAPL", period: { start: "2024-01-01", end: "2024-02-01" }, growth_percent: 12.345 },
        { ticker: "MSFT", period: { start: "2024-01-01", end: "2024-02-01" }, growth_percent: 5.1 },
      ],
    });

    renderApp();

    // Ensure required fields are set (tickers can stay default; just set dates).
    await user.clear(screen.getByLabelText(/Start date/i));
    await user.type(screen.getByLabelText(/Start date/i), "2024-01-01");
    await user.clear(screen.getByLabelText(/End date/i));
    await user.type(screen.getByLabelText(/End date/i), "2024-02-01");

    const runBtn = screen.getByRole("button", { name: /Run screen/i });
    await user.click(runBtn);

    // Loading label is transient; assert against stable side-effects instead.
    await waitFor(() => expect(submitScreeningQuery).toHaveBeenCalledTimes(1));

    // Results table should render with the returned rows.
    const table = await screen.findByRole("table", { name: /Results table/i });
    expect(table).toBeInTheDocument();

    // Ensure at least one ticker is rendered.
    expect(within(table).getByText("AAPL")).toBeInTheDocument();
    expect(within(table).getByText("MSFT")).toBeInTheDocument();

    // Ensure growth formatted with 2 decimals and sign.
    expect(within(table).getByText("+12.35%")).toBeInTheDocument();

    // No polling should be triggered for completed response.
    expect(getScreeningResults).not.toHaveBeenCalled();
  });

  test("results table renders expected columns and supports basic sort interaction", async () => {
    const user = userEvent.setup();

    submitScreeningQuery.mockResolvedValueOnce({
      query_id: "q-234",
      status: "completed",
      results: [
        { ticker: "ZZZ", period: { start: "2024-01-01", end: "2024-02-01" }, growth_percent: 1.0 },
        { ticker: "AAA", period: { start: "2024-01-01", end: "2024-02-01" }, growth_percent: 2.0 },
      ],
    });

    renderApp();

    // Submit (defaults include tickers; set dates).
    await user.clear(screen.getByLabelText(/Start date/i));
    await user.type(screen.getByLabelText(/Start date/i), "2024-01-01");
    await user.clear(screen.getByLabelText(/End date/i));
    await user.type(screen.getByLabelText(/End date/i), "2024-02-01");
    await user.click(screen.getByRole("button", { name: /Run screen/i }));

    const table = await screen.findByRole("table", { name: /Results table/i });
    const headers = within(table).getAllByRole("columnheader");

    // Columns should exist.
    expect(within(headers[0]).getByRole("button", { name: /Sort by Ticker/i })).toBeInTheDocument();
    expect(within(headers[1]).getByRole("button", { name: /Sort by Start/i })).toBeInTheDocument();
    expect(within(headers[2]).getByRole("button", { name: /Sort by End/i })).toBeInTheDocument();
    expect(within(headers[3]).getByRole("button", { name: /Sort by Growth/i })).toBeInTheDocument();

    // Default sort is growth desc, so AAA (2.0) should appear before ZZZ (1.0).
    const rowsBefore = within(table).getAllByRole("row");
    // rowsBefore[0] is header row
    expect(within(rowsBefore[1]).getByText("AAA")).toBeInTheDocument();
    expect(within(rowsBefore[2]).getByText("ZZZ")).toBeInTheDocument();

    // Click sort by ticker (default direction asc for non-growth) => AAA then ZZZ (still).
    await user.click(within(headers[0]).getByRole("button", { name: /Sort by Ticker/i }));

    const rowsAfterTickerAsc = within(table).getAllByRole("row");
    expect(within(rowsAfterTickerAsc[1]).getByText("AAA")).toBeInTheDocument();
    expect(within(rowsAfterTickerAsc[2]).getByText("ZZZ")).toBeInTheDocument();

    // Click again to toggle desc => ZZZ then AAA.
    await user.click(within(headers[0]).getByRole("button", { name: /Sort by Ticker/i }));
    const rowsAfterTickerDesc = within(table).getAllByRole("row");
    expect(within(rowsAfterTickerDesc[1]).getByText("ZZZ")).toBeInTheDocument();
    expect(within(rowsAfterTickerDesc[2]).getByText("AAA")).toBeInTheDocument();

    // Also ensure period columns render the dates.
    expect(within(table).getAllByText("2024-01-01").length).toBeGreaterThanOrEqual(1);
    expect(within(table).getAllByText("2024-02-01").length).toBeGreaterThanOrEqual(1);
  });

  test("error state rendering when API client returns an ErrorResponse-like object on submit", async () => {
    const user = userEvent.setup();

    /** @type {ApiError} */
    const apiErr = {
      code: "INVALID_INPUT",
      message: "Invalid input payload",
      details: "tickers: must not be empty",
      status: 400,
    };

    submitScreeningQuery.mockRejectedValueOnce(apiErr);

    renderApp();

    // Provide required dates and tickers.
    await user.clear(screen.getByLabelText(/Tickers/i));
    await user.type(screen.getByLabelText(/Tickers/i), "AAPL");

    await user.clear(screen.getByLabelText(/Start date/i));
    await user.type(screen.getByLabelText(/Start date/i), "2024-01-01");

    await user.clear(screen.getByLabelText(/End date/i));
    await user.type(screen.getByLabelText(/End date/i), "2024-02-01");

    await user.click(screen.getByRole("button", { name: /Run screen/i }));

    // Error banner should show.
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Error:/i);
    expect(alert).toHaveTextContent("Invalid input payload");
    expect(alert).toHaveTextContent("tickers: must not be empty");
  });

  test("rate limit banner/message handling when polling gets 429 with Retry-After", async () => {
    // Important: enable fake timers BEFORE creating userEvent, so userEvent's internal timers are also faked.
    jest.useFakeTimers();

    // Use a single userEvent instance configured to advance Jest timers.
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    // Optional helper: a microtask flush can help settle promise continuations in some Jest/timer edge cases.
    const flush = async () => {
      await Promise.resolve();
    };

    /**
     * Advance timers within React's act() so timer-driven state updates are properly flushed.
     *
     * @param {number} ms
     */
    const advance = async (ms) => {
      await act(async () => {
        // Prefer async helpers when available (Jest 28+).
        if (typeof jest.advanceTimersByTimeAsync === "function") {
          await jest.advanceTimersByTimeAsync(ms);
        } else {
          jest.advanceTimersByTime(ms);
        }
      });

      await flush();
    };

    // Initial submit returns pending to activate polling.
    submitScreeningQuery.mockResolvedValueOnce({
      query_id: "q-rl",
      status: "pending",
      results: [],
    });

    // First poll call hits 429 with retryAfterSeconds and status.
    getScreeningResults.mockRejectedValueOnce({
      message: "Too Many Requests",
      status: 429,
      retryAfterSeconds: 2,
      code: "RATE_LIMITED",
    });

    // Then polling succeeds with completed results.
    getScreeningResults.mockResolvedValueOnce({
      query_id: "q-rl",
      status: "completed",
      results: [{ ticker: "AAPL", period: { start: "2024-01-01", end: "2024-02-01" }, growth_percent: 10 }],
    });

    renderApp();

    await user.clear(screen.getByLabelText(/Start date/i));
    await user.type(screen.getByLabelText(/Start date/i), "2024-01-01");
    await user.clear(screen.getByLabelText(/End date/i));
    await user.type(screen.getByLabelText(/End date/i), "2024-02-02");

    await user.click(screen.getByRole("button", { name: /Run screen/i }));

    // Ensure submit happened (starts polling via responseStatus="pending").
    await waitFor(() => expect(submitScreeningQuery).toHaveBeenCalledTimes(1));

    // Polling attempt 0 waits 1s before the first getScreeningResults call.
    await advance(1000);

    // Wait for the async polling request to actually be issued.
    await waitFor(() => expect(getScreeningResults).toHaveBeenCalledTimes(1));

    // After 429, banner should appear with wait seconds.
    const rateLimitBanner = await screen.findByRole("status");
    expect(rateLimitBanner).toHaveTextContent(/Rate limit:/i);
    expect(rateLimitBanner).toHaveTextContent(/Waiting 2s/i);

    // Poller sleeps Retry-After (2s) then continues to next attempt which waits 2s backoff.
    await advance(2000); // Retry-After wait
    await waitFor(() => expect(getScreeningResults).toHaveBeenCalledTimes(1)); // still 1 call during retry-after

    await advance(2000); // attempt 1 backoff wait
    await waitFor(() => expect(getScreeningResults).toHaveBeenCalledTimes(2));

    // Completed results should render.
    const table = await screen.findByRole("table", { name: /Results table/i });
    expect(within(table).getByText("AAPL")).toBeInTheDocument();

    jest.useRealTimers();
  });
});
