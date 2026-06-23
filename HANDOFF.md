# DistressHub — Session Handoff

Last updated: 2026-06-23 (Phase 2.3 fully shipped — G/L/M enrichments + Claude live in prod)
Repo: https://github.com/Zor537/Distress-Hub
Production: https://distresshub-zor1.vercel.app (public, no token)
Aliased: https://distresshub.vercel.app
Latest commit: `d7f7319` — `feat: G+L+M memo enrichments live on PDF and webpage`

This file is the canonical "where did we leave off" for the project. Read it
first at the start of any new session, then keep it updated.

---

## 1. What's live right now

| Layer | State |
|---|---|
| **Frontend** | Next.js 16 App Router + Turbopack, Tailwind v4, deployed on Vercel |
| **Database** | Supabase Postgres 17, Mumbai (`ap-south-1`), project ref `whyxeirfudunugmumtsk` |
| **ORM** | Prisma 7 + `@prisma/adapter-pg`, transaction-pooler URL for runtime |
| **Auth** | Env-var password (`distress2026`) via `proxy.ts` cookie gate. Clerk wiring parked on `feat/clerk-auth` |
| **Data** | **401 properties** across 179 cities, 22 states; 11 MB DB (~2% of 500 MB free tier) |
| **Sources** | BAANKNET (326), MANUAL (71), IBAPI (2 test rows), IIG (2 test rows). Last ingest: 2026-06-23 06:20 IST (MANUAL). |
| **AI memo PDF** | ✅ **Live, 3 pages, full Claude narrative + counter-thesis + change-my-mind** at `/api/properties/[id]/memo`. Falls back to heuristic without `ANTHROPIC_API_KEY` |
| **AI insights JSON** | ✅ **Live** at `/api/properties/[id]/insights` — same Claude payload as PDF, shared 30-min cache |
| **Deal page enrichments** | ✅ **`DealInsights`** component + **`ShareMemoButton`** + memo download — narrative, counter-thesis, change-my-mind in-page |
| **Deployment protection** | Disabled — production URL is public |

### Top-of-mind numbers (live, 2026-06-23)
- **401** total properties · **179** cities · **22** states · pan-India
- **16** distinct banks (incl. Bank of Maharashtra, Indian Bank, Indian Overseas Bank, Central Bank of India via BAANKNET)
- **6** ingest runs visible at `/admin/ingest`; last run 2026-06-23 06:20 IST
- **133** properties with auctions still upcoming
- DH Score: **avg 54**, **21** properties at ≥ 80 (the "hot deals" tier surfaced on `/dashboard`)
- Lead pipeline: **0** Express Interest submissions to date (no leads from public traffic yet)
- DB: **11 MB** used of 500 MB free tier; ~4,000 properties of headroom before Supabase Pro is needed
- Memo PDF: 3 pages, ~3–8 s cold (Claude call), instant on cache hit. Valid PDF v1.3.
- Claude calls cached 30 min per property — PDF + webpage insights share the same cache.
- Anthropic spend to date: **< $1** (well under any threshold; see [COST_GUIDE.md](COST_GUIDE.md))

---

## 2. Routes and surface area

### Public
- `/` — landing
- `/about` — company brief
- `/deals` — filter, sort, paginate
- `/deals/[id]` — single deal w/ DH Score breakdown, **AI insights**, editable financial model, share-memo button
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
| **GET** | **`/api/properties/[id]/memo`** | **3-page PDF investor memo (Claude + DH Score + scenarios + sensitivity + diligence + counter-thesis + change-my-mind)** |
| **GET** | **`/api/properties/[id]/insights`** | **JSON: `{narrative, risks, counterThesis, changeMyMind}` — shared cache with memo** |
| GET | `/api/stats/overview` | Top-line KPIs |
| GET | `/api/stats/pipeline` | Funnel counts by stage |
| POST | `/api/investors/express-interest` | Lead capture |
| POST | `/api/ingest` | HMAC-signed bulk upsert from scrapers |
| POST | `/api/auth/login` / `/api/auth/logout` | Cookie gate |

---

## 3. AI memo PDF — 10 enrichments shipped

