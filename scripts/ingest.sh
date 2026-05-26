#!/usr/bin/env bash
# Ingest a completed F1 session
# Usage: ./scripts/ingest.sh --year 2025 --gp "Australia" --session R
set -euo pipefail

cd "$(dirname "$0")/.."
docker compose run --rm ingestion python -m backend.ingestion.ingest_race "$@"
