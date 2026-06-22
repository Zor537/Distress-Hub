"""
India Investment Grid (IIG) — stressed real-estate scraper.

Source: https://indiainvestmentgrid.gov.in/opportunities/stressed-assets/real-estate

IIG is the simplest of the three live sources — static HTML, no JS rendering
required, no anti-scrape headers. We fetch the listing index, paginate, then
fetch each listing's detail page for the full field set.

Run: python scraper/iig.py
"""
from __future__ import annotations

import re
from typing import Any

import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv

from push import push

load_dotenv()

BASE = "https://indiainvestmentgrid.gov.in"
INDEX_URL = f"{BASE}/opportunities/stressed-assets/real-estate"

# IIG often gives prices in "₹X Lakh" / "₹X Crore" — normalise to absolute INR
LAKH = 1_00_000
CRORE = 1_00_00_000


def _parse_inr(text: str) -> float | None:
    """Parse '₹2.5 Crore' → 25_000_000.0"""
    if not text:
        return None
    text = text.replace(",", "").strip()
    m = re.search(r"([\d.]+)\s*(crore|cr|lakh|lac|l)?", text, re.IGNORECASE)
    if not m:
        return None
    num = float(m.group(1))
    unit = (m.group(2) or "").lower()
    if unit.startswith("c"):
        return num * CRORE
    if unit.startswith("l"):
        return num * LAKH
    return num


def _classify_property_type(title: str, desc: str) -> str:
    """Heuristic classification — IIG categories don't map 1:1 to ours."""
    blob = f"{title} {desc}".lower()
    if any(w in blob for w in ["flat", "apartment", "villa", "bungalow", "bhk", "house"]):
        return "RESIDENTIAL"
    if any(w in blob for w in ["showroom", "shop", "office", "retail", "commercial"]):
        return "COMMERCIAL"
    if any(w in blob for w in ["warehouse", "factory", "industrial", "shed", "manufacturing"]):
        return "INDUSTRIAL"
    if any(w in blob for w in ["plot", "land parcel"]):
        return "PLOT"
    if any(w in blob for w in ["orchard", "farm", "agricultural", "polyhouse", "dairy", "agri"]):
        return "AGRICULTURAL"
    return "OTHER"


def _fetch_listing_index(client: httpx.Client, page: int) -> list[str]:
    """Returns absolute URLs of detail pages from one index page."""
    resp = client.get(INDEX_URL, params={"page": page})
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")
    return [
        BASE + a["href"]
        for a in soup.select("a.opportunity-card[href]")
        if a.get("href", "").startswith("/opportunities/stressed-assets/")
    ]


def _scrape_detail(client: httpx.Client, url: str) -> dict[str, Any] | None:
    """Fetch one detail page and convert to our normalised Property shape."""
    resp = client.get(url, timeout=30)
    if resp.status_code != 200:
        print(f"[iig] skip {url} (status {resp.status_code})")
        return None

    soup = BeautifulSoup(resp.text, "lxml")

    title = (soup.select_one("h1.opportunity-title") or {}).get_text(strip=True) if soup.select_one("h1.opportunity-title") else None
    if not title:
        return None

    # IIG renders key facts as <dt>/<dd> rows in a sidebar
    facts: dict[str, str] = {}
    for dt in soup.select("dl.opportunity-facts dt"):
        dd = dt.find_next_sibling("dd")
        if dd:
            facts[dt.get_text(strip=True).lower()] = dd.get_text(" ", strip=True)

    desc_el = soup.select_one(".opportunity-description")
    description = desc_el.get_text("\n", strip=True) if desc_el else ""

    address = facts.get("address") or facts.get("location") or ""
    city = facts.get("city") or ""
    state = facts.get("state") or ""
    bank = facts.get("seller") or facts.get("bank") or "Unknown"
    reserve = _parse_inr(facts.get("reserve price") or facts.get("price") or "")
    emd = _parse_inr(facts.get("emd") or facts.get("earnest money") or "")
    area = None
    if facts.get("built up area"):
        a = re.search(r"([\d.]+)", facts["built up area"])
        if a:
            area = float(a.group(1))

    # Extract IIG opportunity ID from URL slug
    slug_match = re.search(r"/([A-Za-z0-9-]+)/?$", url)
    iig_id = slug_match.group(1) if slug_match else url.rsplit("/", 1)[-1]

    if not reserve:
        print(f"[iig] skip {iig_id} — no reserve price parsed")
        return None

    return {
        "externalId": f"IIG-{iig_id}",
        "title": title,
        "description": description[:5000] if description else None,
        "propertyType": _classify_property_type(title, description),
        "bank": bank,
        "address": address[:400],
        "city": city or "Unknown",
        "state": state or "Unknown",
        "reservePrice": reserve,
        **({"emdAmount": emd} if emd else {}),
        **({"builtUpArea": area} if area else {}),
        "possessionType": "UNKNOWN",
        "sourceUrl": url,
    }


def scrape(max_pages: int = 10) -> list[dict[str, Any]]:
    listings: list[dict[str, Any]] = []
    with httpx.Client(timeout=30, headers={"User-Agent": "DistressHubBot/1.0"}) as client:
        for page in range(1, max_pages + 1):
            try:
                urls = _fetch_listing_index(client, page)
            except httpx.HTTPError as e:
                print(f"[iig] index page {page} failed: {e}")
                break
            if not urls:
                print(f"[iig] index page {page} empty — stopping")
                break
            for url in urls:
                try:
                    item = _scrape_detail(client, url)
                except httpx.HTTPError as e:
                    print(f"[iig] detail {url} failed: {e}")
                    continue
                if item:
                    listings.append(item)
    return listings


if __name__ == "__main__":
    items = scrape(max_pages=10)
    print(f"[iig] scraped {len(items)} listings")
    if items:
        # Push in batches of 100 to stay under endpoint limit
        for i in range(0, len(items), 100):
            batch = items[i : i + 100]
            result = push("IIG", batch)
            print(f"[iig] batch {i // 100 + 1}: {result}")
