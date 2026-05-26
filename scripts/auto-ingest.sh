#!/usr/bin/env bash
# F1 Data Auto-Ingest Cron Script
# Runs inside the f1-ingestion container to auto-fetch new race data
set -euo pipefail

PROJECT_DIR="/home/ubuntu/projects/f1-analysis"
cd "$PROJECT_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S WIB')] $*"
}

# Cek kalo ada race baru di OpenF1 API
log "🔍 Checking for new F1 2026 race data..."

# Run the OpenF1 ingestion for ALL completed sessions this season
# --all flag only ingests sessions that haven't been stored yet
sudo docker compose run --rm ingestion \
  python -m backend.ingestion.ingest_openf1 --year 2026 --all 2>&1

RESULT=$?
if [ $RESULT -eq 0 ]; then
  log "✅ OpenF1 ingestion completed successfully"
else
  log "⚠️ OpenF1 ingestion exited with code $RESULT"
fi

# Also run Fast-F1 ingestion as fallback
sudo docker compose run --rm ingestion \
  python -m backend.ingestion.ingest_race --year 2026 --all 2>&1

RESULT2=$?
if [ $RESULT2 -eq 0 ]; then
  log "✅ Fast-F1 ingestion completed successfully"
else
  log "⚠️ Fast-F1 ingestion exited with code $RESULT2"
fi

log "🏁 Auto-ingest run complete"
