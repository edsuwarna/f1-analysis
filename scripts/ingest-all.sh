#!/usr/bin/env bash
# Ingest all completed F1 races for a season
# Usage: ./scripts/ingest-all.sh 2025
set -euo pipefail

cd "$(dirname "$0")/.."
YEAR="${1:-2025}"
docker compose run --rm ingestion python -m backend.ingestion.ingest_race --year "$YEAR" --all
