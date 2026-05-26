# 🔧 Tech Stack & Rationale

Every technology choice made deliberately. Here's why.

## Backend: Python FastAPI 🐍

**Why:** Async-native framework perfect for serving telemetry data with high concurrency. Auto-generates OpenAPI/Swagger docs at `/docs` — no extra work. Python ecosystem gives us direct access to the OpenF1 API and data processing libraries.

**Alternatives considered:**
- **Node/Express** — faster I/O but weaker data processing ecosystem
- **Go** — excellent performance but more boilerplate for API + DB work

**Key libraries:**
- `FastAPI` + `uvicorn` — async web server
- `SQLAlchemy` + `asyncpg` — async PostgreSQL ORM
- `httpx` — async HTTP client for OpenF1 API
- `pydantic` — data validation and settings management

## Database: PostgreSQL 18 🗄️

**Why:** Time-series data (lap times, telemetry) naturally fits PostgreSQL with window functions, CTEs, and array types for telemetry. JSONB for flexible metadata storage. Solid tooling ecosystem.

**Key schema design decisions:**
- Normalised design: `meetings` → `sessions` → `session_drivers` → `laps` | `telemetry` | `stints` | `pit_stops` | `weather`
- Composite indexes on `(session_key, driver_number)` for common query patterns
- `meeting_key`/`session_key` mirror OpenF1's IDs for traceability

**Alternatives:**
- **InfluxDB/TimescaleDB** — overkill; our query patterns are known and relational
- **SQLite** — not suitable for concurrent ingestion + query workload

## Frontend: Vanilla JS + Tailwind CSS (CDN) + Chart.js 🎨

**Why:** Zero build step. The frontend is a single `index.html` deployed to Cloudflare Pages — no Webpack, no npm install, no CI build. Chart.js is powerful enough for all our visualizations (line, scatter, bar, bubble).

**Key decisions:**
- **No framework** — this is a data-heavy dashboard, not a component-heavy app. DOM manipulation is straightforward and faster than loading React for what we need.
- **Tailwind via CDN** — utility classes for responsive design without a build step
- **Dark/light theme** — CSS variables, persisted to localStorage
- **Client-side caching** — qualifying data cached for instant re-render

**Alternatives considered:**
- **React/Svelte** — adds build tooling complexity for marginal benefit
- **D3.js** — more powerful but overkill; Chart.js covers 95% of use cases
- **Highcharts** — proprietary license, no advantage over Chart.js

## Infrastructure: Docker Compose 🐳

**Why:** Reproducible local development and production deployment. Single `docker compose up -d` starts everything: PostgreSQL, FastAPI backend, and on-demand ingestion.

**Services:**
- `postgres` — Alpine-based PostgreSQL 18 with init SQL
- `backend` — FastAPI via uvicorn, mounted for live reload
- `ingestion` — on-demand container for fetching OpenF1 data

## Hosting: Cloudflare Pages + Tunnel 🌐

**Why:**
- **Frontend** → Cloudflare Pages auto-deploy from GitHub `main` branch
- **API proxy** → Cloudflare Tunnel → localhost:8000 (no open firewall ports)
- **Free tier** — Pages and Tunnel are free for this traffic level

## What's Next

- 🏗️ **[Architecture](docs.html?page=tech-architecture)** — system design and data flow
- 🗄️ **[Data Sources](docs.html?page=tech-data-sources)** — OpenF1 API and database schema
