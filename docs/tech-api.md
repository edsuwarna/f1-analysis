# 📡 API Reference

Full REST API reference. All endpoints return JSON.

## Base URL

Development: `http://localhost:8000`
Production: `https://f1-analysis.edsuwarna.id`

Interactive API docs at `/docs` (Swagger UI) when the backend is running.

---

## Meetings

### List Meetings

```
GET /api/meetings?year=2026
```

Returns all race weekends, optionally filtered by year.

**Response:**
```json
[
  {
    "meeting_key": 1234,
    "meeting_name": "Monaco Grand Prix",
    "country_name": "Monaco",
    "meeting_official_name": "Formula 1 Grand Prix de Monaco 2026",
    "location": "Monte Carlo",
    "year": 2026,
    "date_start": "2026-05-24T10:00:00Z"
  }
]
```

### Get Meeting

```
GET /api/meetings/{id}
```

### List Sessions

```
GET /api/meetings/{id}/sessions
```

Returns sessions in a meeting (FP1, FP2, FP3, Qualifying, Sprint, Race).

---

## Sessions

### Session Details

```
GET /api/sessions/{id}
```

### Drivers in Session

```
GET /api/sessions/{id}/drivers
```

Returns driver list with team colours and numbers.

### Lap Data

```
GET /api/sessions/{id}/laps
```

Lab times with sectors, compound, tyre age, position.

**Query params:** `?driver_number=N` (optional filter)

### Sector Times

```
GET /api/sessions/{id}/sectors
```

Best S1/S2/S3 and theoretical best lap for each driver.

### Stints

```
GET /api/sessions/{id}/stints
```

Tyre stint information per driver.

### Pit Stops

```
GET /api/sessions/{id}/pit-stops
```

Pit stop events: lap, compound change, time lost.

### Gap Timeline

```
GET /api/sessions/{id}/gaps
```

Cumulative gap to leader per lap. Use reference driver option for relative comparison.

### Position History

```
GET /api/sessions/{id}/positions
```

Lap-by-lap race positions for all drivers.

### Qualifying Evolution

```
GET /api/sessions/{id}/qualifying-evolution
```

Auto-segmented Q1→Q2→Q3 lap progression per driver.

### Telemetry

```
GET /api/sessions/{id}/telemetry/{driver}
```

Car telemetry: speed, throttle, brake, DRS, RPM, gear.

**Example:** `/api/sessions/5678/telemetry/1` (Verstappen telemetry)

### Driver Comparison

```
GET /api/sessions/{id}/compare/{d1}/{d2}
```

Head-to-head: fastest lap, avg pace, sectors, top speed.

**Example:** `/api/sessions/5678/compare/1/4` (VER vs NOR)

### Weather

```
GET /api/sessions/{id}/weather
```

Weather timeline: air temp, track temp, humidity, pressure, wind, rainfall.

---

## Analytics

### Season Sector Trends

```
GET /api/analytics/sectors?year=2026
```

Driver sector performance across the season.

### Driver Progress

```
GET /api/analytics/driver-progress/{num}?year=2026
```

Single driver's performance across all races.

**Example:** `/api/analytics/driver-progress/1?year=2026`

### Championship Standings

```
GET /api/analytics/championship?year=2026
```

Driver & Constructor standings with per-GP race results and points progression.

### Lap Distribution

```
GET /api/analytics/lap-distribution?session_id=N
```

Per-driver stats: avg, median, stddev, consistency, IQR.

### Pit Strategy

```
GET /api/analytics/sessions/{id}/pit-strategy
```

Undercut delta analysis, net position effect per pit stop.

### Tyre Strategy

```
GET /api/analytics/tyre-strategy?meeting_id=N
```

Compound usage summary across all sessions in a meeting.

### Qualifying Summary

```
GET /api/analytics/qualifying-summary?meeting_id=N
```

Auto-segmented Q1→Q2→Q3 best lap progression.

---

## Rate Limiting

No rate limiting on the API. The underlying OpenF1 data is cached in PostgreSQL, so repeated queries hit the database, not the external API.

## Authentication

No authentication required for read endpoints. The API is served through Cloudflare Tunnel which adds basic security (origin IP hidden, DDoS protection).

For write/admin operations (future), authentication would be required.