All on production, gated by `ANTHROPIC_API_KEY` with heuristic fallback. PDF is
3 pages; webpage `/deals/[id]` shows the narrative, counter-thesis, and
change-my-mind blocks via the `DealInsights` client component.

| Tag | Enrichment | Where |
|---|---|---|
| **A** | 3-paragraph investment narrative | PDF p1 + webpage |
| **C** | Bull / Base / Bear scenarios with assumption deltas | PDF p1 |
| **D** | DH Score circle + signal explanations | PDF p1 |
| **E** | Risk register (severity-coded) | PDF p2 |
| **F** | Locality block — distance to airport / CBD / IT-hub | PDF p1 |
| **G** | **"What Would Change Our Mind"** — 2–3 falsifiable diligence findings | PDF p3 + webpage |
| **J** | Diligence checklist by property type (4 common + 3 type-specific) | PDF p2 |
| **K** | Sensitivity grid (3×3 IRR/MOIC across discount × hold) | PDF p2 |
| **L** | **Counter-thesis paragraph** — bear case in prose | PDF p3 + webpage |
| **M** | **Share memo button** — copies PDF URL to clipboard with fallback | webpage |

### Shared Claude cache architecture

`lib/insights.ts` (new this session) is the single source of truth for AI text:

```
GET /memo  ┐
           ├──→ getInsightsFor(ctx) ──→ in-memory Map (TTL 30 min)
GET /insights ┘                          └─→ cache miss: Anthropic SDK call
                                                ↳ haiku-4-5, JSON-shaped prompt
```

- One Claude call serves both endpoints for 30 min per property.
- Falls back to a deterministic heuristic when `ANTHROPIC_API_KEY` is unset.
- Returns `{narrative: string[], risks: Risk[], counterThesis: string, changeMyMind: string[]}`.

---

## 4. Environment variables

| Var | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | `.env.local`, Vercel (prod+preview) | Supabase transaction pooler (port 6543) |
| `DIRECT_URL` | `.env.local`, Vercel (prod+preview) | Supabase session pooler (port 5432) for Prisma Migrate |
| `DEMO_PASSWORD` | `.env.local`, Vercel | `distress2026` — gates protected routes |
| `INGEST_SECRET` | `.env.local`, Vercel | HMAC secret for scrapers → /api/ingest |
| **`ANTHROPIC_API_KEY`** | **`.env.local`, Vercel (prod) ✅ SET** | **Claude `haiku-4-5` for memo + insights. Falls back to heuristic if unset.** |
| `CLERK_*` | `feat/clerk-auth` branch only | Awaiting Clerk signup — keys go in `.env.local` + Vercel env when ready |
| `NEXT_PUBLIC_APP_NAME` | `.env.local`, Vercel | Display name |
| `NEXT_PUBLIC_TARGET_LISTING_COUNT` | `.env.local`, Vercel | Hero stat target |

Secrets template: [`.env.example`](.env.example). Real values are in
`.env.local` (gitignored) and in Vercel env vars (`npx vercel env ls`).

---

## 5. Hard-won learnings (read before debugging)

### 5.1 Supabase Mumbai pooler is on `aws-1`, not `aws-0`
Standard docs show `aws-0-{region}.pooler.supabase.com`. Mumbai uses **`aws-1-ap-south-1.pooler.supabase.com`**. Different regions are split across different pooler clusters; trust the dashboard's "Connect" string over reconstructing.

Symptom if you get this wrong: `(ENOTFOUND) tenant/user postgres.{ref} not found`.

### 5.2 Supabase direct connections are IPv6-only on free tier
`db.{ref}.supabase.co:5432` has only an AAAA record. macOS on a typical home network can't resolve/connect via IPv6 without manual config. **Always use the pooler** — port 6543 for runtime, port 5432 for migrations.

### 5.3 Prisma 7 requires the URL in `prisma.config.ts`, not `schema.prisma`
Prisma 6 allowed `url = env("DATABASE_URL")` in `datasource db`. Prisma 7 throws:

> The datasource property `url` is no longer supported in schema files.

URLs go in `prisma.config.ts` under `datasource.url`, and the runtime PrismaClient needs an adapter (`@prisma/adapter-pg`).

