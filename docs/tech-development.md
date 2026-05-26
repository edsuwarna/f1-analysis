# 🛠️ Development

Guide for local development and contributing to F1 Analysis.

## Local Setup

```bash
# Clone
git clone https://github.com/edsuwarna/f1-analysis.git
cd f1-analysis

# Start services
docker compose up -d postgres backend

# Verify backend is running
curl http://localhost:8000/health
{"status": "ok"}
```

## Project Structure

```
f1-analysis/
├── backend/                    # Python FastAPI
│   ├── main.py                # Application entry
│   ├── api/                   # Route handlers
│   │   ├── meetings.py
│   │   ├── sessions.py
│   │   └── analytics.py
│   ├── core/
│   │   └── database.py        # DB connection
│   ├── models/
│   │   └── models.py          # SQLAlchemy ORM
│   └── ingestion/
│       ├── ingest_openf1.py   # OpenF1 API ingestion
│       └── ingest_race.py
├── frontend/
│   └── index.html             # Single-page app
├── docker/
│   ├── backend.Dockerfile
│   ├── ingestion.Dockerfile
│   └── init-db.sql
└── docker-compose.yml
```

## Development Workflow

### Backend Changes

The backend container mounts the `backend/` directory for live reload. FastAPI auto-restarts on file changes with `--reload`.

```yaml
# docker-compose.yml
services:
  backend:
    build:
      context: .
      dockerfile: docker/backend.Dockerfile
    volumes:
      - ./backend:/app/backend  # Live reload
    command: uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Changes

The frontend is a single `index.html`. Just edit the file and refresh the browser. For the live site, push to GitHub main → CF Pages auto-deploys.

### Adding a New API Endpoint

1. Create or edit a route handler in `backend/api/`
2. Define a Pydantic response model (or use dict)
3. Add the route function with the @router decorator
4. The new endpoint appears in Swagger docs automatically

**Example:**
```python
# backend/api/analytics.py
from fastapi import APIRouter
from backend.core.database import get_db

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/my-new-analysis")
async def my_new_analysis(session_id: int):
    query = "SELECT ..."
    async with get_db() as db:
        result = await db.fetch_all(query)
    return result
```

### Adding a New Analysis Section

1. Add API endpoint in `backend/api/`
2. Add HTML section in `frontend/index.html`
3. Add rendering function in the frontend JS
4. Add guide page in `docs/guide-section-name.md`
5. Update `docs.html` PAGES array

## Database Changes

### Adding a Column

1. Add column to SQLAlchemy model in `backend/models/models.py`
2. Run ALTER TABLE on PostgreSQL:
```bash
docker compose exec postgres psql -U f1 f1_analysis
ALTER TABLE laps ADD COLUMN new_column TYPE;
```

For repeated development, consider formal migrations (Alembic).

## Testing

```bash
# Run API tests
docker compose run --rm backend python -m pytest

# Test ingestion with a small GP
docker compose run --rm ingestion \
  python -m backend.ingestion.ingest_openf1 --year 2026 --gp "Australia"
```

## Debugging

### Check database
```bash
docker compose exec postgres psql -U f1 f1_analysis
\dt  # List tables
SELECT COUNT(*) FROM laps;
```

### Check API logs
```bash
docker compose logs -f backend
```

### Check ingestion
```bash
docker compose logs -f ingestion
```

## Deploying Changes

### Frontend only
Push to `main` on GitHub → CF Pages auto-deploys within 2 minutes.

### Backend + Frontend
```bash
# On VPS
cd ~/f1-analysis
git pull
docker compose up -d --build backend
```
