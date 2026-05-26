# Create and initialize the database
.PHONY: init-db
init-db:
	docker compose up -d postgres
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 5
	@echo "Database ready!"

# Start the full stack (DB + API)
.PHONY: up
up:
	docker compose up -d postgres backend

# Stop everything
.PHONY: down
down:
	docker compose down

# View logs
.PHONY: logs
logs:
	docker compose logs -f

# Ingest a specific race
.PHONY: ingest
ingest:
	docker compose run --rm ingestion python -m backend.ingestion.ingest_race $(FILTERS)

# Ingest all completed races for a season
.PHONY: ingest-all
ingest-all:
	docker compose run --rm ingestion python -m backend.ingestion.ingest_race --year $(YEAR) --all

# List available events
.PHONY: list-events
list-events:
	docker compose run --rm ingestion python -m backend.ingestion.ingest_race --year $(YEAR) --list

# Rebuild containers
.PHONY: rebuild
rebuild:
	docker compose build --no-cache
	docker compose up -d

# Reset database (WARNING: deletes all data!)
.PHONY: reset-db
reset-db:
	docker compose down -v
	docker compose up -d postgres
	@sleep 5

# Run backend tests
.PHONY: test
test:
	docker compose run --rm backend pytest

# API docs
.PHONY: docs
docs:
	@echo "Open http://localhost:8000/docs in your browser"
