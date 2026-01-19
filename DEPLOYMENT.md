# Deployment (Vercel) — Stock Growth Analyzer Frontend

This document describes how to deploy the React Create React App (CRA) frontend (`stock_growth_frontend`) to Vercel, including required environment variables, build settings, a post-deploy checklist, and troubleshooting notes.

## Repository and app location

The CRA frontend lives at:

`stock-growth-analyzer-221696-221706/stock_growth_frontend`

In Vercel, set this as the **Root Directory** if importing the monorepo root.

## Vercel environment variables

In Vercel, go to **Project Settings → Environment Variables** and set the following variables. These values are compiled into the frontend bundle at build time (Create React App exposes `REACT_APP_*` variables).

### Required (Production)

Set these for the **Production** environment:

- `REACT_APP_API_BASE` = `https://api.stockgrowthanalyzer.com/api/v1`
- `REACT_APP_NODE_ENV` = `production`
- `REACT_APP_LOG_LEVEL` = `info`
- `REACT_APP_ENABLE_SOURCE_MAPS` = `false`

### Optional

- `REACT_APP_FEATURE_FLAGS` = *(optional; leave empty if not needed)*
- `REACT_APP_FRONTEND_URL` = *(optional; set after first deploy using the Vercel URL, then redeploy)*

### Notes on how the app uses these variables

The API client resolves its base URL using `process.env.REACT_APP_API_BASE` and falls back to a local default (`http://localhost:3001/api/v1`) when not set. This means you must set `REACT_APP_API_BASE` in Vercel to ensure the deployed frontend points at the production API.

## Vercel build settings (Create React App)

In Vercel, configure these settings (or allow Vercel to detect CRA, then verify they match):

- Framework Preset: **Create React App**
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `build`
- Root Directory: `stock-growth-analyzer-221696-221706/stock_growth_frontend`  
  (when importing from the monorepo root; otherwise set the project root accordingly)

## Step-by-step deployment instructions

### 1) Push the repository to a Git provider

Push this repository to GitHub, GitLab, or Bitbucket. Vercel deployments are typically driven by git commits.

### 2) Create a new Vercel project

1. In Vercel, select **New Project**.
2. Choose **Import Git Repository** and select the repository.
3. In the project configuration:
   1. Set **Root Directory** to `stock-growth-analyzer-221696-221706/stock_growth_frontend`.
   2. Confirm the CRA build settings (see above).

### 3) Configure environment variables

1. Go to **Project Settings → Environment Variables**.
2. Add the variables listed in the previous section for **Production**.
3. Optionally set the same variables for **Preview** and **Development** if you use Vercel preview deployments and want them to call a non-production API.

### 4) Deploy

Trigger the initial deployment by clicking **Deploy** (or by pushing a commit, depending on your workflow).

### 5) (Optional) Set `REACT_APP_FRONTEND_URL` after first deploy and redeploy

After Vercel produces a deployment URL (for example `https://<your-app>.vercel.app`):

1. Add `REACT_APP_FRONTEND_URL` in **Project Settings → Environment Variables** (Production).
2. Trigger a new deployment (for CRA, you must rebuild/redeploy for env var changes to take effect in the bundle).

## Post-deploy verification checklist

Use this checklist after deployment to confirm the frontend behaves as expected.

### UI and layout

- The app loads with the light theme shell and header.
- The header shows the app title “Stock Growth Analyzer” and the status pill.

### Validation and form behavior

- Submitting with missing required fields shows validation messaging.
- Required fields include tickers, start date, and end date, and the form blocks submission until valid.

### Request/response flow

- Submitting a valid query shows a loading state and then results are displayed when returned.
- A completed response renders a results table with at least the ticker and growth columns visible.

### Sorting behavior

- Sorting works on table columns (Ticker/Start/End/Growth).
- Growth sorting is numeric (not lexicographic).

### Rate limit handling

- When the API returns a 429, a rate-limit banner appears.
- Polling resumes automatically after the backoff/Retry-After wait time.

### Mobile responsiveness

- On narrow screens, the form and results sections stack vertically.
- The results table scrolls horizontally rather than breaking layout.
- Tap targets (inputs and buttons) remain comfortably usable.

## Troubleshooting

### API requests fail in production

1. Verify `REACT_APP_API_BASE` is correct and points to a reachable backend:
   `https://api.stockgrowthanalyzer.com/api/v1`
2. Confirm backend CORS is configured to allow the deployed frontend origin (your Vercel domain).
3. If requests work locally but not on Vercel, confirm the Vercel environment variables are set for the correct environment (Production vs Preview vs Development).

### Environment variable changes do not reflect in the deployed app

Create React App embeds `REACT_APP_*` values at build time. After changing environment variables in Vercel:

- Trigger a new build/deployment (redeploy) so the new values are included.

### Wrong frontend path / build output

If the build fails because Vercel is using the wrong folder or output directory:

- Confirm **Root Directory** is `stock-growth-analyzer-221696-221706/stock_growth_frontend`.
- Confirm **Output Directory** is `build`.

## Optional: local production build sanity check

Before deploying, you can run a local production build and serve it as static files.

From `stock-growth-analyzer-221696-221706/stock_growth_frontend`:

```bash
npm install
npm run build
npx serve -s build
```

Then open the served URL and verify that the app behaves correctly and calls the intended API base URL (especially if you are providing `REACT_APP_API_BASE` locally during the build).
