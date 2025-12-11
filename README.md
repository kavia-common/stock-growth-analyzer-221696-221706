# stock-growth-analyzer-221696-221706

This workspace contains the React frontend for the Stock Growth Analyzer.

Integration notes:
- Frontend calls backend `POST /analyze-growth` at REACT_APP_BACKEND_URL (default http://localhost:3001).
- Create `stock_growth_frontend/.env` based on `.env.example` if you need to override defaults.
- Backend must allow CORS from `http://localhost:3000` for local dev.