### 5.4 BAANKNET firewalls AWS/Vercel IPs at the TCP level
`fetch('https://baanknet.com/...')` from a Vercel function fails with `TypeError: fetch failed` in ~10–40ms. Confirmed via control hosts that work fine from the same function. Vercel's egress IP for us: `13.235.216.76` (AWS Mumbai), blocked.

**Implication**: Automated Vercel Cron for BAANKNET refresh is impossible until partner whitelist. The Python scraper from your laptop works because residential IPs are not blocked.

### 5.5 BAANKNET has a public REST API — no auth, no CSRF, no Playwright needed
```
POST  /eauction-psb/api/get-upcoming-auctions
      body: {"pageSize":50,"page":0,"propertyTypeId":1}
GET   /eauction-psb/api/get-auction-details/{numericId}
```
propertyTypeId: 1=Residential, 2=Commercial, 3=Agricultural, 4=Industrial, 5=Other.

Returns: propertyId, auctionId, bank, location, dates, ReservePrice, EMD.
**Missing** (require authenticated session): title, address, area, images, possession type.

### 5.6 IIG isn't a property auction site
India Investment Grid's "stressed-assets/real-estate" page lists **corporate insolvency proceedings** — whole companies, not individual auctions. Doesn't fit our Property model. Would need a separate `StressedCompany` model to ingest meaningfully.

### 5.7 PDF variable shadowing trap
In `lib/memo-pdf.tsx`, do not reuse `p` for both the property destructure and parsed Claude output. Use `out` (or similar) for the parsed insights to avoid silent name collisions inside React-PDF document trees.

### 5.8 G/L/M pushed PDF to 3 pages
With counter-thesis + change-my-mind added, the two-column page-2 grid overflowed. The fix: a full-width row below the page-2 grid that carries counter-thesis and change-my-mind. Layout no longer assumes a fixed 2-page document.

---

## 6. How to run / refresh data

### Local dev
```bash
cd ~/Desktop/Sandbox/distresshub
npm install
npm run dev               # → http://localhost:3000 (talks to Supabase)
```

`npm run db:seed` re-runs `prisma/seed.ts` against Supabase (wipes + reseeds the 54 hand-curated NCR listings).

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

## 7. Project structure

```
distresshub/
├── app/
│   ├── api/                      # Route handlers
│   │   ├── ingest/route.ts       # HMAC-signed bulk upsert
│   │   ├── properties/[id]/
│   │   │   ├── route.ts          # Single property
│   │   │   ├── financial-model/  # Recompute with overrides
│   │   │   ├── insights/         # NEW — JSON insights (shared cache)
│   │   │   ├── memo/             # PDF memo (shared cache)
│   │   │   └── stage/            # Pipeline mutations
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
│   ├── DealInsights.tsx          # NEW — client-side fetch of /insights
│   ├── DHScoreCard.tsx           # Score breakdown
│   ├── ExpressInterest.tsx       # Lead capture modal
│   ├── FinancialModel.tsx        # Editable unit economics
│   ├── GenerateMemoButton.tsx    # Download PDF via fetch+blob
│   ├── ShareMemoButton.tsx       # NEW — copy PDF URL to clipboard
│   ├── PropertyMap.tsx           # react-leaflet dark theme
│   ├── PipelineKanban.tsx        # Drag-drop board
│   ├── FilterBar.tsx             # Filter+sort UI
│   └── ...
├── lib/
│   ├── db.ts                     # PrismaClient with pg adapter (singleton)
│   ├── scoring.ts                # DH Score engine (heuristic)
│   ├── financial-model.ts        # Unit economics + sensitivity grid + tax breakdown
│   ├── scenarios.ts              # Bull/Base/Bear with assumption deltas
│   ├── locality.ts               # Haversine to airport/CBD/IT-hub (17 cities)
│   ├── diligence.ts              # Type-aware checklist (7 items)
│   ├── insights.ts               # NEW — shared Claude call + 30-min cache
│   ├── memo-pdf.tsx              # 3-page React-PDF document
│   ├── constants.ts              # Cities, banks, types
│   └── utils.ts                  # cn, formatINR, parseJsonField, etc.
├── prisma/
│   ├── schema.prisma             # Postgres schema (4 models)
│   ├── schema.postgres.prisma    # ⚠️ stale duplicate, safe to delete
│   └── seed.ts                   # Loads seed/listings.json + pan_india_listings.json
├── scraper/                      # Python BAANKNET scraper
│   ├── baanknet.py               # Production — 276 listings/run
│   ├── push.py                   # Shared HMAC client
│   ├── iig.py                    # Deferred (corporate insolvency data)
│   ├── ibapi.py                  # Scaffolded
│   ├── README.md                 # Setup + IP-block notes
│   └── .venv/                    # gitignored
├── seed/
│   ├── listings.json             # 54 hand-curated NCR listings
│   └── pan_india_listings.json   # 70 hand-curated Mumbai/BLR/HYD listings
├── proxy.ts                      # Cookie auth gate
├── prisma.config.ts              # Prisma 7 datasource URL
└── vercel.json                   # Build command + function maxDuration
```

