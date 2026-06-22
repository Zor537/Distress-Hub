"""HMAC-signed push to /api/ingest — shared by all scrapers."""
from __future__ import annotations

import hashlib
import hmac
import json
import os
from typing import Any

import httpx


def _secret() -> bytes:
    s = os.environ.get("INGEST_SECRET")
    if not s:
        raise RuntimeError("INGEST_SECRET env var not set")
    return s.encode("utf-8")


def _base_url() -> str:
    return os.environ.get("DH_BASE_URL", "http://localhost:3000").rstrip("/")


def sign(body_bytes: bytes) -> str:
    """HMAC-SHA256 hex digest matching app/api/ingest/route.ts."""
    return hmac.new(_secret(), body_bytes, hashlib.sha256).hexdigest()


def push(source: str, listings: list[dict[str, Any]]) -> dict[str, Any]:
    """POST normalised listings to /api/ingest. Returns parsed JSON response."""
    if not listings:
        return {"ok": True, "skipped": True, "reason": "empty listings"}

    body_obj = {"source": source, "listings": listings}
    body_bytes = json.dumps(body_obj, separators=(",", ":")).encode("utf-8")
    signature = sign(body_bytes)

    url = f"{_base_url()}/api/ingest"
    headers = {
        "content-type": "application/json",
        "x-dh-signature": signature,
    }

    with httpx.Client(timeout=60.0) as client:
        resp = client.post(url, content=body_bytes, headers=headers)

    print(f"[push] {source}: {len(listings)} listings → {resp.status_code}")
    try:
        return resp.json()
    except Exception:
        return {"ok": False, "status": resp.status_code, "text": resp.text[:400]}
