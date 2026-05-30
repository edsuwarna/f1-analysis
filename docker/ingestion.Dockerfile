FROM python:3.12-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements-ingestion.txt .
RUN pip install --no-cache-dir -r requirements-ingestion.txt

COPY backend/ /app/backend/
COPY scripts/ /app/scripts/
COPY migrations/ /app/migrations/

CMD ["tail", "-f", "/dev/null"]
