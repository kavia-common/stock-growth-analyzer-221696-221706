//
//
// Simple API client for Stock Growth Analyzer
//
 // Prefer explicit env override; otherwise infer from window origin replacing :3000 -> :3001.
 // When the frontend is served via HTTPS (e.g., cloud preview), ensure the base URL is also HTTPS
 // to avoid mixed-content and CORS issues behind the proxy. Fallback to localhost:3001.
//
let __BASE_URL_PIN = null; // optional runtime pin override for diagnostics

function resolveBaseUrl() {
  // Runtime pin takes highest precedence (diagnostics and quick override without rebuild)
  if (__BASE_URL_PIN && typeof __BASE_URL_PIN === 'string') {
    return __BASE_URL_PIN.trim();
  }

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
        return u.toString().replace(/\/*$/, '');
      }
      // If not on 3000, still try same origin (proxy setups)
      return window.location.origin.replace(/\/*$/, '');
    } catch {
      // ignore
    }
  }
  return 'http://localhost:3001';
}

let BASE_URL = resolveBaseUrl();

/**
 * Build a full URL from a path.
 */
function buildUrl(path) {
  const base = BASE_URL.replace(/\/*$/, '');
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
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // Note: credentials omitted by default. If your backend expects cookies, set credentials: 'include'
      // and ensure backend CORS allows credentials and exact origin (no wildcard).
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    // More descriptive message for typical "Failed to fetch" / CORS / mixed content issues
    const hint = `Network error calling ${url}. This may be due to CORS, incorrect REACT_APP_BACKEND_URL, or HTTPS/HTTP mismatch.`;
    const err = new Error(`${networkErr?.message || 'Failed to fetch'} - ${hint}`);
    err.cause = networkErr;
    throw err;
  }
  return handleResponse(res);
}

// PUBLIC_INTERFACE
export function getApiBaseUrl() {
  /** Returns the resolved API base URL for display/debug purposes. */
  return BASE_URL;
}

// PUBLIC_INTERFACE
export function getApiBaseUrlDetails() {
  /**
   * PUBLIC_INTERFACE
   * Return details about how the BASE_URL was determined.
   * { baseUrl, source: 'runtime-pin' | 'env' | 'inferred' | 'fallback' }
   */
  let source = 'fallback';
  if (__BASE_URL_PIN) {
    source = 'runtime-pin';
  } else if (
    typeof process !== 'undefined' &&
    process.env &&
    process.env.REACT_APP_BACKEND_URL &&
    process.env.REACT_APP_BACKEND_URL.trim()
  ) {
    source = 'env';
  } else if (typeof window !== 'undefined' && window.location && window.location.origin) {
    source = 'inferred';
  }
  return { baseUrl: BASE_URL, source };
}

// PUBLIC_INTERFACE
export function pinApiBaseUrl(url) {
  /**
   * PUBLIC_INTERFACE
   * Pin/override the API base URL at runtime (useful for diagnosing HTTPS/proxy issues without rebuild).
   * Example (in browser console):
   *   import { pinApiBaseUrl, diagnosticsRun } from './api/client';
   *   pinApiBaseUrl('https://vscode-internal-26796-beta.beta01.cloud.kavia.ai:3001');
   *   diagnosticsRun();
   */
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('pinApiBaseUrl(url): url must be a non-empty string');
  }
  __BASE_URL_PIN = url.trim();
  BASE_URL = resolveBaseUrl();
  // eslint-disable-next-line no-console
  console.log('[pinApiBaseUrl] BASE_URL pinned to:', BASE_URL);
  return BASE_URL;
}

// PUBLIC_INTERFACE
export async function runMinimalRepro() {
  /**
   * PUBLIC_INTERFACE
   * Minimal repro for QA: performs the specified POST /analyze-growth request
   * with empty tickers, start_date=2025-11-11, end_date=2025-12-11, universe=NASDAQ, limit=10.
   * Usage (in browser console): import { runMinimalRepro } from './api/client'; runMinimalRepro()
   */
  const payload = {
    start_date: '2025-11-11',
    end_date: '2025-12-11',
    limit: 10,
    universe: 'NASDAQ',
  };
  // eslint-disable-next-line no-console
  console.log('[runMinimalRepro] Using base URL:', BASE_URL);
  try {
    const data = await analyzeGrowth(payload);
    // eslint-disable-next-line no-console
    console.log('[runMinimalRepro] Response:', data);
    return data;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[runMinimalRepro] Error:', e);
    throw e;
  }
}

// PUBLIC_INTERFACE
export async function diagnosticsRun() {
  /**
   * PUBLIC_INTERFACE
   * Run a comprehensive diagnostics sequence to debug CORS/HTTPS/preflight and request URL resolution.
   * Steps:
   * 1) Log getApiBaseUrlDetails()
   * 2) Perform OPTIONS preflight to /analyze-growth and log status/headers
   * 3) Perform POST with the minimal payload and log details (status, headers, JSON or text)
   * Returns an object with captured details for further inspection.
   */
  const details = {
    baseUrl: getApiBaseUrl(),
    baseUrlDetails: getApiBaseUrlDetails(),
    preflight: null,
    post: null,
  };

  const preflightUrl = buildUrl('/analyze-growth');
  try {
    const preRes = await fetch(preflightUrl, {
      method: 'OPTIONS',
      headers: {
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
        Origin: typeof window !== 'undefined' ? window.location.origin : '',
      },
    });
    const preHeaders = {};
    preRes.headers.forEach((v, k) => (preHeaders[k] = v));
    details.preflight = {
      url: preflightUrl,
      status: preRes.status,
      ok: preRes.ok,
      headers: preHeaders,
    };
    // eslint-disable-next-line no-console
    console.log('[diagnosticsRun] Preflight OPTIONS', details.preflight);
  } catch (e) {
    details.preflight = {
      url: preflightUrl,
      error: `${e?.message || e}`,
    };
    // eslint-disable-next-line no-console
    console.warn('[diagnosticsRun] Preflight OPTIONS error', details.preflight);
  }

  const payload = {
    start_date: '2025-11-11',
    end_date: '2025-12-11',
    limit: 10,
    universe: 'NASDAQ',
  };

  const postUrl = preflightUrl;
  try {
    const postRes = await fetch(postUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const postHeaders = {};
    postRes.headers.forEach((v, k) => (postHeaders[k] = v));
    const contentType = postRes.headers.get('content-type') || '';
    let body;
    try {
      body = contentType.includes('application/json') ? await postRes.json() : await postRes.text();
    } catch (parseErr) {
      body = `Response parse error: ${parseErr?.message || parseErr}`;
    }
    details.post = {
      url: postUrl,
      status: postRes.status,
      ok: postRes.ok,
      headers: postHeaders,
      body,
    };
    // eslint-disable-next-line no-console
    console.log('[diagnosticsRun] POST', details.post);
  } catch (e) {
    details.post = {
      url: postUrl,
      error: `${e?.message || e}`,
      hint:
        'If error is "Failed to fetch", it is usually due to CORS or HTTPS/HTTP mismatch. Ensure backend CORS allows the exact frontend origin and the backend URL is HTTPS on cloud preview.',
    };
    // eslint-disable-next-line no-console
    console.warn('[diagnosticsRun] POST error', details.post);
  }

  return details;
}
