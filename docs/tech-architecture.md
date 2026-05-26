# 🏗️ Architecture

## System Architecture

```
┌──────────────────────────────────────────────────┐
│              Cloudflare Pages (CDN)              │
│         f1-analysis-xxx.pages.dev                │
│           Vanilla JS + Chart.js                  │
│         (auto-deploy from GitHub main)           │
└──────────────────────┬───────────────────────────┘
                       │ HTTPS via Cloudflare Tunnel
┌──────────────────────┴───────────────────────────┐
│              VPS (Docker Compose)                 │
│                                                    │
│  ┌──────────────────────────────────────────────┐ │
│  │              FastAPI (:8000)                  │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │ │
│  │  │  REST    │  │  Swagger │  │  CORS    │   │ │
│  │  │  Routes  │  │  Docs    │  │  Middle- │   │ │
│  │  │          │  │  /docs   │  │  ware    │   │ │
│  │  └────┬─────┘  └──────────┘  └──────────┘   │ │
│  │       │                                       │ │
│  │  ┌────┴─────────────────────────────┐         │ │
│  │  │  SQLAlchemy async ORM            │         │ │
│  │  └────┬─────────────────────────────┘         │ │
│  └───────┼───────────────────────────────────────┘ │
│          │                                         │
│  ┌───────┴──────────────┐     ┌──────────────┐    │
│  │  PostgreSQL 18       │     │  Ingestion   │    │
│  │  (Port 5432)         │◄────│  (on-demand  │    │
│  │  10 tables           │     │   container) │    │
│  └──────────────────────┘     └──────┬───────┘    │
│                                      │             │
│                              ┌───────┴───────┐    │
│                              │  OpenF1 API   │    │
│                              │  (external)   │    │
│                              └───────────────┘    │
└──────────────────────────────────────────────────┘
```

## Data Flow

### Ingestion Pipeline (On-Demand)

```
User triggers ingestion
        │
        ▼
  Ingestion container starts
        │
        ▼
  Fetch meetings from OpenF1 API
        │
        ▼
  For each meeting, fetch sessions
        │
        ▼
  For each session, fetch:
  ├── Laps (with sectors, compound, tyre age)
  ├── Car data / Telemetry
  ├── Stints
  ├── Pit stops
  ├── Weather
  ├── Race control messages
  └── Driver info
        │
        ▼
  Store to PostgreSQL in batch
        │
        ▼
  Container exits ✓
```

### Request Flow (Runtime)

```
User opens app in browser
        │
        ▼
  CF Pages serves index.html
        │
        ▼
  JS fetches /api/meetings
        │
        ▼
  CF Tunnel → FastAPI on VPS
        │
        ▼
  FastAPI queries PostgreSQL
        │
        ▼
  Returns JSON response
        │
        ▼
  Chart.js renders visualizations
```

## Directory Structure

```
f1-analysis/
├── backend/
│   ├── main.py                     # FastAPI app entry
│   ├── api/
│   │   ├── meetings.py             # Meeting/session endpoints
│   │   ├── sessions.py             # Session data endpoints
│   │   └── analytics.py            # Aggregated analysis endpoints
│   ├── core/
│   │   ├── database.py             # DB connection + session
│   │   └── __init__.py
│   ├── models/
│   │   └── models.py               # SQLAlchemy models
│   └── ingestion/
│       ├── ingest_openf1.py        # OpenF1 API ingestion
│       └── ingest_race.py          # Race data processing
├── frontend/
│   └── index.html                  # Single-page app
├── docker/
│   ├── backend.Dockerfile
│   ├── ingestion.Dockerfile
│   └── init-db.sql                 # DB schema init
├── docker-compose.yml
├── requirements-backend.txt
├── requirements-ingestion.txt
└── docs/                           # This documentation
```

## Next

- 🗄️ **[Data Sources & Schema](docs.html?page=tech-data-sources)** — OpenF1 API and database tables
- 📥 **[Ingestion Pipeline](docs.html?page=tech-ingestion)** — how data gets from OpenF1 to PostgreSQL
