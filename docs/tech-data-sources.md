# 🗄️ Data Sources & Schema

## Source: OpenF1 API

All data comes from **[OpenF1](https://openf1.org/)**, a free and open-source API providing real-time and historical Formula 1 timing data.

### Key Endpoints Used

| Endpoint | Data | Frequency |
|---|---|---|
| `/v1/meetings` | Race weekend schedule | Per ingestion |
| `/v1/sessions` | Sessions within a meeting | Per ingestion |
| `/v1/laps` | Lap times with sectors, compound, tyre age, position | Per session |
| `/v1/car_data` | Telemetry: speed, throttle, brake, DRS, RPM, gear | Per session (~100ms interval) |
| `/v1/stints` | Tyre stint data | Per session |
| `/v1/pit` | Pit stop events | Per session |
| `/v1/weather` | Air temp, track temp, humidity, rainfall, pressure | Per session (regular updates) |
| `/v1/drivers` | Driver information | Per session |
| `/v1/race_control` | Yellow flags, SC, VSC, red flags | Per session |

**API base URL:** `https://api.openf1.org/v1/`

## Database Schema

10 tables, normalised design mirroring OpenF1's data model.

### Entity Relationship

```
meetings
    │
    ├── sessions
    │   │
    │   ├── session_drivers
    │   │
    │   ├── laps
    │   │
    │   ├── telemetry
    │   │
    │   ├── stints
    │   │
    │   ├── pit_stops
    │   │
    │   ├── weather
    │   │
    │   └── race_control_messages
    │
    └── championship_standings
```

### Table Details

**`meetings`**
| Column | Type | Description |
|---|---|---|
| `meeting_key` | INT PK | OpenF1 meeting ID |
| `meeting_name` | VARCHAR | e.g., "Monaco Grand Prix" |
| `country_name` | VARCHAR | e.g., "Monaco" |
| `meeting_official_name` | VARCHAR | Full official name |
| `location` | VARCHAR | Circuit location |
| `year` | INT | Season year |
| `date_start` | TIMESTAMP | Weekend start |

**`sessions`**
| Column | Type | Description |
|---|---|---|
| `session_key` | INT PK | OpenF1 session ID |
| `meeting_key` | INT FK → meetings | Parent meeting |
| `session_name` | VARCHAR | "Race", "Qualifying", "FP1", etc. |
| `session_type` | VARCHAR | "Race", "Qualifying", "Practice" |
| `date_start` | TIMESTAMP | Session start |
| `date_end` | TIMESTAMP | Session end |
| `gmt_offset` | VARCHAR | Timezone offset |
| `year` | INT | Season year |

**`laps`** (core table, ~60K rows per race weekend)
| Column | Type | Description |
|---|---|---|
| `id` | BIGSERIAL PK | Auto-increment |
| `session_key` | INT FK → sessions | Parent session |
| `driver_number` | INT | Driver number |
| `lap_number` | INT | Lap count |
| `lap_duration` | FLOAT | Total lap time (seconds) |
| `duration_sector_1` | FLOAT | Sector 1 time |
| `duration_sector_2` | FLOAT | Sector 2 time |
| `duration_sector_3` | FLOAT | Sector 3 time |
| `segments_sector_1` | INT[] | Mini-sector flags |
| `segments_sector_2` | INT[] | Mini-sector flags |
| `segments_sector_3` | INT[] | Mini-sector flags |
| `is_pit_out_lap` | BOOL | Pit exit lap |
| `compound` | VARCHAR | "SOFT", "MEDIUM", "HARD", "INTERMEDIATE", "WET" |
| `tyre_age` | INT | Laps on current tyre |
| `position` | INT | Race position |
| `is_stint_start` | BOOL | First lap on new tyre |

**`telemetry`** (largest table, 100K+ rows per session)
| Column | Type | Description |
|---|---|---|
| `id` | BIGSERIAL PK | Auto-increment |
| `session_key` | INT FK | Parent session |
| `driver_number` | INT | Driver number |
| `lap_number` | INT | Lap number |
| `date` | TIMESTAMP | Timestamp |
| `speed` | FLOAT | Speed (km/h) |
| `throttle` | FLOAT | Throttle (0-100%) |
| `brake` | BOOL | Brake on/off |
| `drs` | BOOL | DRS open |
| `rpm` | INT | Engine RPM |
| `gear` | INT | Gear selected |

## Indexes

Key indexes for query performance:

```sql
CREATE INDEX idx_laps_session ON laps(session_key);
CREATE INDEX idx_laps_driver ON laps(session_key, driver_number);
CREATE INDEX idx_telemetry_session ON telemetry(session_key, driver_number, lap_number);
CREATE INDEX idx_stints_session ON stints(session_key, driver_number);
CREATE INDEX idx_pit_stops_session ON pit_stops(session_key);
CREATE INDEX idx_weather_session ON weather(session_key);
```

## Next

- 📥 **[Ingestion Pipeline](docs.html?page=tech-ingestion)** — how data flows from API to database
- 📡 **[API Reference](docs.html?page=tech-api)** — all available endpoints
