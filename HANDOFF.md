# DistressHub — Session Handoff

Last updated: 2026-06-23
Repo: https://github.com/Zor537/Distress-Hub
Production: https://distresshub-zor1.vercel.app (public, no token)
Aliased: https://distresshub.vercel.app

This file is the canonical "where did we leave off" for the project. Read it
first at the start of any new session, then keep it updated.

---

## 1. What's live right now

| Layer | State |
|---|---|
| **Frontend** | Next.js 16 App Router, Tailwind v4, deployed on Vercel |
| **Database** | Supabase Postgres 17, Mumbai (`ap-south-1`), project ref `whyxeirfudunugmumtsk` |
| **ORM** | Prisma 7 + `@prisma/adapter-pg`, transaction-pooler URL for runtime |
| **Auth** | Env-var password (`distress2026`) via `proxy.ts` cookie gate |
| **Data** | 331 properties (50 hand-seeded + 276 real BAANKNET + smoke-test inserts) |
| **Sources** | BAANKNET ✅ live, IIG ⊘ deferred, IBAPI 🔨 scaffolded |
| **Deployment protection** | Disabled — production URL is public |

### Top-of-mind numbers (snapshot at handoff)
- 331 total properties, 326 from BAANKNET
- 15 distinct banks, 172 distinct cities, true pan-India
- Avg DH Score: 51.4
- 4 IngestRun rows visible at `/admin/ingest`

---

## 2. Routes and surface area

### Public
- `/` — landing
- `/about` — company brief
- `/deals` — filter, sort, paginate
- `/deals/[id]` — single deal w/ DH Score breakdown + editable financial model
- `/login` — password gate

### Env-gated (cookie `dh-auth = distress2026`)
- `/dashboard` — investor view: stats, map, pipeline funnel, top deals
- `/pipeline` — operator kanban (drag-drop across 10 stages, inline notes)
- `/admin/ingest` — scraper run telemetry

### API
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/properties` | Filter+sort+paginate listings |
| GET | `/api/properties/[id]` | Single property + score breakdown |
| POST | `/api/properties/[id]/stage` | Update pipeline stage / notes |
| GET | `/api/properties/[id]/financial-model` | Recompute model with overrides |
| GET | `/api/stats/overview` | Top-line KPIs |
| GET | `/api/stats/pipeline` | Funnel counts by stage |
| POST | `/api/investors/express-interest` | Lead capture |
| POST | `/api/scraper/trigger` | Mock re-scoring trigger (legacy) |
| **POST** | **`/api/ingest`** | **HMAC-signed bulk upsert from scrapers** |
| POST | `/api/auth/login` / `/api/auth/logout` | Cookie gate |

---

## 3. Environment variables

| Var | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | `.env.local`, Vercel (prod+preview) | Supabase transaction pooler (port 6543) |
| `DIRECT_URL` | `.env.local`, Vercel (prod+preview) | Supabase session pooler (port 5432) for Prisma Migrate |
| `DEMO_PASSWORD` | `.env.local`, Vercel | `distress2026` — gates protected routes |
| `INGEST_SECRET` | `.env.local`, Vercel | HMAC secret for scrapers → /api/ingest |
| `NEXT_PUBLIC_APP_NAME` | `.env.local`, Vercel | Display name |
| `NEXT_PUBLIC_TARGET_LISTING_COUNT` | `.env.local`, Vercel | Hero stat target |

Secrets template: [`.env.example`](.env.example). Real values are in
`.env.local` (gitignored) and in Vercel env vars (`npx vercel env ls`).

---

## 4. Hard-won learnings (read before debugging)

### 4.1 Supabase Mumbai pooler is on `aws-1`, not `aws-0`
Standard docs show `aws-0-{region}.pooler.supabase.com`. Mumbai uses **`aws-1-ap-south-1.pooler.supabase.com`**. Different regions are split across different pooler clusters; trust the dashboard's "Connect" string over reconstructing.

Symptom if you get this wrong: `(ENOTFOUND) tenant/user postgres.{ref} not found`.

### 4.2 Supabase direct connections are IPv6-only on free tier
`db.{ref}.supabase.co:5432` has only an AAAA record. macOS on a typical home network can't resolve/connect via IPv6 without manual config. **Always use the pooler** — port 6543 for runtime, port 5432 for migrations.

### 4.3 Prisma 7 requires the URL in `prisma.config.ts`, not `schema.prisma`
Prisma 6 allowed `url = env("DATABASE_URL")` in `datasource db`. Prisma 7 throws:

> The datasource property `url` is no longer supported in schema files.

URLs go in `prisma.config.ts` under `datasource.url`, and the runtime PrismaClient needs an adapter (`@prisma/adapter-pg`).

### 4.4 BAANKNET firewalls AWS/Vercel IPs at the TCP level
`fetch('https://baanknet.com/...')` from a Vercel function fails with `TypeError: fetch failed` in ~10–40ms. Confirmed via control hosts (httpbin/ipify) that work fine from the same function. Vercel's egress IP for us: `13.235.216.76` (AWS Mumbai), blocked.

**Implication**: Automated Vercel Cron for BAANKNET refresh is impossible until partner whitelist. The Python scraper from your laptop works because residential IPs are not blocked.

### 4.5 BAANKNET has a public REST API — no auth, no CSRF, no Playwright needed
Discovered:
```
POST  /eauction-psb/api/get-upcoming-auctions
      body: {"pageSize":50,"page":0,"propertyTypeId":1}
