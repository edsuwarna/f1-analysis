# F1 Analysis 2026 🏎️📊

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Formula 1 telemetry & performance analysis platform.**  
> Real-time race data visualization, driver comparisons, and season analytics powered by [OpenF1 API](https://openf1.org/).

**🌐 Live:** [f1-analysis.edsuwarna.id](https://f1-analysis.edsuwarna.id)  
**📚 Docs:** [f1-analysis-docs.pages.dev](https://f1-analysis-docs.pages.dev)

---

## 📋 Features

### 🏁 Session Analysis (per GP)
| Section | Description |
|---|---|
| 🏆 **Best Sector Times** | Fastest sector 1/2/3 per driver with color-coded ranking (🟣 overall best / 🟢 top 3 / 🟡 others) |
| ⏱️ **Qualifying Evolution** | Q1→Q2→Q3 progression with group bar chart & driver picker |
| 📈 **Lap Distribution** | Pace vs consistency scatter plot — avg lap time vs std deviation |
| 🏁 **Position History** | Lap-by-lap race position chart with selectable drivers |
| ⛽ **Pit Strategy Battle** | Undercut analysis, stint comparison, net position effect |
| 🛞 **Tyre Strategy Timeline** | Visual compound timeline per driver with lap-scale & hover tooltip |
| ⛽ **Pit Stop Analysis** | Stop times ranking, fastest/slowest stops, pit window visualization |
| 🌤️ **Weather Impact** | Air/track temperature chart with humidity & pressure |
| 🤜🤛 **Driver Comparison** | Side-by-side lap stats + telemetry overlay (speed, RPM, throttle, brake) |
| 📊 **Gap Timeline** | Cumulative gap to leader with reference driver picker + checkboxes |
| 🏁 **Overtake Analysis** | Position changes per lap with net overtakes ranking |
| 🗺️ **Track Position Map** | Circuit visualization with driver positions per lap (slider control) |
| 🛞 **Tyre Degradation** | Lap time vs tyre age scatter — compare 2 drivers, team colors, compound markers |

### 📊 Season Analysis
| Section | Description |
|---|---|
| 📈 **Points Progression** | Cumulative points per driver across rounds — line chart with driver toggle |
| 🤜🤛 **Head-to-Head** | Driver vs driver matchups — qualifying & race win counts across season |
| ⛽ **Pit Stop Championship** | Team rankings by avg pit stop speed, consistency, fastest/slowest stops |

### 🏆 Championship
| Section | Description |
|---|---|
| 👨‍👩‍👧‍👦 **Driver Standings** | Season points with progress bar & medal indicators |
| 🏭 **Constructor Standings** | Team championship with progress bars |
| 📋 **Race Results** | Per-GP results with Race/Sprint separation, position & points badges |

### 📦 Data Export
| Format | Data Types |
|---|---|
| 📥 **CSV Export** | Laps · Telemetry · Tyre Stints · Pit Stops · Weather — per session |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│              Cloudflare Pages (CDN)              │
│         f1-analysis.edsuwarna.id                 │
│           Vanilla JS + Chart.js                  │
└──────────────────────┬───────────────────────────┘
                       │
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
- **Backend:** Python 3.12 · FastAPI · SQLAlchemy (async)
- **Database:** PostgreSQL 18
- **Frontend:** Vanilla JS · Tailwind CSS (CDN) · Chart.js 4
- **Infrastructure:** Docker Compose · Cloudflare Pages
- **Data Source:** [OpenF1 API](https://openf1.org/) — free & open-source F1 timing data

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose v2
- Git

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/edsuwarna/f1-analysis.git
cd f1-analysis

# 2. Copy environment & configure
cp .env.example .env
# Edit .env with your PostgreSQL password

# 3. Start database and API server
docker compose up -d postgres backend

# 4. Ingest a race weekend
docker compose run --rm ingestion python -m backend.ingestion.ingest_openf1 --year 2026 --gp Australia

# 5. Open the app
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

---

## 📡 API Endpoints

### Meetings
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/meetings` | List all race weekends (optional `?year=2026`) |
| GET | `/api/meetings/{id}` | Get meeting details |
| GET | `/api/meetings/{id}/sessions` | List sessions in a meeting |

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
| GET | `/api/sessions/{id}/weather` | Weather timeline (temp, humidity, pressure, wind) |
| GET | `/api/sessions/{id}/export/csv?data_type=laps` | Export lap data as CSV |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/championship?year=2026` | Driver & Constructor standings + per-GP results |
| GET | `/api/analytics/season-progression?year=2026` | Cumulative points per driver across rounds |
| GET | `/api/analytics/head-to-head?year=2026` | Driver vs driver qualifying & race matchups |
| GET | `/api/analytics/pit-stop-championship?year=2026` | Team pit stop speed rankings |
| GET | `/api/analytics/sectors?year=2026` | Season-wide sector trends |
| GET | `/api/analytics/lap-distribution?session_id=N` | Lap stats (avg, median, stddev, consistency) |
| GET | `/api/analytics/sessions/{id}/pit-strategy` | Pit stop impact analysis (undercut deltas) |
| GET | `/api/analytics/tyre-strategy?meeting_id=N` | Tyre strategy summary |
| GET | `/api/analytics/qualifying-summary?meeting_id=N` | Q1→Q2→Q3 best lap progression |
| GET | `/api/analytics/teammate-battle?year=2026` | Season-long teammate comparisons |

Full interactive API docs at `/docs` (Swagger UI) when backend is running.

---

## 🗄️ Database

**Core tables:** `meetings`, `sessions`, `session_drivers`, `laps`, `telemetry`, `stints`, `pit_stops`, `weather`, `race_control_messages`

Data ingested from [OpenF1 API](https://openf1.org/) — free & open-source F1 timing data.

---

## 🎨 Frontend Highlights

- **Dark/Light theme** — persisted to localStorage
- **Responsive** — mobile-first with touch targets (44px+ buttons)
- **Floating ToC** — "Jump to Section" bottom sheet for long session pages
- **Collapsible sections** — click to expand/collapse analysis cards
- **Driver picker** — checkbox-based filtering on charts
- **State persistence** — sessionStorage keeps your place on refresh
- **CSV export** — one-click download for lap, telemetry, stint, pit stop & weather data
- **Team logos** — SVG team branding throughout the UI

---

## 📄 License

MIT — © [Endang Suwarna](https://edsuwarna.id)
