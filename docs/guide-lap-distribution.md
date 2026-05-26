# 📈 Lap Distribution

Analyses each driver's lap time consistency and pace using scatter plots per driver.

## How to Read

### Per-Driver Card

```
┌────────────────────────────────────┐
│  🇬🇧 L. NORRIS  (#4)  🟠 MCLAREN  │
│  Avg Pace: 1:34.221                │
│  Interval: +0.123                  │
│  [▁▂▃▄▅▆▇██▇▆▅▄▃▂▁]               │
│  ┌──────────────────────────────┐  │
│  │   Lap Time Distribution      │  │
│  │   ·· ·    ··                 │  │
│  │   ···· ··· ····              │  │
│  │   ······ ···· ··             │  │
│  │   ·· ··   ··                 │  │
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

- **Avg Pace** — mean lap time across all clean laps
- **Interval** — gap to the fastest average pace in the session
- **Sparkline** — visual distribution density

## What to Look For

- 🎯 **Tight cluster** = consistent driver/car combination
- 📏 **Wide spread** = inconsistency, maybe car balance issues
- ⬆️ **Outliers above** = traffic, mistakes, yellow flags
- ⬇️ **Outliers below** = might be a tow-assisted lap
- 🤝 **Teammate comparison** — who's closer to the team's average?

## Technical Details

Lap distribution data comes from:

```
GET /api/analytics/lap-distribution?session_id=N
```

Returns: per-driver statistics including count, avg, median, stddev, min, max, Q1, Q3, and interval.

Outlier detection uses the **IQR method** (1.5 × IQR above Q3 or below Q1). Pit in/out laps and laps with yellow flags are excluded unless they're the only data available.
