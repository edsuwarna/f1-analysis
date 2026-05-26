# 🔬 Driver Comparison

Head-to-head comparison for any two drivers across an entire session.

## What It Shows

The comparison page lays out a side-by-side battle:

```
┌─────────────────┬─────────┬─────────────────┐
│    VER (#1)     │ METRIC  │   NOR (#4)      │
├─────────────────┼─────────┼─────────────────┤
│    1:27.466     │ Best Lap│    1:27.647     │
│    1:28.310     │ Avg Pace│    1:28.520     │
│    29.452       │ Best S1 │    29.501       │
│    33.891       │ Best S2 │    33.945       │
│    24.123       │ Best S3 │    24.201       │
│     342 km/h    │ Top Spd │    338 km/h     │
│      5          │ Podiums │      3          │
└─────────────────┴─────────┴─────────────────┘
```

## Available Comparisons

For **Qualifying** sessions:
- Best lap time
- Sector 1/2/3 comparison
- Top speed (trap)
- Lap progression across Q1→Q2→Q3

For **Race** sessions:
- All of the above plus:
- Average pace
- Stint length comparison
- Tyre management (lap time vs tyre age)
- Pit stop efficiency

## Telemetry Overlay

For sessions with car data available, you can overlay telemetry from any lap:

- **Speed trace** — where each driver is faster/braking later
- **Throttle/brake** — driving style differences (point-and-shoot vs smooth)
- **DRS usage** — activation zones and speed delta
- **RPM & Gear** — corner exit optimization

### Telemetry Chart
```
Speed
340─┐              ┌───
   │              │NOR
300─┐     ┌───────┘
   │    VER        │
260─┐────┘          └───
   └─────────────────────
     T1     T2     T3
```

## What to Look For

- 👥 **Teammate comparison** — reveals intra-team dynamics
- 🏎️ **Top speed vs sector time** — high top speed but slow sector = low downforce setup
- ⏱️ **Avg pace gap** between teammates is the best measure of driver performance in equal machinery
- 🛞 **Stint length comparison** — who manages tyres better?
- 💡 **Sector advantage** — consistent advantage in one sector shows a pattern

## Data Sources

```
GET /api/sessions/{id}/compare/{d1}/{d2}
GET /api/sessions/{id}/telemetry/{driver}
GET /api/sessions/{id}/laps
```
