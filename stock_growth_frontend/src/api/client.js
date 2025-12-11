//
//
// Simple API client for Stock Growth Analyzer
//
// Prefer explicit env override; otherwise infer from window origin replacing :3000 -> :3001.
// Fallback to localhost:3001.
//
function resolveBaseUrl() {
  // Env override first
  const envVal =
    typeof process !== 'undefined' &&
    process.env &&
    process.env.REACT_APP_BACKEND_URL &&
    process.env.REACT_APP_BACKEND_URL.trim();
  if (envVal) return envVal;

  // Try to infer from current origin (e.g., hosted preview or localhost)
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    try {
      const u = new URL(window.location.origin);
      if (u.port === '3000') {
        u.port = '3001';
        return u.toString().replace(/\/+$/, '');
      }
      // If not on 3000, still try same origin (proxy setups)
      return window.location.origin.replace(/\/+$/, '');
    } catch {
      // ignore
    }
  }
  return 'http://localhost:3001';
}

const BASE_URL = resolveBaseUrl();

/**
 * Build a full URL from a path.
 */
function buildUrl(path) {
  const base = BASE_URL.replace(/\/+$/, '');
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}`;
}

/**
 * Normalize and map result row keys to a consistent shape for UI.
 */
function normalizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  const r = { ...row };
  if (r.absolute_return === undefined && r.abs_return !== undefined) {
    r.absolute_return = r.abs_return;
  }
  if (r.data_points === undefined && r.points_count !== undefined) {
    r.data_points = r.points_count;
  }
  return r;
}

/**
 * Normalize JSON fetch responses and handle errors.
 */
async function handleResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  let data = null;
  try {
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = text ? { detail: text } : null;
    }
  } catch {
    // ignore parse errors; data stays null
  }

  if (!res.ok) {
    const message =
      (data && (data.detail || data.message || JSON.stringify(data))) ||
      `Request failed with status ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  // Ensure {results, warnings} shape for consumers
  if (Array.isArray(data)) {
    return { results: data.map(normalizeRow), warnings: [] };
  }
  if (data && Array.isArray(data.results)) {
    return {
      results: data.results.map(normalizeRow),
      warnings: Array.isArray(data.warnings) ? data.warnings : [],
    };
  }
  return { results: [], warnings: [] };
}

// PUBLIC_INTERFACE
export async function analyzeGrowth(payload) {
  /**
   * PUBLIC_INTERFACE
   * Call the backend to analyze growth.
   * payload: {
   *   tickers: string[],
   *   start_date: 'YYYY-MM-DD',
   *   end_date: 'YYYY-MM-DD',
   *   min_growth_pct?: number,
   *   max_growth_pct?: number,
   *   limit?: number,
   *   price_field?: 'close' | 'adj_close' | 'open',
   *   universe?: 'NASDAQ' | 'SP500'
   * }
   * Returns {results, warnings}.
   */
  const url = buildUrl('/analyze-growth');
  // Log for verification
  try {
    // Minimal, non-PII logging for E2E verification
    // eslint-disable-next-line no-console
    console.log('[analyzeGrowth] POST', url, {
      tickers_preview: Array.isArray(payload?.tickers) ? payload.tickers.slice(0, 5) : undefined,
      start_date: payload?.start_date,
      end_date: payload?.end_date,
      universe: payload?.universe,
      limit: payload?.limit,
      price_field: payload?.price_field,
    });
  } catch {
    // ignore
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// PUBLIC_INTERFACE
export function getApiBaseUrl() {
  /** Returns the resolved API base URL for display/debug purposes. */
  return BASE_URL;
}
