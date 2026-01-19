/**
 * Lightweight fetch-based API client for the Stock Growth Analyzer backend.
 *
 * Base URL resolution:
 * - Uses process.env.REACT_APP_API_BASE when set
 * - Falls back to "http://localhost:3001/api/v1" for local development
 *
 * This module is intentionally UI-agnostic and unit-test friendly.
 */

/**
 * @typedef {{ start: string, end: string }} DateRange
 * @typedef {{ min?: number, max?: number }} GrowthRange
 *
 * @typedef {{
 *   tickers: string[],
 *   date_range: DateRange,
 *   growth_range?: GrowthRange,
 *   top_n?: number
 * }} ScreeningRequest
 *
 * @typedef {{ ticker: string, period: DateRange, growth_percent: number }} ScreeningResult
 *
 * @typedef {{
 *   query_id: string,
 *   results: ScreeningResult[],
 *   status: "pending" | "completed" | "error"
 * }} ScreeningResponse
 *
 * @typedef {{
 *   error: {
 *     code: "INVALID_INPUT" | "NOT_FOUND" | "RATE_LIMITED" | "SERVER_ERROR",
 *     message: string,
 *     details?: string
 *   }
 * }} ErrorResponse
 */

/**
 * @typedef {{
 *   code: ErrorResponse["error"]["code"] | "NETWORK_ERROR" | "BAD_RESPONSE",
 *   message: string,
 *   details?: string,
 *   status?: number,
 *   retryAfterSeconds?: number
 * }} ApiError
 */

const DEFAULT_API_BASE = "http://localhost:3001/api/v1";

/**
 * Normalize base URL and join with a path segment (avoids double slashes).
 * @param {string} base
 * @param {string} path
 */
function joinUrl(base, path) {
  const normalizedBase = String(base || "").replace(/\/+$/, "");
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return `${normalizedBase}/${normalizedPath}`;
}

/**
 * Read environment base URL with fallback.
 */
function getApiBase() {
  // CRA exposes REACT_APP_* env vars at build time.
  return process.env.REACT_APP_API_BASE || DEFAULT_API_BASE;
}

/**
 * Best-effort parsing for JSON responses.
 * @param {Response} res
 * @returns {Promise<any|null>}
 */
async function tryParseJson(res) {
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Map an HTTP error response into a structured ApiError matching ErrorResponse schema as closely as possible.
 * Surfaces Retry-After (seconds) for 429 responses when present.
 *
 * @param {Response} res
 * @returns {Promise<ApiError>}
 */
async function mapHttpError(res) {
  const status = res.status;
  const retryAfterRaw = res.headers.get("Retry-After");
  const retryAfterSeconds =
    retryAfterRaw && /^\d+$/.test(retryAfterRaw) ? Number(retryAfterRaw) : undefined;

  const parsed = await tryParseJson(res);

  // Backend is expected to return: { error: { code, message, details? } }
  if (parsed && parsed.error && typeof parsed.error === "object") {
    const code = parsed.error.code;
    const message = parsed.error.message;
    const details = parsed.error.details;

    /** @type {ApiError} */
    const apiError = {
      code: code || "BAD_RESPONSE",
      message: message || `Request failed with status ${status}`,
      details,
      status,
    };

    if (status === 429 && typeof retryAfterSeconds === "number") {
      apiError.retryAfterSeconds = retryAfterSeconds;
    }

    return apiError;
  }

  // Fallback mapping when backend did not return the expected schema.
  /** @type {ApiError} */
  const fallback = {
    code:
      status === 400
        ? "INVALID_INPUT"
        : status === 404
          ? "NOT_FOUND"
          : status === 429
            ? "RATE_LIMITED"
            : "SERVER_ERROR",
    message: `Request failed with status ${status}`,
    details: null,
    status,
  };

  if (status === 429 && typeof retryAfterSeconds === "number") {
    fallback.retryAfterSeconds = retryAfterSeconds;
  }

  return fallback;
}

/**
 * Internal request helper that throws ApiError for non-2xx responses.
 *
 * @template T
 * @param {string} path
 * @param {{ method: "GET" | "POST", body?: any }} options
 * @returns {Promise<T>}
 */
async function requestJson(path, options) {
  const url = joinUrl(getApiBase(), path);

  try {
    const res = await fetch(url, {
      method: options.method,
      headers: {
        Accept: "application/json",
        ...(options.method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      body: options.method === "POST" ? JSON.stringify(options.body ?? {}) : undefined,
    });

    if (!res.ok) {
      throw await mapHttpError(res);
    }

    /** @type {any} */
    const data = await res.json();
    return data;
  } catch (err) {
    // Normalize fetch/network failures into ApiError for consistent handling.
    if (err && typeof err === "object" && "code" in err && "message" in err) {
      // Already an ApiError produced by mapHttpError.
      throw err;
    }

    /** @type {ApiError} */
    const networkError = {
      code: "NETWORK_ERROR",
      message: "Network error while contacting API",
      details: err instanceof Error ? err.message : String(err),
    };
    throw networkError;
  }
}

// PUBLIC_INTERFACE
export async function submitScreeningQuery(body) {
  /**
   * Submit a screening request to the backend.
   * POST /screen
   *
   * @param {ScreeningRequest} body
   * @returns {Promise<ScreeningResponse>}
   * @throws {ApiError} when the backend returns a non-2xx response or on network failure.
   */
  return requestJson("/screen", { method: "POST", body });
}

// PUBLIC_INTERFACE
export async function getScreeningResults(queryId) {
  /**
   * Retrieve results for a previously submitted query.
   * GET /results/{query_id}
   *
   * @param {string} queryId
   * @returns {Promise<ScreeningResponse>}
   * @throws {ApiError} when the backend returns a non-2xx response or on network failure.
   */
  const safeId = encodeURIComponent(String(queryId));
  return requestJson(`/results/${safeId}`, { method: "GET" });
}

// PUBLIC_INTERFACE
export function getResolvedApiBase() {
  /** Returns the resolved API base URL used by this client (useful for diagnostics/tests). */
  return getApiBase();
}