---

## 8. Phase 2 status

The growth plan is documented in `~/.claude/plans/i-want-to-begin-keen-spark.md`.
Phase 1 ✅ complete. **Phase 2.3 (AI memo PDF) fully shipped** this session
with all 10 enrichments + webpage parity. Auth-dependent Phase 2 work is
parked on the `feat/clerk-auth` branch.

| Item | State |
|---|---|
| **2.1 Real auth via Clerk** | ⏸ **Parked on `feat/clerk-auth`** — full scaffold (ClerkProvider, middleware, sign-in/sign-up pages, User model, Svix webhook) committed. Resume by getting Clerk publishable + secret keys, setting in Vercel env, rebasing onto main. |
| **2.2 Watchlists** | ⏳ Blocked on 2.1 (needs `User` table) |
| **2.3 AI memo PDF** | ✅ **Fully shipped** — Claude `haiku-4-5` live in prod (`ANTHROPIC_API_KEY` set), 3-page PDF, 10 enrichments (A/C/D/E/F/G/J/K/L/M), shared 30-min cache, webpage parity via `DealInsights` |
| **2.4 Pricing + Stripe** | ⏳ Blocked on 2.1 (needs subscription model gated by auth) |

---

## 9. Next-session menu — pick from the top

### 9.A Comparable deals carousel on `/deals/[id]` (~2 hrs) — option **B**
- "5 similar deals in this micro-market" card grid
- Filter by `city + propertyType + reservePrice ±20%`
- Reuse `DealCard` component
- High-value page polish — improves the page investors land on most

### 9.B Auction-day playbook on `/deals/[id]` (~2 hrs) — option **O**
- Step-by-step bidder checklist (KYC → EMD wire → bid window → escrow)
- Embed BAANKNET portal link + EMD beneficiary details
- Conditional on `daysUntil(auctionDate) <= 14`

### 9.C External comparable price data (~3 hrs) — option **N**
- Pull recent transaction comps for the locality (MagicBricks / 99acres scrape, or hand-curated table per city)
- New `Comparable` model: `{ propertyId, source, pricePerSqft, date }`
- Surfaces a "Market check" stat next to FMV on the deal page
- Sharpens the Discount-to-FMV signal

### 9.D Builder / seller reputation block (~3 hrs) — option **Q**
- Add `builderName` + `builderReputationNote` to Property
- Backfill for top 50 deals from public record (RERA registrations, court orders)
- Render as a 2-line block on the deal page above DH Score

### 9.E Resume Clerk auth (~1 hr once you have keys) — option **P**
- `git checkout feat/clerk-auth`
- Drop keys into `.env.local` + Vercel env
- Verify locally → merge to main → deploy
- **Unblocks Phase 2.2 (Watchlists), Phase 2.4 (Stripe), and option R (investor personalization)**

### 9.F Bid-win probability model (~4 hrs, needs data) — option **R**
- Estimator: `f(discountPct, dhScore, daysUntil, propertyType) → P(winning bid)`
- Initial version: heuristic from existing 401-row dataset
- Future: train on closed bids once we have outcome labels

