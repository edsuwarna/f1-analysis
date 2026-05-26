# ⏱️ Qualifying Evolution

Tracks each driver's lap time progression across all qualifying runs (Q1, Q2, Q3).

## How to Read

### Chart
The line chart shows each driver's lap times in order. A **downward slope** = improvement, **flat/upward** = plateau or decline.

### Table
Each qualifying run shows:
- **Lap time**
- **Tyre compound** (Soft/Medium/Hard)
- **Position change** (↑ gained, ↓ lost, = held)
- **Segment** (Q1/Q2/Q3)

```
Q1 ──── Q2 ──── Q3
│               │
│   Best laps   │
│   improve     │
│   each run    │
└───────────────┘
```

## What to Look For

- ⬇️ **Steep downward slopes** = big improvements between runs
- 📉 **Plateau early** = drivers who maximised their car early may not have more pace
- 🔄 **Late improvers** = drivers who save their best for last (common in Q1→Q2)
- 🏁 **Q3 battle** — the final runs usually decide pole, watch for who improves under pressure
- 🛞 **Tyre state** — new Softs vs scrubbed Softs affect the time

## Technical Note

The qualifying evolution is **auto-segmented** from the raw lap data. The system detects Q1/Q2/Q3 boundaries by looking for gaps in lap timing activity and session state changes. This means:

- Works for any session type (Sprint Qualifying too)
- If segmentation is off by a lap, it doesn't affect the underlying data — just the label

## Data Source

```
GET /api/sessions/{id}/qualifying-evolution
```

Returns: ordered list of qualifying laps per driver with segment labels.
