# DistressHub Cost Guide

Last updated: 2026-06-23 (against commit `ed026ea`)

**Current state:** Everything runs on free tiers + ~$0 API spend. The platform's
binding cost ceiling is **Vercel function execution**, not Anthropic.

---

## 1. Per-action cost breakdown

| User action | DB | AI | Compute | Bandwidth | Marginal cost |
|---|---|---|---|---|---|
| Browse `/deals` | 1 paginated query | — | ~200ms | ~50 KB | **$0** |
| View `/deals/[id]` (first time) | 1 row fetch | 1 Claude call | ~3–8s | ~500 KB–1 MB | **~$0.005** |
| View `/deals/[id]` (within 30 min) | 1 row fetch | cached | ~200ms | ~500 KB–1 MB | **$0** |
| Download memo PDF (uncached) | 1 row fetch | 1 Claude call + PDF render | ~4–11s | ~200–500 KB | **~$0.005** |
| Download memo PDF (cached) | 1 row fetch | cached + PDF render | ~1–3s | ~200–500 KB | **$0** |
| Click "Share memo" | — | — | client-only | — | **$0** |
| Express Interest | 1 row insert | — | ~300ms | <10 KB | **$0** |
| Refresh BAANKNET (laptop) | up to 326 upserts | — | ~3 min (your laptop) | ~5 MB | **$0** |

**Key insight:** the 30-min `lib/insights.ts` cache makes PDF + webpage **share
one Claude call**. A single "memo view" event is ~$0.005 amortized across
however many times that property is viewed in the next 30 minutes.

### Anthropic per-call detail

Model: `claude-haiku-4-5-20251001`
Pricing: $1.00 / MTok input · $5.00 / MTok output

| Component | Tokens | Cost |
|---|---|---|
| Input prompt (deal context + score signals + financial + scenarios + locality + diligence + JSON schema + guidance) | ~1,100 | $0.00110 |
| Output JSON (3-para narrative + 3 risks + counter-thesis + 2–3 change-my-mind) | ~800 | $0.00400 |
| **Total per uncached call** | | **~$0.0051** |

No Anthropic prompt-cache discount applies — the in-process `Map` cache in
`lib/insights.ts` simply skips the API call entirely on hits.

---

## 2. Cost stack — current providers

| Layer | Provider | Plan | Monthly cost | Capacity |
|---|---|---|---|---|
| Frontend + functions | Vercel | Hobby (free) | **$0** | 100 GB-hours compute, 100 GB bandwidth, 1M invocations |
| Database | Supabase | Free | **$0** | 500 MB DB, 5 GB bandwidth, auto-pause after 7d idle |
| AI | Anthropic | Pay-as-you-go | **~$0.005 / unique memo** | Haiku 4.5 @ $1/M in, $5/M out |
| Scraper | (your laptop) | — | **$0** | ~3 min/run |
| Git/CI | GitHub | Free | **$0** | unlimited public + private repos |
| Domain | `*.vercel.app` | included | **$0** | — |
| **Total fixed** | | | **$0/mo** | |

---

## 3. Monthly cost projections by scale

Assumes 30-min cache hit rate of ~50% (i.e., every other view triggers a new
Claude call). Each "unique memo" = one Claude call.

| Scenario | Page views/mo | Unique memos/mo | Anthropic | Vercel | Supabase | **Total** |
|---|---|---|---|---|---|---|
| **Today** (you + a few testers) | ~500 | ~100 | $0.50 | free | free | **~$0.50** |
| **Pilot** (1 PSB + 50 investor logins) | ~10,000 | ~2,000 | $10 | free | free | **~$10** |
| **Soft launch** (100 active investors) | ~50,000 | ~10,000 | $50 | free | **Pro $25** | **~$75** |
| **Growth** (500 active investors) | ~250,000 | ~50,000 | $250 | **Pro $20** | Pro $25 | **~$295** |
| **Scale** (5k investors, Phase 4 ARR) | ~2.5M | ~500,000 | $2,500 | **Enterprise** | **Team $599** | **$5,000+** |

**At every realistic scale through Phase 3, Anthropic is < 50% of total cost.**
Vercel and Supabase upgrades are the bigger jumps.

---

## 4. When to upgrade what

| Trigger | Action | Cost |
|---|---|---|
| Supabase DB approaches 500 MB (currently ~50 MB at 401 properties → ~10× headroom = ~4,000 properties on free) | Upgrade Supabase Pro | +$25/mo |
| Supabase free tier auto-pauses during demos | Upgrade Supabase Pro (no pause) | +$25/mo |
| Vercel function execution > 80 GB-hours/mo (rough threshold: ~15,000 cold memo calls) | Upgrade Vercel Pro | +$20/mo |
| Vercel bandwidth > 80 GB/mo | Vercel Pro adds 1 TB | +$20/mo |
| First live PSB pitch | **Both Pro upgrades** the day before | +$45 one-time |
| First Phase 2.3 PR for Vercel CI runs | Already on Pro by then | — |
| `distresshub.com` purchase | Domain + Vercel custom domain (free) | ~$12/yr |
| Stripe goes live (Phase 2.4) | Pay processing fees only (~3% + ₹3/txn) | per-txn |
| Anthropic monthly spend > $100 | Pre-pay credits + set billing alert at $200 | — |

---

## 5. Hidden cost watchouts

| Watchout | Why it bites | Mitigation |
|---|---|---|
| **Cold-start cache miss waves** | Vercel function instance restarts wipe the in-memory `Map` cache → next caller pays Claude again | Acceptable today (in-process cache is best-effort); future: move to Redis if Anthropic spend > $200/mo |
| **Crawler/bot traffic on `/deals/[id]`** | Every bot hit could trigger a Claude call | `robots.txt` + rate-limit `/api/properties/[id]/insights` once auth lands |
| **Vercel function `maxDuration: 60s`** on memo route | A slow Claude call + slow PDF render could approach the cap | Pro tier extends to 300s; today's worst case is ~11s |
| **Supabase egress on the 401-row JSON `/api/properties` endpoint** | Returning all properties per request burns bandwidth fast | Already paginated; keep page size ≤ 50 |
| **`@anthropic-ai/sdk` retries** | A 429 or 529 triggers automatic retries (default `maxRetries: 2`) → could 3× the cost of a single memo | Today's volume too low to matter; monitor at scale |
| **Anthropic credits expire** | Pre-paid credits expire 12 months after purchase | Buy what you'll use in a quarter; set auto-reload |

---

## 6. Quick math — when does each Phase 2 milestone start mattering?

| Milestone | Cost trigger |
|---|---|
| Phase 2.1 (Clerk auth) | Clerk free tier = 10k MAUs; cost kicks in at ~$25/mo for 10k–100k MAUs |
| Phase 2.2 (Watchlists) | Negligible — Postgres rows + indexes |
| Phase 2.3 (AI memo) | **Already shipped.** ~$0.005/uncached memo. |
| Phase 2.4 (Stripe) | Pass-through processing fees. Stripe takes ~3% of transaction value. |

---

## 7. Live spend dashboards to bookmark

- Anthropic usage: https://console.anthropic.com/settings/usage
- Vercel usage: https://vercel.com/zor1/distresshub/usage
- Supabase usage: https://supabase.com/dashboard/project/whyxeirfudunugmumtsk/settings/usage
- GitHub Actions minutes (if ever wired): https://github.com/settings/billing
