/**
 * Vercel Cron job — BAANKNET refresh.
 *
 * TypeScript port of scraper/baanknet.py optimised for serverless time budgets.
 * Hits the public BAANKNET endpoints, normalises listings, and reuses /api/ingest
 * (with HMAC) so the same telemetry pipeline records the run.
 *
 * Auth — Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 *
 * Manual trigger:
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     https://distresshub-zor1.vercel.app/api/cron/scrape-baanknet
 *
 * Time budget — Hobby tier caps function duration at 60s. We sample ~20 listings
 * per property type (100 total) which fits comfortably.
 */
import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";

export const maxDuration = 60;

const BASE = "https://baanknet.com/eauction-psb/api";

const PROPERTY_TYPES: Record<number, string> = {
  1: "RESIDENTIAL",
  2: "COMMERCIAL",
  3: "AGRICULTURAL",
  4: "INDUSTRIAL",
  5: "OTHER",
};

const HEADERS = {
  "User-Agent": "Mozilla/5.0 DistressHubBot/1.0",
  Accept: "application/json, text/plain, */*",
  "Content-Type": "application/json",
  Origin: "https://baanknet.com",
  Referer: "https://baanknet.com/",
};

type ListItem = {
  propertyId: string;
  auctionId: string;
  bank: string;
  location: string;
  auctionStartDate: string;
  auctionEndDate: string;
  totalCount: number;
  id: string | number;
};

type DetailResp = {
  ReservePrice?: number;
  EMD?: number;
  Auctionstartdate?: string;
  AuctionEndDate?: string;
};

type NormalisedListing = {
  externalId: string;
  title: string;
  description?: string;
  propertyType: string;
  bank: string;
  address: string;
  city: string;
  state: string;
  reservePrice: number;
  emdAmount?: number;
  auctionDate?: string;
  possessionType?: string;
  sourceUrl: string;
};

function parseAuctionDate(s: string | undefined): string | undefined {
  // BAANKNET format: '23-06-2026 10:00' → ISO 8601
  if (!s) return undefined;
  const m = s.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})$/);
  if (!m) return undefined;
  const [, d, mo, y, h, mi] = m;
  const iso = `${y}-${mo}-${d}T${h}:${mi}:00.000Z`;
  return iso;
}

function parseLocation(loc: string): { city: string; state: string } {
  if (!loc) return { city: "Unknown", state: "Unknown" };
  const parts = loc.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { city: parts[0], state: parts[parts.length - 1] };
  return { city: parts[0] ?? "Unknown", state: "Unknown" };
}

async function fetchListPage(typeId: number, page: number, pageSize = 50): Promise<ListItem[]> {
  const res = await fetch(`${BASE}/get-upcoming-auctions`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ pageSize, page, propertyTypeId: typeId }),
  });
  if (!res.ok) throw new Error(`list ${typeId}:${page} → ${res.status}`);
  const data = (await res.json()) as { status?: number; respData?: ListItem[] };
  return data?.respData ?? [];
}

async function fetchDetail(numericId: string | number): Promise<DetailResp> {
  const res = await fetch(`${BASE}/get-auction-details/${numericId}`, { headers: HEADERS });
  if (!res.ok) return {};
  const data = (await res.json()) as { status?: number; respData?: DetailResp };
  return data?.respData ?? {};
}

