# F1 Analysis

> **Formula 1 Telemetry & Performance Analysis Platform**
> 
> A comprehensive web application for analyzing Formula 1 race data — lap times,
> sector performance, telemetry, tyre strategy, and pit stops.

## 🏎️ Features

- **Sector Time Analysis** — Who's fastest in each sector, every session
- **Driver Comparison** — Head-to-head telemetry and lap time overlay
- **Tyre Strategy** — Compound tracking, stint visualization, undercut analysis
- **Pit Stop Data** — Pit duration, lane loss, position changes
- **Weather Data** — Track/air temperature, humidity, rainfall correlation
- **Full Session Reports** — Complete data for FP1-3, Qualifying, Race, Sprint

## 🏗️ Architecture

```
┌──────────────────────────────────────────┐
│              Docker Compose               │
│  ┌──────────┐  ┌──────────┐              │
│  │PostgreSQL│  │ FastAPI  │              │
│  │  :5432   │  │  :8000   │              │
│  └────┬─────┘  └────┬─────┘              │
│       │              │                   │
│  ┌────┴──────────────┘                   │
│  │  Ingestion (Fast-F1)                  │
│  └───────────────────────────────────────┘
│                                           │
│  Frontend: Separate (Cloudflare Pages)    │
└───────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git

### Setup

```bash
# 1. Clone & start services
git clone https://github.com/edsuwarna/f1-analysis.git
cd f1-analysis
make up

# 2. Ingest a race weekend
make ingest FILTERS="--year 2025 --gp Australia"

# 3. Open API docs
open http://localhost:8000/docs
```

### Commands

```bash
make up             # Start DB + API
make down           # Stop everything
make ingest FILTERS="--year 2025 --gp Monaco"     # Ingest race
make ingest-all YEAR=2025                          # Ingest full season
make list-events YEAR=2025                         # List available races
make logs           # View logs
make reset-db       # Wipe and recreate database
```

## 📡 API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/meetings` | List race weekends |
| `GET /api/meetings/{id}/sessions` | Sessions per weekend |
| `GET /api/sessions/{id}/laps` | Lap times with sectors |
| `GET /api/sessions/{id}/sectors` | Best sector times per driver |
| `GET /api/sessions/{id}/stints` | Tyre compound strategy |
| `GET /api/sessions/{id}/pit-stops` | Pit stop events |
| `GET /api/sessions/{id}/telemetry/{driver}` | Car telemetry data |
| `GET /api/sessions/{id}/compare/{d1}/{d2}` | Head-to-head comparison |
| `GET /api/sessions/{id}/weather` | Weather timeline |
| `GET /api/analytics/sectors?year=2025` | Season sector trends |
| `GET /api/analytics/driver-progress/{num}` | Driver season progress |

Full API docs at `http://localhost:8000/docs`

## 🗄️ Database Schema

**Core tables:**
- `meetings` — Race weekends
- `sessions` — FP1/FP2/FP3/Qualifying/Race/Sprint
- `session_drivers` — Drivers per session
- `laps` — Lap data with sector 1/2/3 times
- `telemetry` — High-frequency car data (speed, throttle, brake, DRS, RPM, gear)
- `stints` — Tyre compound stints
- `pit_stops` — Pit stop events
- `weather` — Track conditions timeline
- `race_control_messages` — Flags, SC, VSC, penalties

## 📊 Data Sources

- **[Fast-F1](https://github.com/theOehrly/Fast-F1)** — Python library for F1 timing data & telemetry
- **[OpenF1 API](https://openf1.org/)** — Free & open-source F1 API (supplementary)
- **[jolpica-f1](https://api.jolpi.ca/ergast/f1/)** — Historical F1 data (Ergast replacement)

## 📄 License

MIT License