GET   /eauction-psb/api/get-auction-details/{numericId}
```
propertyTypeId: 1=Residential, 2=Commercial, 3=Agricultural, 4=Industrial, 5=Other.

Returns: propertyId, auctionId, bank, location, dates, ReservePrice, EMD.
**Missing** (require authenticated session): title, address, area, images, possession type.

### 4.6 IIG isn't a property auction site
India Investment Grid's "stressed-assets/real-estate" page lists **corporate insolvency proceedings** — e.g. "DHANVERSHA BUILDERS PRIVATE LIMITED". Whole companies, not individual auctions. Doesn't fit our Property model. Would need a separate `StressedCompany` model to ingest meaningfully.

---

## 5. How to run / refresh data

### Local dev
```bash
cd ~/Desktop/Sandbox/distresshub
npm install
npm run dev               # → http://localhost:3000 (talks to Supabase)
```

`npm run db:seed` re-runs `prisma/seed.ts` against Supabase (wipes + reseeds the 54 hand-curated listings).

### Refresh real data from BAANKNET
```bash
cd ~/Desktop/Sandbox/distresshub/scraper
source .venv/bin/activate
DH_BASE_URL=https://distresshub-zor1.vercel.app \
  INGEST_SECRET=$(grep INGEST_SECRET ../.env.local | cut -d'"' -f2) \
  python baanknet.py
