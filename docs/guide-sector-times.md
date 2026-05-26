# 🏆 Best Sector Times

Shows each driver's fastest time in Sector 1, Sector 2, and Sector 3, plus their **theoretical best lap** (sum of all three best sectors).

## How to Read

```
┌─────────┬──────────┬──────────┬──────────┬──────────┐
│ Driver  │  S1      │  S2      │  S3      │ Best Lap │
├─────────┼──────────┼──────────┼──────────┼──────────┤
│ VER  🟢 │ 29.452  │ 33.891  │ 24.123  │ 1:27.466 │
│ NOR  🟢 │ 29.501  │ 33.945  │ 24.201  │ 1:27.647 │
│ LEC     │ 29.523  │ 34.012  │ 24.189  │ 1:27.724 │
│ PIA     │ 29.611  │ 34.108  │ 24.256  │ 1:27.975 │
└─────────┴──────────┴──────────┴──────────┴──────────┘
```

- 🟢 **Green highlight** = Top 3 in that sector
- **Darker cell** = faster time within the top 3
- **Theoretical Best Lap** = S1 + S2 + S3 (what they *could* do)

## What to Look For

- 🟢 **Triple green** = a driver topping all 3 sectors is on for pole
- 📈 **Big S3 advantage** = strong on straights / DRS effect
- 🔄 **S1 specialist** = strong in twisty sections (high downforce)
- 💡 **Theoretical best** vs **actual best lap** — a big gap means the driver didn't put it all together in one lap
- 📊 **Sector trends by session** — compare FP1→FP2→FP3 to see who's improving setup

## Technical Implementation

This section is the first to load when opening a session. Sector data is fetched from:

```
GET /api/sessions/{id}/sectors
```

Returns: best S1, S2, S3 times per driver, colour-coded client-side based on ranking.

## Edge Cases

- **Wet sessions** — sector times are slower but the ranking still shows relative pace
- **Short sessions** (FP1) — fewer laps but sector data still captures representative times
- **Red flags** — the best sectors still stand, just fewer data points
