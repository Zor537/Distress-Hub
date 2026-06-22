# DistressHub scrapers

Python ingestion toolkit. Runs from a residential IP and posts HMAC-signed
batches to `/api/ingest` on the deployed app.

## ⚠️ IP-block reality

BAANKNET firewalls AWS/Vercel datacenter IPs at the TCP level. From a Vercel
serverless function, TCP connect to `baanknet.com` fails in ~10 ms before TLS
handshake.

This means **scrapers must run from a residential IP** (your laptop, a small
VPS with a residential block, GitHub Actions self-hosted runner on your own
hardware, or a residential proxy service like ScraperAPI).

Vercel Cron was attempted and removed — it's TCP-rejected at the source.

The Python scraper has been verified to work from a typical Indian residential
ISP — 276 listings ingested in ~3 min on first run.

## Setup

```bash
cd scraper
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# (only needed if running baanknet.py with the legacy Playwright path —
#  the current production version doesn't need a browser)
# playwright install chromium
```

## Env vars (read from repo root `.env.local`)

```
INGEST_SECRET=<long random string, also set in Vercel env>
DH_BASE_URL=https://distresshub-zor1.vercel.app   # or http://localhost:3000
```

Generate the secret with `python3 -c "import secrets; print(secrets.token_hex(32))"`.

The Vercel env already has it set — `npx vercel env ls` to confirm.

## Run

```bash
# All sources
./run.sh

# Single source
python baanknet.py           # main production scraper (no browser needed)
python iig.py                # deferred — IIG returns corporate insolvency data
python ibapi.py              # scaffolded — needs DOM revalidation
```

Each script POSTs to `/api/ingest` in batches of 100. The endpoint upserts on
`externalId` so re-runs are idempotent (existing rows update, new rows insert).

## Status

| Source   | State | Notes |
|---|---|---|
| BAANKNET | ✅ Production | ~276 listings per run, 5 property types, 15 banks, 172 cities. Uses public REST endpoints discovered via Playwright network capture. |
| IIG      | ⚠️ Deferred | Data is corporate insolvency (whole companies), not property auctions — model mismatch. Needs a separate `StressedCompany` model. |
| IBAPI    | 🔨 Scaffolded | DOM-based parser; needs revalidation against current site. |

## BAANKNET API reference (no auth required)

```
POST  https://baanknet.com/eauction-psb/api/get-upcoming-auctions
      body: {"pageSize": 50, "page": 0, "propertyTypeId": 1}
      → list of {propertyId, auctionId, bank, location, dates, id}

GET   https://baanknet.com/eauction-psb/api/get-auction-details/{numericId}
      → {ReservePrice, EMD, Auctionstartdate, AuctionEndDate, AuctionId}
```

`propertyTypeId`: 1=Residential, 2=Commercial, 3=Agricultural, 4=Industrial, 5=Other

The richer fields (title, address, area, images) require an authenticated
session and aren't accessible to anonymous scrapers. Future work: BAANKNET
partner agreement → authenticated scrape → full detail.

## When the scraper breaks

- **BAANKNET DOM/API changes** — re-run `python baanknet.py` and inspect the
  failure logs. Re-run the Playwright network capture if endpoints shifted
  (see git history for `explore_baanknet*.py` for the discovery pattern).
- **`/api/ingest` returns 401** — `INGEST_SECRET` doesn't match between
  Vercel env and your local `.env.local`. Regenerate, update both.
- **Connection refused** — your IP isn't being blocked, but verify by hitting
  `https://baanknet.com/` in a browser from the same network.

## Scheduling (manual)

There's no automated cron right now — see the IP-block reality above. To
refresh data:

```bash
cd /Users/imroz/Desktop/Sandbox/distresshub/scraper
source .venv/bin/activate
DH_BASE_URL=https://distresshub-zor1.vercel.app \
INGEST_SECRET="$(grep INGEST_SECRET ../.env.local | cut -d'\"' -f2)" \
python baanknet.py
```

When BAANKNET partner access lands (Phase 3), automated cron can run from
Vercel directly against the authenticated API.
