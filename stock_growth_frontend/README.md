# Stock Growth Frontend (React)

A modern, lightweight React UI for the Stock Growth Analyzer. Users enter tickers, dates, optional growth filters, and view sortable results.

## Configure Backend URL

The frontend calls the FastAPI backend at `/analyze-growth`. Set the base URL via environment variable:

- Copy `.env.example` to `.env` and adjust if needed:
```
REACT_APP_BACKEND_URL=http://localhost:3001
```

If not set, the app defaults to `http://localhost:3001`.

## Run the App

Install dependencies and start the development server:

```
npm install
npm start
```

Open http://localhost:3000 in your browser.

## Usage

1. Enter one or more tickers (comma-separated), e.g., `AAPL, MSFT`.
2. Select Single date or Date range.
3. Optionally set Min/Max growth %, Top N limit, and Price field (close/adj_close/open).
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
- Ensure the backend is running and accessible from the configured REACT_APP_BACKEND_URL.
