"""
BAANKNET scraper — production version.

Discovered API (no Playwright needed at runtime):

  POST /eauction-psb/api/get-upcoming-auctions
       body: {"pageSize":20,"page":0,"propertyTypeId":1}
       returns: list of {propertyId, auctionId, bank, location,
                          auctionStartDate, auctionEndDate, totalCount, id}

  GET  /eauction-psb/api/get-auction-details/{id}
       returns: {ReservePrice, EMD, Auctionstartdate, AuctionEndDate, AuctionId, ...}

PropertyTypeIds: 1=Residential, 2=Commercial, 3=Agricultural, 4=Industrial, 5=Other

The detail-richer fields (title, address, area, images) require an authenticated
session and aren't accessible to anonymous scrapers. We synthesize a title from
bank + location + propertyId, parse city/state from the comma-separated location
string, and leave optional fields null. The DH Score engine handles missing area
gracefully (falls back to 1000 sqft assumption).

Run: python baanknet.py
"""
from __future__ import annotations

import os
import re
import time
from datetime import datetime
from typing import Any

import httpx
from dotenv import load_dotenv

from push import push

load_dotenv()

BASE = "https://baanknet.com/eauction-psb/api"

PROPERTY_TYPES = {
    1: "RESIDENTIAL",
    2: "COMMERCIAL",
    3: "AGRICULTURAL",
    4: "INDUSTRIAL",
    5: "OTHER",
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 DistressHubBot/1.0",
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "Origin": "https://baanknet.com",
    "Referer": "https://baanknet.com/",
}

# Polite scraping — small delay between requests
RATE_LIMIT_DELAY = 0.15  # seconds


def _parse_auction_dt(s: str | None) -> str | None:
    """BAANKNET format: '23-06-2026 10:00' → ISO 8601."""
    if not s:
        return None
    try:
        dt = datetime.strptime(s, "%d-%m-%Y %H:%M")
        return dt.isoformat() + ".000Z"
    except ValueError:
        return None


def _parse_location(loc: str) -> tuple[str, str]:
    """Parse 'Bengaluru, Karnataka' → ('Bengaluru', 'Karnataka')."""
    if not loc:
        return ("Unknown", "Unknown")
    parts = [p.strip() for p in loc.split(",")]
    if len(parts) >= 2:
        return (parts[0], parts[-1])
    return (parts[0], "Unknown")


def _list_page(client: httpx.Client, property_type_id: int, page: int, page_size: int = 50) -> dict:
    """Call get-upcoming-auctions, return raw response."""
    r = client.post(
        f"{BASE}/get-upcoming-auctions",
        json={"pageSize": page_size, "page": page, "propertyTypeId": property_type_id},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def _detail(client: httpx.Client, numeric_id: str | int) -> dict:
    """Call get-auction-details/{id}, return inner respData dict."""
    r = client.get(f"{BASE}/get-auction-details/{numeric_id}", timeout=20)
    r.raise_for_status()
    data = r.json()
    if data.get("status") == 1 and data.get("respData"):
        return data["respData"]
    return {}


def scrape_type(client: httpx.Client, property_type_id: int, max_listings: int) -> list[dict[str, Any]]:
    """Scrape one property type up to max_listings, enriching each with detail data."""
    out: list[dict[str, Any]] = []
    page = 0
    page_size = 50
    type_name = PROPERTY_TYPES[property_type_id]

    while len(out) < max_listings:
        try:
            data = _list_page(client, property_type_id, page, page_size)
        except httpx.HTTPError as e:
            print(f"[baanknet] {type_name} page {page} list failed: {e}")
            break

        rows = data.get("respData") or []
        if not rows:
            break

        for row in rows:
            if len(out) >= max_listings:
                break

            numeric_id = row.get("id")
            property_id = row.get("propertyId")
            auction_id = row.get("auctionId")
            bank = row.get("bank") or "Unknown"
            location = row.get("location") or ""

            if not numeric_id or not property_id:
                continue

            # Enrich with detail
            try:
                d = _detail(client, numeric_id)
            except httpx.HTTPError as e:
                print(f"[baanknet] detail {numeric_id} failed: {e}")
                d = {}
            time.sleep(RATE_LIMIT_DELAY)

            reserve = d.get("ReservePrice")
            if not reserve or float(reserve) <= 0:
                # Can't ingest without a reserve price — the scoring engine needs it
                continue

            emd = d.get("EMD")
            auction_start = d.get("Auctionstartdate") or row.get("auctionStartDate")

            city, state = _parse_location(location)
            title = f"{type_name.title()} property — {city}, {state}"

            out.append({
                "externalId": f"BKNT-{property_id}",
                "title": title[:300],
                "description": f"BAANKNET auction by {bank}. Location: {location}. Auction ID {auction_id}.",
                "propertyType": type_name,
                "bank": bank,
                "address": location[:400] or "Unknown",
                "city": city,
                "state": state,
                "reservePrice": float(reserve),
                "emdAmount": float(emd) if emd else None,
                "auctionDate": _parse_auction_dt(auction_start),
                "possessionType": "UNKNOWN",
                "sourceUrl": f"https://baanknet.com/property-details/{numeric_id}",
            })

        # Stop if this page returned fewer than page_size (last page)
        if len(rows) < page_size:
            break

        page += 1
        time.sleep(RATE_LIMIT_DELAY)

    return out


def scrape(per_type: int = 60) -> list[dict[str, Any]]:
    """Scrape all 5 property types, returning up to per_type listings each."""
    all_listings: list[dict[str, Any]] = []
    with httpx.Client(headers=HEADERS, timeout=30) as client:
        for ptype_id, ptype_name in PROPERTY_TYPES.items():
            print(f"[baanknet] Scraping {ptype_name} (id={ptype_id}, target={per_type})…")
            batch = scrape_type(client, ptype_id, per_type)
            print(f"[baanknet]   → {len(batch)} listings collected")
            all_listings.extend(batch)
    return all_listings


def main():
    items = scrape(per_type=60)
    print(f"\n[baanknet] Total scraped: {len(items)} listings")
    if not items:
        print("[baanknet] Nothing to push.")
        return
    # Push in chunks of 100 to stay under endpoint limit
    for i in range(0, len(items), 100):
        batch = items[i : i + 100]
        result = push("BAANKNET", batch)
        print(f"[baanknet] Pushed batch {i // 100 + 1}: {result}")


if __name__ == "__main__":
    main()
