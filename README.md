# Distress Hub

India's real-time distressed real estate intelligence platform. Demo build per Tech Brief.

## Quick start (local)

```bash
# 1. Install deps
npm install

# 2. Run migrations + seed 50 NCR listings
npx prisma migrate dev --name init
npx tsx prisma/seed.ts

# 3. Boot dev server
npm run dev
# → http://localhost:3000

# OR boot via Vercel CLI (same machine, no deploy)
npx vercel dev
```

### Demo credentials

- **Login URL**: http://localhost:3000/login
- **Password**: `distress2026` (from `DEMO_PASSWORD` in `.env.local`)
- **Protected routes**: `/dashboard`, `/pipeline`

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router (Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind v4 + custom shadcn-style primitives |
| Database | SQLite via Prisma 7 + `@prisma/adapter-better-sqlite3` (swap to Supabase Postgres by changing `provider` + `DATABASE_URL`) |
| Maps | react-leaflet + OpenStreetMap (no token needed) |
| Charts | Recharts |
| Validation | zod |

## Routes

### Public

- `/` — Landing (hero, problem, three-pillar stack, source coverage, CTA)
- `/about` — Company brief
- `/deals` — Filterable listing of all scored deals
- `/deals/[id]` — Single deal: DH Score breakdown, editable financial model, map, express-interest

### Investor portal (env-gated)

- `/dashboard` — Stat cards, dark-themed map, pipeline funnel, top-scored deals
- `/pipeline` — Drag-and-drop Kanban across 10 stages, inline notes

### Auth

- `/login` — Demo password gate

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/properties` | Filtered list (city, type, bank, minScore, maxPrice, possessionType, sort) |
| GET | `/api/properties/[id]` | Full property + signal explanations |
| POST | `/api/properties/[id]/stage` | Update pipeline stage and/or notes |
| GET | `/api/properties/[id]/financial-model` | Compute model with optional override query params |
| GET | `/api/stats/overview` | Dashboard summary KPIs |
| GET | `/api/stats/pipeline` | Funnel counts by stage |
| POST | `/api/investors/express-interest` | Investor lead capture (upserts Investor + creates InvestorInterest) |
| POST | `/api/scraper/trigger` | Mock BAANKNET ingest — re-runs scoring against existing DB |
| POST | `/api/auth/login` | Sets `dh-auth` cookie |
| GET | `/api/auth/logout` | Clears cookie, redirects |

All write endpoints validate with zod.

## DH Score (lib/scoring.ts)

Deterministic heuristic. Five weighted signals:

- Discount to FMV (35%)
- Title health proxy via bank tier (20%)
- Possession state (15%)
- Liquidity proxy via city tier (20%)
- Renovation lift by property type (10%)

ML model with comp-regression + EC parsing ships Q1 FY27.

## Financial model (lib/financial-model.ts)

Editable assumptions: renovation cost, hold months, appreciation %, rental yield %, stamp duty %, brokerage %, legal DD. Recomputes MOIC, annualised ROI, IRR live. CSV export from the detail page.

## Notes vs original brief

The brief targets Next.js 14 + Supabase Postgres + Mapbox. This build is identical in shape but:

- **Next.js 16** (default from `create-next-app@latest`) — `middleware.ts` is now `proxy.ts`, `params`/`searchParams` are `Promise<>`.
- **SQLite via Prisma 7** for zero-setup local dev. Swap `provider = "sqlite"` to `"postgresql"` and point `DATABASE_URL` at Supabase to go to prod.
- **react-leaflet** instead of Mapbox — no token required, identical dark-theme aesthetic via CSS filters on the tile layer.
- Python BAANKNET scraper is documented in the brief but stubbed as `/api/scraper/trigger` (re-scores existing DB). Implement the headless Playwright scraper in `scraper/baanknet.py` for v1.
