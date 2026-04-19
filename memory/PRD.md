# Zenith - The Ephemeral Physics Productivity Arena
**Version**: v1 MVP  
**Date**: 2026-04-19

## Original Problem Statement
Build Zenith - a browser-first, full-screen productivity arena that combines:
1. **The Jar**: Fixed-capacity jar with weighted, physics-simulated stones (Stones/Pebbles/Sand)
2. **The Arena**: Real-time Pong match where shipping tasks speeds up the ball
3. **Ephemerality**: Everything resets at midnight, history saved as replay posters

## Architecture
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui + Canvas API (2D physics)
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Physics**: Custom 2D gravity/collision simulation (no external engine)
- **Game**: requestAnimationFrame-based Pong with particle effects

## User Personas
- Solo knowledge workers wanting visceral daily prioritization
- Hackathon teams wanting gamified productivity tracking
- Indie hackers wanting beautiful, ephemeral daily planning

## Core Requirements (Static)
- [x] Ephemeral Jar with physics simulation (gravity, collision, settling)
- [x] Task weighting: Stone (30 vol), Pebble (15 vol), Sand (5 vol), Max 100
- [x] Ship It! mechanic (task completion → particles + pong ball speed boost)
- [x] Full-Screen Pong Arena with paddles, ball physics, score
- [x] Combo system (ships within 3 min → "FLOW STATE" + multiplier)
- [x] Live HUD: score, fuel tank, midnight countdown, shipped count
- [x] View toggle: JAR / SPLIT / ARENA
- [x] Daily Reset + Replay Poster (canvas-drawn, downloadable PNG)
- [x] MongoDB persistence for tasks, sessions, replays

## What's Been Implemented (v1 MVP - 2026-04-19)
- Full backend API: tasks CRUD, ship, session management, replay storage
- Jar physics canvas: gravity simulation, stone-stone collision, particle explosions
- Pong game canvas: ball physics, paddle control (arrows), AI opponent, combo detection
- Task panel: type selector (stone/pebble/sand), add/ship/delete, volume meter
- HUD: branding, shipped count, midnight countdown, fuel bar, score, view toggle
- Replay modal: canvas-rendered poster with stats, downloadable as PNG
- Dark cyber-neon theme: #0A0A0A bg, #00FFCC/#FF00AA accents, CRT scanlines, ambient glows
- Google Fonts: Unbounded (headings), JetBrains Mono (body)
- All interactive elements have data-testid attributes
- 100% test pass rate (13/13 backend, full frontend E2E)

## Prioritized Backlog
### P0 (Must Have - Deferred)
- None (MVP complete)

### P1 (Should Have)
- Sound effects (Web Audio API) for ship, combo, ball bounce
- Duo mode: two-player local controls (arrow keys + W/S)
- Task drag-and-drop reordering in panel
- Matter.js upgrade for more realistic jar physics
- Inactivity detection (15-min no-ship → ball slows + sad particles)

### P2 (Nice to Have)
- Mobile responsive layout (stack views vertically)
- WebSocket real-time sync for remote duo
- Past replays gallery page
- Framer Motion animations for UI transitions
- Custom stone shapes (not just circles)
- Daily streak tracking across days

## Next Tasks
1. Add sound effects (ship, combo, ball bounce)
2. Implement local duo mode (two keyboard inputs)
3. Add inactivity slowdown mechanic
4. Enhance poster design with more stats and timeline
5. Add task drag-and-drop in panel

## Streak System (Added 2026-04-19)
- Backend: `/api/streak` endpoint calculates consecutive days with 3+ shipped tasks
- Tracks: current streak, today's progress, ships needed, streak at risk, best ever
- Best streak persisted in `db.stats` collection via `$max` operator
- Frontend HUD: Flame icon with fire glow animation, tooltip with details
- Streak at risk: shows "ship X more!" nudge when yesterday's streak might expire
- Replay Modal: two tabs — Day Poster (1200x630) and Streak Card (1080x1080 square)
- Streak Card: canvas-drawn fire symbol, streak number, stats, optimized for social sharing
- Day Poster: now includes streak badge next to ZENITH title
