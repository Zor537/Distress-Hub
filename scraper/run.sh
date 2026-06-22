#!/usr/bin/env bash
# Run all scrapers in sequence. Set DH_BASE_URL + INGEST_SECRET in env first.
#
# Example:
#   export INGEST_SECRET="$(cat ../.env.local | grep INGEST_SECRET | cut -d= -f2-)"
#   export DH_BASE_URL="https://distresshub-zor1.vercel.app"
#   ./run.sh
set -euo pipefail

cd "$(dirname "$0")"

python -m venv .venv 2>/dev/null || true
source .venv/bin/activate

pip install -q -r requirements.txt
python -m playwright install chromium 2>/dev/null || true

echo "→ IIG"
python iig.py || echo "IIG failed (non-fatal)"

echo "→ IBAPI"
python ibapi.py || echo "IBAPI failed (non-fatal)"

echo "→ BAANKNET"
python baanknet.py || echo "BAANKNET failed (non-fatal)"

echo "done"
