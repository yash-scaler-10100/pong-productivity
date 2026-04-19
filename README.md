# ChaosPong

ChaosPong is a Next.js 15 App Router arcade productivity game. Two players click
"Ship It!" to launch neon ping-pong balls, trigger combo effects, and publish
shareable replay posters.

The active app lives at the repository root:

- `app/page.tsx` runs the main canvas game.
- `app/api/save-match/route.ts` saves match data.
- `app/api/get-match/[id]/route.ts` loads published match data.
- `app/match/[id]/page.tsx` renders published replays.

No database service is required. Match data is stored in local JSON files under
`.chaospong-data/` by default. On Vercel, serverless file writes use `/tmp`
unless `LOCAL_DATA_DIR` is provided.

## Deploy on Vercel

1. Import this repository into Vercel.
2. Keep the project root as the Vercel root directory.
3. Optional environment variables:
   - `LOCAL_DATA_DIR`: local JSON storage directory.
   - `CORS_ORIGINS`: optional comma-separated origins for the legacy FastAPI shim.
4. Deploy.

## Local Development

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

The legacy FastAPI shim is still available for older tests and also uses local
JSON storage:

```bash
python -m pip install -r requirements.txt
uvicorn backend.server:app --reload --host 0.0.0.0 --port 8000
```
