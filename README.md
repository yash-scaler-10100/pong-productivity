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

There is no separate server runtime in this project. All server behavior runs
through Next.js Route Handlers in `app/api`, which Vercel deploys as serverless
functions.

## Deploy on Vercel

1. Import this repository into Vercel.
2. Keep the project root as the Vercel root directory.
3. Optional environment variables:
   - `LOCAL_DATA_DIR`: local JSON storage directory.
4. Deploy.

## Local Development

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`.
