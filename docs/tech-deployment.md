# 🚀 Deployment

Deploy F1 Analysis to your own VPS with Docker Compose.

## Architecture

```
Cloudflare Pages (frontend) ─── CF Tunnel ─── VPS
  f1-analysis-xxx.pages.dev                  FastAPI :8000
  (auto-deploy from main)                     PostgreSQL :5432
```

## Prerequisites

- **VPS** with Docker & Docker Compose v2 (4GB+ RAM recommended)
- **Domain name** (optional, for CF Tunnel)
- **Cloudflare account** (for Tunnel + Pages)
- **GitHub account** (for CI/CD)

## Step 1: VPS Setup

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Clone the repository
git clone https://github.com/edsuwarna/f1-analysis.git
cd f1-analysis

# Start services
docker compose up -d postgres backend
```

## Step 2: Configure Environment

Create `docker-compose.override.yml` or set env vars:

```yaml
services:
  backend:
    environment:
      - DATABASE_URL=postgresql+asyncpg://f1:f1_password@postgres:5432/f1_analysis
      - CORS_ORIGINS=https://your-domain.com
```

## Step 3: Cloudflare Tunnel

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create f1-analysis

# Route DNS
cloudflared tunnel route dns f1-analysis f1-api.your-domain.com

# Create config
cat > ~/.cloudflared/config.yml <<EOF
tunnel: <tunnel-id>
credentials-file: /home/ubuntu/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: f1-api.your-domain.com
    service: http://localhost:8000
  - service: http_status:404
EOF

# Run tunnel as service
sudo cloudflared service install
```

## Step 4: Cloudflare Pages

1. Go to **Cloudflare Dashboard → Pages**
2. **Connect to Git** → select your f1-analysis repo
3. **Build settings:**
   - Build command: `none`
   - Build output: `frontend/`
4. **Environment variables:**
   - `API_BASE_URL=https://f1-api.your-domain.com`
5. **Deploy!**

## Step 5: CF Tunnel → Frontend

Update the frontend's API base URL. In `frontend/index.html`, the base URL is auto-detected from environment or uses a placeholder. For production, you can set it via:

```javascript
const API = 'https://f1-api.your-domain.com';
```

## Step 6: Ingest Data

```bash
# Ingest a season
docker compose run --rm ingestion \
  python -m backend.ingestion.ingest_openf1 --year 2026 --all

# Or just specific GP
docker compose run --rm ingestion \
  python -m backend.ingestion.ingest_openf1 --year 2026 --gp "Monaco"
```

## Maintenance

### Updates
```bash
cd ~/f1-analysis
git pull
docker compose down
docker compose up -d --build
```

### Backups
```bash
# Backup database
docker compose exec -T postgres pg_dump -U f1 f1_analysis > backup_$(date +%Y%m%d).sql

# Restore
cat backup.sql | docker compose exec -T postgres psql -U f1 f1_analysis
```

### Logs
```bash
docker compose logs -f backend
docker compose logs -f postgres
```

## Next

- 🛠️ **[Development Guide](docs.html?page=tech-development)** — local dev setup, contributing
