# F1 Analysis 2026 🏎️

> **Real-time Formula 1 telemetry & performance analysis platform.**
>
> A comprehensive web application for analyzing Formula 1 race data — sector times,
> tyre strategy, driver comparisons, pit stop analysis, qualifying evolution,
> gap timelines, overtake analysis, and more.

**Live demo:** [f1-analysis.edsuwarna.id](https://f1-analysis.edsuwarna.id)
**Documentation:** [📚 f1-analysis-docs.pages.dev](https://f1-analysis-docs.pages.dev)

---

## 📊 Features

| Section | Description |
|---|---|
| 🏆 **Best Sector Times** | Fastest sector 1/2/3 per driver, auto-loaded on session open |
| ⏱️ **Qualifying Evolution** | Q1→Q2→Q3 best lap progression with driver picker chart |
| 📈 **Lap Distribution** | Pace vs consistency scatter chart per driver |
| 🏁 **Position History** | Lap-by-lap race position with selectable drivers |
| ⛽ **Pit Strategy Battle** | Undercut analysis, stint comparison, net position effect |
| 🛞 **Tyre Strategy Timeline** | Compound mapping per driver with visual timeline |
| ⛽ **Pit Stop Analysis** | Stop times, crew performance, fast/slowest stops |
| 🌤️ **Weather Impact** | Air/track temperature, humidity, rainfall timeline |
| 🤜🤛 **Driver Comparison** | Side-by-side lap/sector comparison |
| 📊 **Gap Timeline** | Cumulative gap to leader with reference driver picker |
| 🏁 **Overtake Analysis** | Position changes per lap, net overtakes ranking |
| 🛞 **Tyre Degradation** | Lap time vs tyre age scatter plot (2 drivers, team colors) |
| 🏆 **Championship Standings** | Driver & Constructor points with per-GP race results |

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│              Cloudflare Pages (CDN)              │
│         f1-analysis-dsp.pages.dev                │
│           Vanilla JS + Chart.js                  │
└──────────────────────┬───────────────────────────┘
                       │ CF Tunnel (HTTPS)
┌──────────────────────┴───────────────────────────┐
│              VPS (Docker Compose)                 │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ FastAPI  │  │PostgreSQL│  │  Ingestion    │  │
│  │  :8000   │  │  :5432   │  │ (on-demand)   │  │
│  └────┬─────┘  └──────────┘  └───────────────┘  │
│       │                                          │
│  ┌────┴─────┐                                    │
│  │ OpenF1   │ (external API)                      │
│  │ API      │                                    │
│  └──────────┘                                    │
└──────────────────────────────────────────────────┘
```

**Tech Stack:**
- **Backend:** Python FastAPI (async via SQLAlchemy)
- **Database:** PostgreSQL 18 on Alpine
- **Frontend:** Vanilla JS + Tailwind CSS (CDN) + Chart.js
- **Infrastructure:** Docker Compose on VPS
- **CDN:** Cloudflare Pages (auto-deploy from GitHub main)
- **API Proxy:** Cloudflare Tunnel → localhost:8000

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose v2
- Git

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/edsuwarna/f1-analysis.git
cd f1-analysis

# 2. Start database and API server
docker compose up -d postgres backend

# 3. Ingest a race weekend
docker compose run --rm ingestion python -m backend.ingestion.ingest_openf1 --year 2026 --gp Australia

# 4. Open the app
open http://localhost:8000
```

### Commands

| Command | Description |
|---|---|
| `docker compose up -d` | Start all services |
| `docker compose down` | Stop all services |
| `docker compose run --rm ingestion python -m backend.ingestion.ingest_openf1 --year 2026 --gp "Monaco"` | Ingest a specific GP |
| `docker compose run --rm ingestion python -m backend.ingestion.ingest_openf1 --year 2026 --all` | Ingest full season |
| `docker compose run --rm ingestion python -m backend.ingestion.ingest_openf1 --year 2026 --list` | List available GPs |
| `docker compose logs -f backend` | View backend logs |

## 📡 API Endpoints

### Meetings
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/meetings` | List all race weekends (optional `?year=2026`) |
| GET | `/api/meetings/{id}` | Get meeting details |
| GET | `/api/meetings/{id}/sessions` | List sessions in a meeting (FP1-3, Qualifying, Race, Sprint) |

### Sessions
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/sessions/{id}` | Session details |
| GET | `/api/sessions/{id}/drivers` | Drivers in session (with team colours) |
| GET | `/api/sessions/{id}/laps` | Lap times with sectors, compound, tyre age, position |
| GET | `/api/sessions/{id}/sectors` | Best sector 1/2/3 + theoretical best lap |
| GET | `/api/sessions/{id}/stints` | Tyre stint information |
| GET | `/api/sessions/{id}/pit-stops` | Pit stop events |
| GET | `/api/sessions/{id}/gaps` | Gap timeline (cumulative to leader) |
| GET | `/api/sessions/{id}/positions` | Position history (lap-by-lap) |
| GET | `/api/sessions/{id}/qualifying-evolution` | Lap-by-lap qualifying progression |
| GET | `/api/sessions/{id}/telemetry/{driver}` | Telemetry (speed, throttle, brake, DRS, RPM, gear) |
| GET | `/api/sessions/{id}/compare/{d1}/{d2}` | Head-to-head driver comparison |
| GET | `/api/sessions/{id}/weather` | Weather timeline (temp, humidity, pressure, wind) |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/sectors?year=2026` | Season-wide sector trends |
| GET | `/api/analytics/driver-progress/{num}?year=2026` | Driver's season performance |
| GET | `/api/analytics/championship?year=2026` | Driver & Constructor standings + per-GP results |
| GET | `/api/analytics/lap-distribution?session_id=N` | Lap stats (avg, median, stddev, consistency) |
| GET | `/api/analytics/sessions/{id}/pit-strategy` | Pit stop impact analysis (undercut deltas) |
| GET | `/api/analytics/tyre-strategy?meeting_id=N` | Tyre strategy summary |
| GET | `/api/analytics/qualifying-summary?meeting_id=N` | Q1→Q2→Q3 best lap progression (auto-segmented) |

Full interactive API docs at `/docs` (Swagger UI) when backend is running.

## 🗄️ Database

**Core tables:** `meetings`, `sessions`, `session_drivers`, `laps`, `telemetry`, `stints`, `pit_stops`, `weather`, `race_control_messages`

Data ingested from [OpenF1 API](https://openf1.org/) — free & open-source F1 timing data.

## 🎨 Frontend Highlights

- **Dark/Light theme** — persisted to localStorage
- **Responsive** — mobile-first with touch targets (44px+ buttons)
- **Floating ToC** — "Jump to Section" bottom sheet for session pages
- **Collapsible sections** — click to expand/collapse analysis cards
- **Driver picker** — checkbox-based filtering on Gap Timeline, Qualifying Evolution
- **Section caching** — qualifying data cached client-side for instant re-render
- **Auto-loaded sectors** — Best Sector Times loads immediately on session open

## 📄 License

MIT — Endang Suwarna
