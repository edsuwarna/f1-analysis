# ⚡ Quick Start

Get F1 Analysis running on your own machine in minutes.

## Prerequisites

- **Docker & Docker Compose v2**
- **Git**
- **4GB+ RAM** available for PostgreSQL + backend

## Setup

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

## Commands Reference

| Command | Description |
|---|---|
| `docker compose up -d` | Start all services |
| `docker compose down` | Stop all services |
| `docker compose run --rm ingestion python -m backend.ingestion.ingest_openf1 --year 2026 --gp "Monaco"` | Ingest a specific GP |
| `docker compose run --rm ingestion python -m backend.ingestion.ingest_openf1 --year 2026 --all` | Ingest full season |
| `docker compose run --rm ingestion python -m backend.ingestion.ingest_openf1 --year 2026 --list` | List available GPs |
| `docker compose logs -f backend` | View backend logs |
| `docker compose logs -f ingestion` | View ingestion logs |

## What's Next?

- 📖 **[How to Read the Analysis](docs.html?page=guide-overview)** — understand each analysis section
- ⚙️ **[Tech Stack](docs.html?page=tech-stack)** — what powers this platform
- 🚀 **[Deployment Guide](docs.html?page=tech-deployment)** — deploy to your own VPS
