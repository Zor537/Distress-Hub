"""
IBAPI (Indian Banks' Auctions Mortgaged Properties Information) scraper.

Source: https://ibapi.in

IBAPI exposes a search form (POST) returning paginated tabular results. Compared
to BAANKNET, it's plain HTML and tractable with httpx + BeautifulSoup.

This scraper is structured but the live DOM may evolve — when it breaks, inspect
the form fields at https://ibapi.in/Auctions/SearchAuction and the table
selectors here.

Run: python scraper/ibapi.py
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Any

import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv

from push import push

load_dotenv()

BASE = "https://ibapi.in"
SEARCH_URL = f"{BASE}/Auctions/SearchAuction"

LAKH = 1_00_000
CRORE = 1_00_00_000


def _parse_inr(text: str) -> float | None:
    if not text:
        return None
    text = text.replace(",", "").replace("₹", "").strip()
    try:
        return float(text)
    except ValueError:
        pass
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


def _classify(title: str, desc: str) -> str:
    blob = f"{title} {desc}".lower()
    if any(w in blob for w in ["flat", "apartment", "villa", "bungalow", "bhk", "house"]):
        return "RESIDENTIAL"
    if any(w in blob for w in ["showroom", "shop", "office", "retail", "commercial"]):
        return "COMMERCIAL"
    if any(w in blob for w in ["warehouse", "factory", "industrial", "shed"]):
        return "INDUSTRIAL"
    if any(w in blob for w in ["plot", "land"]):
        return "PLOT"
    if any(w in blob for w in ["orchard", "farm", "agricultural"]):
        return "AGRICULTURAL"
    return "OTHER"


def _scrape_page(client: httpx.Client, page: int, state: str | None = None) -> list[dict[str, Any]]:
    """Submit search form for one page."""
    form: dict[str, str] = {
        "page": str(page),
        "pageSize": "50",
        "category": "Real Estate",
    }
    if state:
        form["state"] = state

    resp = client.post(SEARCH_URL, data=form, timeout=45)
    if resp.status_code != 200:
        print(f"[ibapi] page {page} status {resp.status_code}")
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    rows = soup.select("table.auction-results tbody tr")
    items: list[dict[str, Any]] = []
    for row in rows:
        cells = row.find_all("td")
        if len(cells) < 7:
            continue

        link = row.select_one("a[href]")
        if not link:
            continue
        href = link["href"]
        detail_url = href if href.startswith("http") else BASE + href

        # IBAPI auction IDs are in the URL path: /Auctions/View/<id>
        m = re.search(r"/View/([A-Za-z0-9-]+)", detail_url)
        if not m:
            continue
        auction_id = m.group(1)

        title = cells[0].get_text(" ", strip=True)
        bank = cells[1].get_text(" ", strip=True)
        city = cells[2].get_text(" ", strip=True)
        state_cell = cells[3].get_text(" ", strip=True)
        reserve = _parse_inr(cells[4].get_text(strip=True))
        emd = _parse_inr(cells[5].get_text(strip=True))
        date_str = cells[6].get_text(strip=True)

        if not reserve:
            continue

        try:
            auction_dt = datetime.strptime(date_str, "%d-%m-%Y").isoformat() + ".000Z"
        except ValueError:
            auction_dt = None

        items.append(
            {
                "externalId": f"IBAPI-{auction_id}",
                "title": title[:300],
                "propertyType": _classify(title, ""),
                "bank": bank or "Unknown",
                "address": f"{title} ({city}, {state_cell})"[:400],
                "city": city or "Unknown",
                "state": state_cell or "Unknown",
                "reservePrice": reserve,
                **({"emdAmount": emd} if emd else {}),
                "possessionType": "UNKNOWN",
                **({"auctionDate": auction_dt} if auction_dt else {}),
                "sourceUrl": detail_url,
            }
        )
    return items


def scrape(max_pages: int = 5, states: list[str] | None = None) -> list[dict[str, Any]]:
    states = states or ["Delhi", "Haryana", "Uttar Pradesh", "Maharashtra", "Karnataka"]
    all_items: list[dict[str, Any]] = []
    with httpx.Client(timeout=45, headers={"User-Agent": "DistressHubBot/1.0"}) as client:
        for state in states:
            for page in range(1, max_pages + 1):
                batch = _scrape_page(client, page, state=state)
                if not batch:
                    break
                all_items.extend(batch)
                print(f"[ibapi] {state} page {page} → {len(batch)} items")
    return all_items


if __name__ == "__main__":
    items = scrape(max_pages=5)
    print(f"[ibapi] scraped {len(items)} listings")
    if items:
        for i in range(0, len(items), 100):
            batch = items[i : i + 100]
            result = push("IBAPI", batch)
            print(f"[ibapi] batch {i // 100 + 1}: {result}")
