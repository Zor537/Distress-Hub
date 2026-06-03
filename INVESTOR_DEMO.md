# Investor Demo — 30-second walkthrough

## Access
- URL: http://localhost:3000
- Password: `distress2026`

## Demo flow (matches Tech Brief §17)

1. **Open `/`** — "This is what every investor sees when they land."
2. **Click "See Live Deals"** → land on `/dashboard` (post-login)
3. **Top of dashboard** — "We're tracking 50 distressed properties in NCR right now, all scored on five signals."
4. **Pan the map** — point to gold-colored pins. "These are the 80+ DH Score deals. That's our shortlist."
5. **Click a high-score deal** (e.g. "3BHK, Sector 84 Gurgaon" or "Light-Industrial Unit, Mayapuri") → detail page.
6. **DH Score Breakdown** — "Five signals, weighted, machine-learned. Today it's a heuristic; with 1,000 closed deals it'll be a real model."
7. **Scroll to Financial Model** — drag renovation cost slider from ₹12L to ₹18L. IRR drops in real time. "This is how we make the call to bid or pass."
8. **Click "Express Interest"** — opens a lead capture dialog. Submit it. Investor row gets created in DB.
9. **Navigate to `/pipeline`** — "And this is what our acquisitions team sees. Live pipeline across all stages." Drag a card across columns.
10. Back to `/dashboard`. Done.

## Backup talking points

- Map has clustered pins, color-coded by DH Score tier (gold ≥ 80, cream 60–79, muted < 60)
- Financial model exports CSV — "investors want to take the numbers offline"
- Pipeline kanban supports drag-and-drop AND inline notes per deal
- Mock BAANKNET scraper at POST `/api/scraper/trigger` re-scores the entire DB

## If the demo breaks
- Restart dev server: `npm run dev`
- Re-seed if needed: `npx tsx prisma/seed.ts`
