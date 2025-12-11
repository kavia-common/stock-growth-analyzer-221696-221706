# Stock Growth Frontend (React)

A modern, lightweight React UI for the Stock Growth Analyzer. Users enter tickers, dates, optional growth filters, and view sortable results.

## Configure Backend URL

The frontend posts to the FastAPI backend endpoint `POST /analyze-growth` with a JSON payload:
- tickers: string[] (e.g., ["AAPL","MSFT"])
- start_date: YYYY-MM-DD
- end_date: YYYY-MM-DD (same as start_date for single date mode)
- min_growth_pct?: number
- max_growth_pct?: number
- limit?: number
- price_field?: "close" | "adj_close" | "open"

Set the base backend URL via environment variable:
- Copy `.env.example` to `.env` and adjust if needed:
```
REACT_APP_BACKEND_URL=http://localhost:3001
```

If not set, the app tries to infer the backend by replacing port 3000 -> 3001 on the current origin. Finally falls back to `http://localhost:3001`.

Backend CORS: Ensure the backend includes `http://localhost:3000` in its allowed origins list so the browser can call it during local development.

## Verify backend and CORS quickly

- Open the backend docs/health on: http://localhost:3001/docs
- GET http://localhost:3001/ (should return {"message": "Healthy"})
- GET http://localhost:3001/cors-info (returns `allowed_origins` and a base URL hint)

If your frontend runs at a preview HTTPS origin, add that exact origin to the backend `ALLOWED_ORIGINS` (comma-separated) and restart backend.

## Run the App

Install dependencies and start the development server:

```
npm install
npm start
```

Open http://localhost:3000 in your browser.

## Minimal repro (empty tickers, last month)

From the browser console in the app (http://localhost:3000), run:
```js
import { runMinimalRepro } from './api/client';
runMinimalRepro();
```
This submits:
```json
{
  "start_date": "2025-11-11",
  "end_date": "2025-12-11",
  "limit": 10,
  "universe": "NASDAQ"
}
```
and logs the response or any error details to the console.

## Usage

1. Enter one or more tickers (comma-separated), e.g., `AAPL, MSFT`. You may also leave tickers empty to fetch top movers from NASDAQ/SP500.
2. Select Single date or Date range.
3. Optionally set Min/Max growth %, Top N limit (defaults to 10 if left empty), and Price field (close/adj_close/open).
4. Click Analyze Growth to fetch and display results.
5. Click on table headers to sort by a column (e.g., Growth %).

The last used inputs are saved to localStorage for convenience.

## Build

```
npm run build
```

Outputs a production build in the `build` folder.

## Notes

- Theme toggle (Light/Dark) is available in the top bar.
- Ensure the backend is running and accessible from the configured REACT_APP_BACKEND_URL (default http://localhost:3001).
- If you get a CORS error in the browser console, add `http://localhost:3000` (and/or your preview origin) to the backend's ALLOWED_ORIGINS and restart the backend.