async function scrapeType(
  typeId: number,
  maxListings: number,
  perDetailTimeoutMs: number,
): Promise<NormalisedListing[]> {
  const out: NormalisedListing[] = [];
  const typeName = PROPERTY_TYPES[typeId];
  let page = 0;
  while (out.length < maxListings) {
    let rows: ListItem[] = [];
    try {
      rows = await fetchListPage(typeId, page, 50);
    } catch (e) {
      console.warn(`[cron-baanknet] ${typeName} page ${page} list failed:`, e);
      break;
    }
    if (rows.length === 0) break;

    for (const row of rows) {
      if (out.length >= maxListings) break;
      const numericId = row.id;
      const propertyId = row.propertyId;
      if (!numericId || !propertyId) continue;

      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), perDetailTimeoutMs);
      let d: DetailResp = {};
      try {
        d = await fetchDetail(numericId);
      } catch {
        d = {};
      } finally {
        clearTimeout(t);
      }

      const reserve = d.ReservePrice;
      if (!reserve || reserve <= 0) continue;

      const { city, state } = parseLocation(row.location || "");
      const auctionStart = d.Auctionstartdate ?? row.auctionStartDate;

      out.push({
        externalId: `BKNT-${propertyId}`,
        title: `${typeName.charAt(0)}${typeName.slice(1).toLowerCase()} property — ${city}, ${state}`,
        description: `BAANKNET auction by ${row.bank}. Location: ${row.location}. Auction ID ${row.auctionId}.`,
        propertyType: typeName,
        bank: row.bank || "Unknown",
        address: (row.location || "Unknown").slice(0, 400),
        city,
        state,
        reservePrice: Number(reserve),
        emdAmount: d.EMD ? Number(d.EMD) : undefined,
        auctionDate: parseAuctionDate(auctionStart),
        possessionType: "UNKNOWN",
        sourceUrl: `https://baanknet.com/property-details/${numericId}`,
      });
    }

    if (rows.length < 50) break;
    page++;
  }
  return out;
}

function signBody(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body, "utf-8").digest("hex");
}

async function pushToIngest(listings: NormalisedListing[]): Promise<{
  ok: boolean;
  added: number;
  updated: number;
  errors: unknown;
}> {
  const ingestSecret = process.env.INGEST_SECRET;
  if (!ingestSecret) throw new Error("INGEST_SECRET not set");

  // Same-origin POST — the cron route is inside the deployed app, so use the
  // public URL (Vercel routes localhost fetch back through the edge regardless).
  const baseUrl =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const body = JSON.stringify({ source: "BAANKNET", listings });
  const signature = signBody(body, ingestSecret);

  const res = await fetch(`${baseUrl}/api/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-dh-signature": signature },
    body,
  });
  if (!res.ok) {
    return { ok: false, added: 0, updated: 0, errors: await res.text() };
  }
  return (await res.json()) as { ok: boolean; added: number; updated: number; errors: unknown };
}

function authorised(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = req.headers.get("authorization") ?? "";
  return auth === `Bearer ${expected}`;
}

async function run(): Promise<NextResponse> {
  const started = Date.now();
  // Conservative serverless caps — 20 per type × 5 = 100 listings, ≤ 60s total
  const perType = Number(process.env.CRON_PER_TYPE ?? "20");
  const perDetailTimeoutMs = 4000;

  const all: NormalisedListing[] = [];
  for (const typeId of [1, 2, 3, 4, 5]) {
    const batch = await scrapeType(typeId, perType, perDetailTimeoutMs);
    all.push(...batch);
  }

  if (all.length === 0) {
    return NextResponse.json({
      ok: false,
      reason: "no listings scraped",
      elapsedMs: Date.now() - started,
    });
  }

  // Push in batches of 100 (matches the /api/ingest limit)
  let totalAdded = 0;
  let totalUpdated = 0;
  for (let i = 0; i < all.length; i += 100) {
    const chunk = all.slice(i, i + 100);
    const result = await pushToIngest(chunk);
    totalAdded += result.added;
    totalUpdated += result.updated;
  }

  return NextResponse.json({
    ok: true,
    scraped: all.length,
    added: totalAdded,
    updated: totalUpdated,
    elapsedMs: Date.now() - started,
  });
}

export async function GET(req: Request) {
  // Vercel Cron sends GET by default
  if (!authorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  return run();
}

export async function POST(req: Request) {
  // Allow manual POST trigger for ad-hoc runs
  if (!authorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  return run();
}
