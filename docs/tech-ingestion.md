# 📥 Ingestion Pipeline

How race data gets from OpenF1 API into PostgreSQL.

## Architecture

The ingestion runs as a **Docker container on demand**. It fetches data from OpenF1, processes it, and bulk-inserts into PostgreSQL.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  OpenF1 API  │────▶│  Ingestion   │────▶│  PostgreSQL  │
│  (external)  │     │  Container   │     │  (internal)  │
└──────────────┘     └──────────────┘     └──────────────┘
                           │
                     ┌─────┴─────┐
                     │  httpx    │ (async HTTP)
                     │  asyncio  │ (parallel fetch)
                     └───────────┘
```

## Ingestion Strategy

### Fetch Order

```
1. Meetings      → GET /v1/meetings?year=2026
2. Sessions      → GET /v1/sessions?meeting_key=N
3. Drivers       → GET /v1/drivers?session_key=N
4. Laps          → GET /v1/laps?session_key=N
5. Stints        → GET /v1/stints?session_key=N
6. Pit Stops     → GET /v1/pit?session_key=N
7. Car Data      → GET /v1/car_data?session_key=N&driver_number=N
8. Weather       → GET /v1/weather?session_key=N
9. Race Control  → GET /v1/race_control?session_key=N
```

### Parallelism

Car data (telemetry) is fetched **per driver** in parallel using `asyncio.gather()`. With 20 drivers, this cuts telemetry fetch time from ~40s to ~4s.

### Idempotency

Ingestion uses **`INSERT ... ON CONFLICT DO NOTHING`** for all tables. Running the same ingestion twice won't duplicate data. This is important for:
- Resuming failed ingests
- Updating specific sessions without re-fetching everything
- Cron-based scheduled ingestion

## Usage

```bash
# Ingest a specific GP
docker compose run --rm ingestion \
  python -m backend.ingestion.ingest_openf1 \
  --year 2026 --gp "Monaco"

# Ingest all GPs in a season
docker compose run --rm ingestion \
  python -m backend.ingestion.ingest_openf1 \
  --year 2026 --all

# List available GPs for a year
docker compose run --rm ingestion \
  python -m backend.ingestion.ingest_openf1 \
  --year 2026 --list
```

## Automation

A helper script at `scripts/auto-ingest.sh` wraps ingestion for cron usage:

```bash
# Add to crontab for weekly ingestion
0 2 * * 1 cd ~/f1-analysis && ./scripts/auto-ingest.sh
```

## Rate Limiting

OpenF1 is free and open-source with no documented rate limit. However, the ingestion pipeline includes:
- 50ms delay between requests to be a good API citizen
- Retry with exponential backoff (3 attempts) on transient failures
- Timeout of 30s per request

## Data Freshness

By default, ingestion fetches all data for a session on each run. Since F1 sessions update in real-time during the weekend, re-running ingestion for the same session after it completes adds no overhead (ON CONFLICT DO NOTHING handles duplicates).

For real-time updates during a race weekend, run ingestion in a loop:

```bash
while true; do
  docker compose run --rm ingestion \
    python -m backend.ingestion.ingest_openf1 \
    --year 2026 --gp "Monaco"
  sleep 300  # Every 5 minutes
done
```

## Next

- 📡 **[API Reference](docs.html?page=tech-api)** — query the ingested data
- 🚀 **[Deployment](docs.html?page=tech-deployment)** — deploy to your own VPS
