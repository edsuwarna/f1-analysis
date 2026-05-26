# F1 Analysis — Product Requirements Document

> **Project:** F1 Telemetry & Performance Analysis Web
> **Status:** Draft v1.0
> **Author:** Endang Suwarna

---

## 1. Background & Problem Statement

Sebagai penggemar berat F1, nonton race doang rasanya kurang puas — apalagi pas lihat overtake, pit stop undercut, atau beda strategi ban yang bikin hasil race berubah drastis. Sering muncul pertanyaan teknis yang data jawabannya ada tapi susah diakses secara terintegrasi:

- "Siapa sebenarnya yang paling kencang di Sektor 3? Atau cuma karena DRS?"
- "Apakah performa McLaren turun drastis pas pindah ke Medium compound?"
- "Gimana trajectory posisi Verstappen vs Norris lap per lap selama race?"
- "Apakah pit stop Hamilton yang 2.5s itu bikin dia kalah undercut?"

Sumber data F1 publik **sudah lengkap** (Fast-F1, OpenF1 API, jolpica-f1) tapi belum ada platform yang:
1. Menyatukan semua data (telemetry, lap, tyre, weather, pit) dalam satu tempat
2. Memberikan akses query fleksibel untuk analisis teknis
3. Bisa compare 2 pembalap secara visual per session
4. Tracking historical data multi-race untuk lihat trend

Solusi yang ada (GP Tempo, Armchair Strategist) sifatnya read-only dan terbatas fitur comparasinya. Kita butuh platform sendiri yang **flexible, bisa dikustom, dan punya data histori penuh**.

---

## 2. Goals & Objectives

### 2.1 Tujuan Utama
Membangun web application untuk analisis teknis F1 yang menyatukan data telemetry, lap timing, tyre strategy, dan pit stop dalam satu platform dengan kemampuan query dan visualisasi yang fleksibel.

### 2.2 Objectives
- **Data Ownership:** Memiliki database F1 sendiri yang terstruktur, bisa di-query kapan aja tanpa dependensi API eksternal
- **Sector Analysis:** Menampilkan siapa tercepat di tiap sektor di tiap session
- **Driver Comparison:** Compare 2 driver secara head-to-head (telemetry overlay, lap time, sector)
- **Tyre & Pit Strategy:** Visualisasi stint, compound, dan dampak pit stop terhadap posisi
- **Session Report:** Full report tiap session (FP1, Qualifying, Race, Sprint) dengan data lengkap
- **Historical Trending:** Bandingkan performa driver/team antar race dalam satu musim

---

## 3. Scope

### 3.1 In Scope (MVP)
- ✅ Data ingestion pipeline menggunakan **Fast-F1** (Python)
- ✅ PostgreSQL database dengan schema lengkap (meetings, sessions, laps, telemetry, stints, pit_stops, weather, drivers)
- ✅ Docker Compose setup (PostgreSQL + FastAPI backend)
- ✅ FastAPI REST API untuk akses data
- ✅ Frontend dasar dengan fitur:
  - Daftar race weekends
  - Session detail per race
  - Lap time table per session (sector 1/2/3, compound, position)
  - Driver comparison sederhana (2 drivers, side-by-side lap times)
  - Best sector times per session
- ✅ Data 2025 season (mulai dari Race 1 Australian GP, incremental tiap race)

### 3.2 In Scope (Post-MVP)
- 🔄 Telemetry overlay charts (speed, throttle, brake, RPM overlay)
- 🔄 Track position map (circuit visualization with car positions)
- 🔄 Tyre strategy timeline chart
- 🔄 Pit stop analysis (undercut/overcut calculator)
- 🔄 Weather impact correlation
- 🔄 Historical data backfill (2024, 2023 seasons)
- 🔄 Sprint session support
- 🔄 Driver standings & constructor standings tracking

### 3.3 Out of Scope (Saat Ini)
- ❌ Live timing / real-time data
- ❌ Machine learning / predictive models
- ❌ Multi-user authentication
- ❌ Mobile apps (responsive web cukup)
- ❌ Data sebelum 2025 (akan di-backfill post-MVP)

---