### 9.G Refresh BAANKNET data + cleanup (~30 min)
- Re-run `python scraper/baanknet.py` from your laptop (~3 min)
- Adds the latest auction listings, refreshes dates on existing rows
- Cleanup: `rm lib/store.ts prisma/schema.postgres.prisma` (obsolete duplicates)

### 9.H CSV export from /deals (~30 min)
- "Download CSV" button on `/deals` filter bar
- Server route streams filtered listings as CSV
- Practical operator UX win

### Auth-gated Phase 2 (when Clerk lands)

#### Phase 2.2 — Watchlists (~3-4 hrs)
- New Prisma model `Watchlist { id, userId, propertyId, createdAt }`
- `<WatchlistButton>` component, optimistic toggle
- Drop into `DealCard` + `/deals/[id]` sidebar
- New page `/watchlist` reusing `DealCard` grid

#### Phase 2.4 — Pricing + Stripe (~6-8 hrs)
- Stripe products: Investor ₹4,999/mo, Family Office ₹24,999/mo
- New webhook route `app/api/billing/webhook/route.ts`
- New `/pricing` page
- Add `Subscription` Prisma model
- Gating middleware: watchlist size, memo generation rate-limit

### Deferred / no longer needed

- **Option H** "formalize 2-page memo layout" — moot, memo is now 3 pages by design.
- **Option A** "upgrade memo narratives from heuristic to Claude" — done; `ANTHROPIC_API_KEY` set in prod.

---

## 10. Decisions deferred (parked, not abandoned)

- **Vercel Cron for BAANKNET** — blocked at TCP. Revisit after partner whitelist.
- **IIG ingestion** — 2 stale test rows in prod from the original scrape attempt; production ingest deferred (would need a `StressedCompany` model — IIG lists corporate insolvencies, not property auctions).
- **IBAPI ingestion** — 2 stale test rows in prod from the scaffold attempt; production ingest deferred (DOM-based scraper needs revalidation).
- **Authenticated BAANKNET scrape** — unlocks rich detail fields (title, area, images). Requires partner sign-up.
- **`lib/store.ts`** — obsolete in-memory backend, kept in git history. Safe to `rm` next session.
- **`prisma/schema.postgres.prisma`** — duplicate of `schema.prisma` now that we're already on Postgres. Safe to delete.

---

## 11. Commit history (this stretch + Phase 2.3)

```
d7f7319  feat: G+L+M memo enrichments live on PDF and webpage     ← HEAD
afdf306  feat: enrich AI memo with 7 additions, expand to 2 pages
0da74a5  docs: update HANDOFF after Phase 2.3 + pan-India data depth
2b6306e  feat: pan-India data depth — 70 hand-curated Mumbai/BLR/HYD listings
a1fbb6b  feat: AI investor memo PDF generator
1641cd9  docs: HANDOFF.md, canonical session state + Phase 2 to-do
b62bce5  revert: drop Vercel Cron, BAANKNET firewalls AWS IPs
1095156  chore: probe BAANKNET + control hosts from Vercel
3ec408d  chore: debug endpoint for BAANKNET reachability from Vercel
24fd497  chore: better error logging in cron-baanknet
7874701  feat: Vercel Cron — daily BAANKNET refresh    (reverted in b62bce5)
02c3d7c  feat: BAANKNET production scraper, 276 listings ingested
44572a5  feat: migrate from in-memory store to Supabase Postgres
8b3fae3  feat(phase1): ingest endpoint, scraper toolkit, admin telemetry
```

`feat/clerk-auth` branch holds the Clerk scaffold — keep parked until keys arrive.

---

## 12. Quick reference URLs

- Production: https://distresshub-zor1.vercel.app
- Sample deal (verified Claude memo): https://distresshub-zor1.vercel.app/deals/cmqq99xjc000n04l8eh3i0p9y
- GitHub: https://github.com/Zor537/Distress-Hub
- Vercel project: https://vercel.com/zor1/distresshub
- Supabase project: https://supabase.com/dashboard/project/whyxeirfudunugmumtsk
- Anthropic console (for key rotation): https://console.anthropic.com/settings/keys
- Growth roadmap: `~/.claude/plans/i-want-to-begin-keen-spark.md`
