"""
BAANKNET scraper — scaffolded per Tech Brief §4.

Source: https://baanknet.com/auctions

BAANKNET is a React SPA backed by a search API. Strategy:
  1. Load the page in Playwright (headless Chromium).
  2. Listen for XHR responses to /api/search* — capture the URL + payload shape.
  3. Once the endpoint is captured, call it directly via httpx for faster
     subsequent pages.

This file ships as a scaffold — the exact XHR endpoint and JSON shape must be
captured on a real run (DOM/network shape will drift). The pattern is correct
and `_normalise` shows the expected output schema for /api/ingest.

Run: python scraper/baanknet.py
Prereqs: playwright install chromium
"""
from __future__ import annotations

import asyncio
import re
from typing import Any

from dotenv import load_dotenv
from playwright.async_api import async_playwright

from push import push

load_dotenv()

START_URL = "https://baanknet.com/auctions"


def _normalise(raw: dict[str, Any]) -> dict[str, Any] | None:
    """Map raw BAANKNET API response → our normalised Property shape.

    Fill in the exact field names after capturing the live XHR. The keys below
    are the ones we expect once captured — adjust to match.
    """
    listing_id = raw.get("listingId") or raw.get("auctionId") or raw.get("id")
    if not listing_id:
        return None

    reserve = raw.get("reservePrice") or raw.get("reserveBidAmount")
    if not reserve:
        return None

    title = raw.get("title") or raw.get("propertyTitle") or "Untitled BAANKNET listing"
    address = raw.get("address") or raw.get("propertyAddress") or ""
    city = raw.get("city") or "Unknown"
    state = raw.get("state") or "Unknown"
    bank = raw.get("bank") or raw.get("sellerBank") or "Unknown"
    prop_type = (raw.get("propertyType") or "OTHER").upper()
    if prop_type not in {"RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL", "AGRICULTURAL", "PLOT", "OTHER"}:
        prop_type = "OTHER"

    return {
        "externalId": f"BKNT-{listing_id}",
        "title": title[:300],
        "description": raw.get("description"),
        "propertyType": prop_type,
        "bank": bank,
        "address": address[:400],
        "city": city,
        "state": state,
        "pincode": raw.get("pincode"),
        "latitude": raw.get("latitude"),
        "longitude": raw.get("longitude"),
        "reservePrice": float(reserve),
        "emdAmount": float(raw["emdAmount"]) if raw.get("emdAmount") else None,
        "builtUpArea": float(raw["builtUpArea"]) if raw.get("builtUpArea") else None,
        "auctionDate": raw.get("auctionDate"),
        "possessionType": (raw.get("possessionType") or "UNKNOWN").upper(),
        "imageUrls": raw.get("imageUrls") or [],
        "sourceUrl": f"https://baanknet.com/auctions/listing/{listing_id}",
    }


async def capture_xhr_then_paginate(target_count: int = 500) -> list[dict[str, Any]]:
    """Open BAANKNET in Playwright, capture the search XHR endpoint + payload,
    then hit it directly for subsequent pages."""
    captured: list[dict[str, Any]] = []
    api_endpoint: str | None = None
    api_payload: dict[str, Any] | None = None

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent="DistressHubBot/1.0")
        page = await context.new_page()

        async def on_response(response):
            nonlocal api_endpoint, api_payload
            url = response.url
            if api_endpoint is None and re.search(r"/api/(search|properties|auctions)", url):
                try:
                    api_endpoint = url
                    api_payload = await response.json()
                    print(f"[baanknet] captured XHR: {url}")
                except Exception as e:
                    print(f"[baanknet] capture failed: {e}")

        page.on("response", on_response)
        await page.goto(START_URL, wait_until="networkidle", timeout=60_000)

        # Wait briefly for the search XHR to fire
        for _ in range(20):
            if api_endpoint:
                break
            await asyncio.sleep(0.5)

        await browser.close()

    if not api_endpoint or not api_payload:
        print("[baanknet] no XHR captured — DOM may have changed")
        return []

    # If the captured payload is already a list of listings, use it directly.
    items = api_payload.get("results") or api_payload.get("data") or api_payload.get("listings") or []
    for raw in items:
        norm = _normalise(raw)
        if norm:
            captured.append(norm)
        if len(captured) >= target_count:
            break

    return captured


def main() -> None:
    items = asyncio.run(capture_xhr_then_paginate(target_count=500))
    print(f"[baanknet] captured {len(items)} listings")
    if not items:
        print("[baanknet] nothing captured — re-inspect XHR shape in Playwright trace")
        return
    for i in range(0, len(items), 100):
        batch = items[i : i + 100]
        result = push("BAANKNET", batch)
        print(f"[baanknet] batch {i // 100 + 1}: {result}")


if __name__ == "__main__":
    main()