## 4. Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Docker Compose                        │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │   PostgreSQL 16   │  │  FastAPI Backend │                 │
│  │   + TimescaleDB   │  │  :8000           │                 │
│  │   :5432           │  │                  │                 │
│  └────────┬─────────┘  └────────┬─────────┘                 │
│           │                     │                           │
│           │    ┌────────────────┘                           │
│           ▼    ▼                                             │
│  ┌──────────────────────┐                                    │
│  │  Ingestion Container │                                    │
│  │  (Fast-F1, cron-job) │                                    │
│  └──────────────────────┘                                    │
│                                                              │
│  Frontend: Cloudflare Pages (terpisah docker)                │
└─────────────────────────────────────────────────────────────┘
```

### 4.1 Stack
| Layer | Technology | Alasan |
|---|---|---|
| Database | PostgreSQL 16 + TimescaleDB | Time-series optimal buat telemetry |
| Backend | FastAPI (Python) | Performa tinggi, auto OpenAPI docs |
| Data Ingestion | Fast-F1 + SQLAlchemy | Akses lengkap ke data F1 |
| Frontend | Next.js / React | Deploy di Cloudflare Pages |
| Container | Docker Compose | Simple, no orchestration complexity |
| Deployment | VPS (existing) | Nginx reverse proxy (existing) |

### 4.2 Data Flow
```
Fast-F1 (API call) → Python Script (ETL) → PostgreSQL DB → FastAPI Query → Frontend
                                                  ↑
                                    Manual trigger / cron job
```

---

## 5. Database Schema

### 5.1 Entity Relationship (Core Tables)

```
meetings ──┬── sessions ──┬── session_drivers
           │              │
           │              ├── laps
           │              │    └── telemetry (high-frequency, time-series)
           │              │
           │              ├── stints (tyre compound per stint)
           │              ├── pit_stops
           │              ├── weather (time-series)
           │              └── race_control_messages
           │
           └── circuits
