//
// Simple API client for Stock Growth Analyzer
//

const BASE_URL =
  (typeof process !== 'undefined' &&
    process.env &&
    process.env.REACT_APP_BACKEND_URL) ||
  'http://localhost:3001';

/**
 * Build a full URL from a path.
 */
function buildUrl(path) {
  const base = BASE_URL.replace(/\/+$/, '');
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}`;
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
  return data;
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
   *   price_field?: 'close' | 'adj_close' | 'open'
   * }
   * Returns JSON from backend.
   */
  const res = await fetch(buildUrl('/analyze-growth'), {
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