```
Takes ~3 min for 276 listings. Re-runs are idempotent (upsert on externalId).

### Deploy
```bash
git push origin main             # Vercel auto-deploys main → production
# or manually
npx vercel --prod --yes
```

### Inspect Supabase
- Dashboard: https://supabase.com/dashboard/project/whyxeirfudunugmumtsk
- Direct SQL via Supabase MCP (already connected in Claude sessions)

---

## 6. Project structure

```
distresshub/
├── app/
│   ├── api/                      # Route handlers
│   │   ├── ingest/route.ts       # HMAC-signed bulk upsert
│   │   ├── properties/...        # Read+update properties
│   │   ├── stats/...             # Dashboard aggregates
│   │   ├── investors/...         # Lead capture
│   │   └── auth/...              # Cookie gate
│   ├── admin/ingest/page.tsx     # Scraper telemetry
│   ├── dashboard/                # Investor view (gated)
│   ├── deals/                    # Public listings + detail
│   ├── pipeline/                 # Kanban (gated)
│   ├── login/                    # Password gate
│   └── about/                    # Company brief
├── components/
│   ├── ui/                       # shadcn primitives
│   ├── DealCard.tsx              # Listing card with source badge
│   ├── DHScoreCard.tsx           # Score breakdown
│   ├── FinancialModel.tsx        # Editable unit economics
│   ├── PropertyMap.tsx           # react-leaflet dark theme
│   ├── PipelineKanban.tsx        # Drag-drop board
│   ├── FilterBar.tsx             # Filter+sort UI
│   └── ...
├── lib/
│   ├── db.ts                     # PrismaClient with pg adapter (singleton)
│   ├── scoring.ts                # DH Score engine (heuristic)
│   ├── financial-model.ts        # Unit economics
│   ├── constants.ts              # Cities, banks, types
│   └── utils.ts                  # cn, formatINR, etc.
├── prisma/
│   ├── schema.prisma             # Postgres schema (4 models)
│   ├── schema.postgres.prisma    # ⚠️ stale duplicate, can be deleted
│   └── seed.ts                   # Loads seed/listings.json
├── scraper/                      # Python BAANKNET scraper
│   ├── baanknet.py               # Production — 276 listings/run
│   ├── push.py                   # Shared HMAC client
│   ├── iig.py                    # Deferred (corporate insolvency data)
│   ├── ibapi.py                  # Scaffolded
│   ├── README.md                 # Setup + IP-block notes
│   └── .venv/                    # gitignored
├── seed/listings.json            # 54 hand-curated NCR listings
├── proxy.ts                      # Cookie auth gate
├── prisma.config.ts              # Prisma 7 datasource URL
└── vercel.json                   # Build command + function maxDuration
```

---

## 7. Decisions deferred (parked, not abandoned)

- **Vercel Cron for BAANKNET** — blocked at TCP. Revisit after partner whitelist.
- **IIG ingestion** — would need a new model. Skipped for now.
- **IBAPI ingestion** — scaffolded but DOM-based; needs revalidation.
- **Authenticated BAANKNET scrape** — unlocks rich detail fields (title, area, images). Requires partner sign-up.
- **`lib/store.ts`** — obsolete in-memory backend, kept in git history. Safe to `rm` next session.
- **`prisma/schema.postgres.prisma`** — duplicate of `schema.prisma` now that we're already on Postgres. Safe to delete.

---

## 8. Next-session to-do — start from the top

The growth plan is documented in `~/.claude/plans/i-want-to-begin-keen-spark.md`.
Current phase is moving from Phase 1 (✅ complete) into **Phase 2**.

### Phase 2 — Investor actions + monetisation (recommended next, ~2 weeks)

Pick one to begin. Each is independently shippable.

#### 8.1 Real auth via Clerk (~2-3 hours)
- Sign up at https://clerk.com
- `npm i @clerk/nextjs`
- Replace `proxy.ts` env-password with `clerkMiddleware`
- Add `User` model in Prisma keyed on Clerk user ID
- Sign-up via Indian phone OTP works out of the box
- **Verify**: sign up → redirected to /dashboard, /pipeline accessible

#### 8.2 Watchlists (~3-4 hours)
- New Prisma model `Watchlist { id, userId, propertyId, createdAt }`
- `<WatchlistButton>` component (heart icon, optimistic toggle)
- Drop into `DealCard` and `/deals/[id]` sidebar
- New page `/watchlist` reusing `DealCard` grid
- Needs Clerk first (depends on User)
- **Verify**: heart a deal → see it at /watchlist. Sign out → empty.

#### 8.3 AI diligence memo PDF (~4-6 hours, the highest-WOW)
- `npm i @react-pdf/renderer @anthropic-ai/sdk`
- New route `app/api/properties/[id]/memo/route.ts`
- Calls Claude API with DH Score signals + financial model
- Server-renders to PDF
- "Generate Memo" button on `/deals/[id]`
- **Verify**: click → PDF downloads with Claude-written narrative

#### 8.4 Pricing + Stripe (~6-8 hours)
- Stripe products: Investor ₹4,999/mo, Family Office ₹24,999/mo
- New webhook route `app/api/billing/webhook/route.ts`
- New `/pricing` page
- Add `Subscription` Prisma model
- Gating middleware: watchlist size, memo generation
- Needs Clerk first
- **Verify**: test card upgrades, watchlist limit lifts

### Other low-effort wins (anytime)

- **Cleanup obsolete files**: `rm lib/store.ts prisma/schema.postgres.prisma`. Verify build still passes.
- **Custom domain**: buy distresshub.com or pick alternative, point at Vercel. Adds polish.
- **Deepen seed data**: add 100 more curated listings for Mumbai/Bangalore/Hyderabad — boosts pan-India "feel" without scraping.
- **Refresh BAANKNET data**: `python scraper/baanknet.py` ~once a week from your laptop.

### When you re-engage with BAANKNET partner

Once they whitelist a Vercel-side scraper or provide authenticated API:
1. Resurrect `/api/cron/scrape-baanknet` from git history (commit `b62bce5`)
2. Restore `crons` block in `vercel.json`
3. Add `CRON_SECRET` back to env
4. Adapt the BAANKNET API call to whatever auth they require
5. **Bonus**: now we can also get title/address/area/images per listing

---

## 9. Commit history (last 10, this stretch)

```
b62bce5  revert: drop Vercel Cron, BAANKNET firewalls AWS IPs
1095156  chore: probe BAANKNET + control hosts from Vercel
3ec408d  chore: debug endpoint for BAANKNET reachability from Vercel
24fd497  chore: better error logging in cron-baanknet
7874701  feat: Vercel Cron — daily BAANKNET refresh    (revert b62bce5)
02c3d7c  feat: BAANKNET production scraper, 276 listings ingested
44572a5  feat: migrate from in-memory store to Supabase Postgres
8b3fae3  feat(phase1): ingest endpoint, scraper toolkit, admin telemetry
07ca05c  build: exclude prisma seed from tsconfig
34c2b1d  feat: in-memory store for Vercel serverless
```

---

## 10. Quick reference URLs

- Production: https://distresshub-zor1.vercel.app
- GitHub: https://github.com/Zor537/Distress-Hub
- Vercel project: https://vercel.com/zor1/distresshub
- Supabase project: https://supabase.com/dashboard/project/whyxeirfudunugmumtsk
- Growth roadmap: `~/.claude/plans/i-want-to-begin-keen-spark.md`
