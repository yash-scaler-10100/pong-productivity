# Pong Productivity

Pong Productivity is now shaped for a direct Vercel deploy:

- `frontend/` builds the Create React App into static assets.
- `api/index.py` exposes the FastAPI app as a Vercel Serverless Function.
- `/api/:path*` routes to the serverless FastAPI function.
- all other paths fall back to `index.html` for the React SPA.

## Deploy on Vercel

1. Import this repository into Vercel.
2. Keep the project root as the Vercel root directory.
3. Add these environment variables in Vercel:
   - `MONGO_URL`: required MongoDB connection string.
   - `DB_NAME`: optional database name, defaults to `pong_productivity`.
   - `CORS_ORIGINS`: optional comma-separated origins, defaults to `*`.
4. Deploy.

The frontend uses same-origin API calls by default, so you do not need
`REACT_APP_BACKEND_URL` on Vercel. If you run the frontend against a separate
backend locally, set `REACT_APP_BACKEND_URL` in `frontend/.env`.

Do not set `ENABLE_HEALTH_CHECK` in Vercel unless you specifically want the
local webpack dev-server health plugin behavior during development; production
builds do not need it.

## Local Development

Backend:

```bash
python -m pip install -r requirements.txt
uvicorn backend.server:app --reload --host 0.0.0.0 --port 8000
```

Frontend:

```bash
yarn install
yarn start
```

For a Vercel-like local run, install the Vercel CLI and use:

```bash
vercel dev
```