```

### 5.2 Table Definitions

See `backend/models/` for full SQLAlchemy models. Key tables:

**laps** — Core lap timing data:
- `session_id`, `driver_number`, `lap_number`
- `duration_sector_1`, `duration_sector_2`, `duration_sector_3` (float, seconds)
- `lap_duration` (float, seconds)
- `compound` (VARCHAR: SOFT/MEDIUM/HARD/INTERMEDIATE/WET)
- `tyre_age` (int, laps on this tyre)
- `position` (int, race position)
- `is_personal_best`, `is_valid` (boolean)
- `speed_fl`, `speed_straight` (float, km/h)

**telemetry** — High-frequency car data (time-series):
- `session_id`, `driver_number`, `lap_number`, `timestamp`
- `speed`, `rpm`, `gear`, `throttle`, `brake`, `drs`
- `x`, `y` (track position coordinates)

**stints** — Tyre compound strategy:
- `session_id`, `driver_number`, `stint_number`
- `compound`, `lap_start`, `lap_end`, `total_laps`
- `tyre_age_at_start`

**pit_stops** — Pit stop events:
- `session_id`, `driver_number`, `lap_number`
- `pit_duration`, `lane_duration` (seconds)
- `compound_in`, `compound_out`

---

## 6. API Endpoints (FastAPI)

### 6.1 Data Access

| Endpoint | Description |
|---|---|
| `GET /api/meetings` | List race weekends |
| `GET /api/meetings/{id}/sessions` | Sessions dalam satu race weekend |
| `GET /api/sessions/{id}/drivers` | Drivers di suatu session |
| `GET /api/sessions/{id}/laps` | All laps (dengan optional driver filter) |
| `GET /api/sessions/{id}/sectors` | Best sector times per driver |
| `GET /api/sessions/{id}/stints` | Tyre stints semua driver |
| `GET /api/sessions/{id}/pit-stops` | Pit stops semua driver |
| `GET /api/sessions/{id}/compare/{d1}/{d2}` | Head-to-head 2 drivers |
| `GET /api/sessions/{id}/telemetry/{driver}` | Telemetry data per driver |
| `GET /api/sessions/{id}/weather` | Weather timeline |

### 6.2 Analytics

| Endpoint | Description |
|---|---|
| `GET /api/analytics/sectors?year=2025&session_type=Race` | Aggregated sector times |
| `GET /api/analytics/tyre-strategy?meeting_id=X` | Tyre strategy summary |
| `GET /api/analytics/driver-progress/{driver}?year=2025` | Performance trend per driver |

---

## 7. Ingestion Pipeline

### 7.1 Proses
1. **Trigger:** Manual via script atau cron setelah session selesai
2. **Load Session:** `fastf1.get_session(year, gp, session_name).load()`
3. **Extract:** Ambil data laps, telemetry, stints, weather, pit_stops
4. **Transform:** Mapping kolom, validasi, deduplikasi
5. **Load:** Insert ke PostgreSQL via SQLAlchemy bulk insert
6. **Verify:** Cek row count, data integrity

### 7.2 Schedule
- **Auto:** Setiap selesai session F1 (FP1, FP2, FP3, Qualifying, Sprint, Race)
- **Manual:** `python scripts/ingest_session.py --year 2025 --gp "Monaco" --session "R"`

---

## 8. Frontend Pages

| Route | Page | Data Source |
|---|---|---|
| `/` | Landing — Daftar Race 2025 | `GET /api/meetings` |
| `/meeting/{id}` | Race weekend — list sessions | `GET /api/meetings/{id}/sessions` |
| `/session/{id}` | Session detail + lap times | `GET /api/sessions/{id}/laps` |
| `/session/{id}/sectors` | Best sector times rank | `GET /api/sessions/{id}/sectors` |
| `/session/{id}/stints` | Tyre strategy visualization | `GET /api/sessions/{id}/stints` |
| `/session/{id}/pit-stops` | Pit stop analysis | `GET /api/sessions/{id}/pit-stops` |
| `/compare/{sessionId}?d1=VER&d2=NOR` | Head-to-head comparison | `GET /api/sessions/{id}/compare/{d1}/{d2}` |
| `/driver/{id}` | Driver season progress | `GET /api/analytics/driver-progress/{driver}` |

---

## 9. Milestones & Timeline

| Phase | Task | Estimated |
|---|---|---|
| **P0** | Setup Docker Compose (PG + FastAPI skeleton) | Day 1 |
| **P0** | Database models + migrations (SQLAlchemy) | Day 1 |
| **P1** | Ingestion pipeline (Fast-F1) — 1 race | Day 2 |
| **P1** | FastAPI endpoints — basic CRUD | Day 2-3 |
| **P2** | Frontend setup + landing page | Day 3-4 |
| **P2** | Lap time table + sector comparison | Day 4-5 |
| **P3** | Tyre strategy + pit stop visualization | Day 5-6 |
| **P3** | Driver comparison (head-to-head) | Day 6-7 |
| **P4** | Ingest full 2025 season data | Ongoing |
| **P4** | Backfill historical seasons | Post-MVP |

---

## 10. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Fast-F1 API source berubah | High | Multiple data source (OpenF1 API sebagai fallback) |
| Data telemetry sangat besar | Medium | TimescaleDB compression, batch insert, pagination API |
| F1 jadwal tidak konsisten (sprint weekend) | Medium | Mapping session type yang flexible |
| VPS storage terbatas | Low | Data pruning untuk session > 1 tahun, archive ke cold storage |

---

## 11. Glossary

| Term | Definition |
|---|---|
| **Sector** | Pembagian 3 bagian dari sirkuit, masing-masing diukur waktu tempuhnya |
| **Compound** | Jenis ban: Soft (merah), Medium (kuning), Hard (putih), Intermediate (hijau), Wet (biru) |
| **Stint** | Periode balapan dari pit stop ke pit stop berikutnya |
| **Undercut** | Strategi pit stop lebih awal untuk memanfaatkan tyre fresh |
| **DRS** | Drag Reduction System — sayap belakang terbuka untuk mengurangi drag |
| **Telemetry** | Data real-time dari mobil: speed, throttle, brake, RPM, gear, DRS |
| **Session Type** | Practice, Qualifying, Race, Sprint Qualifying, Sprint |

---

## 12. References

- [Fast-F1 Documentation](https://docs.fastf1.dev/)
- [OpenF1 API](https://openf1.org/)
- [jolpica-f1 (Ergast replacement)](https://api.jolpi.ca/ergast/f1/)
- [GP Tempo](https://www.gp-tempo.com/) — Existing web app reference
- [Armchair Strategist](https://armchair-strategist.dev/) — Strategy dashboard reference
