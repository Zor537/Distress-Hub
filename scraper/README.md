# DistressHub scrapers

Python ingestion toolkit. Three scrapers, one shared `push.py` that HMAC-signs and POSTs to `/api/ingest`.

## Setup

```bash
cd scraper
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium    # only needed for baanknet.py
```

## Env vars (in repo root `.env.local`)

```
INGEST_SECRET=<long random string, also set in Vercel env>
DH_BASE_URL=https://distresshub-zor1.vercel.app   # or http://localhost:3000
```

Generate a secret:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Set the same value in Vercel:

```bash
npx vercel env add INGEST_SECRET production
```

## Run

```bash
./run.sh                  # all three in sequence
python iig.py             # IIG only — simplest, static HTML, highest success rate
python ibapi.py           # IBAPI — form POST, medium complexity
python baanknet.py        # BAANKNET — Playwright XHR capture, most complex
```

Each script POSTs in batches of 100. The endpoint upserts on `externalId`, so re-runs are idempotent.

## Status

| Source | State | Notes |
|---|---|---|
| IIG | ✅ Working | Static HTML, BeautifulSoup. ~200–400 listings typical. |
| IBAPI | ⚠ Scaffolded | Form POST works against current site. May need form-field tweaks. |
| BAANKNET | 🔨 Scaffolded | Playwright captures XHR — `_normalise` field map needs confirming on first live run. |

When a scraper breaks, the first place to look:
- `iig.py` → CSS selectors (`.opportunity-card`, `dl.opportunity-facts`)
- `ibapi.py` → form fields in `_scrape_page`, table selectors `table.auction-results tbody tr`
- `baanknet.py` → XHR endpoint regex in `on_response`, raw key map in `_normalise`
