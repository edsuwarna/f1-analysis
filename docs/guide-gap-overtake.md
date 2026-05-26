# 📊 Gaps & Overtakes

Two sections that reveal the dynamics of wheel-to-wheel racing.

## Gap Timeline

**What it shows:** Cumulative gap to the race leader (or a reference driver) lap by lap.

### Chart View

```
Gap to Leader (s)
 15 │                NOR
 12 │              ↗
  9 │            ↗
  6 │          ↗
  3 │   VER     [P]
  0 │ ────────────────────────────
   │   LAP 1              LAP 58
   [P] = pit stop event
```

- The **0 line** = the leader
- **Rising line** = driver losing time to leader
- **Flat/falling line** = matching or gaining on the leader
- **Sharp jump at pit stop** = time lost in pit lane (normal)
- **Diverging after pit stop** = undercut success (pitting driver gains on the one who stayed out)

### Controls

- ✅ Check/uncheck drivers to focus on specific battles
- 📌 **Reference driver dropdown** — change from "Leader" to any driver to see gaps relative to them
- Click **"Plot Gaps"** to apply selections

## Overtake Analysis

**What it shows:** Every position change, lap by lap.

### Table

| Driver | Gains | Losses | Net | Avg Change/Lap |
|---|---|---|---|---|
| HAM | 5 | 1 | +4 | 0.8 |
| PIA | 3 | 2 | +1 | 0.2 |
| VER | 0 | 0 | 0 | 0 |

### Chart

- 🟢 **Green bars** = positions gained
- 🔴 **Red bars** = positions lost
- Taller bars = more action that lap

### What to Look For

- **High gain + low loss** = clean aggressive driver
- **High loss** = car issues, or being vulnerable on straights
- **Zero net** = could mean P1 start and staying there, or lots of swapping
- **Lap 1 spike** = most overtakes happen on the first lap
- **Mid-race cluster** = pit stop window, traffic, or safety car restart

## Data Sources

```
GET /api/sessions/{id}/gaps
GET /api/sessions/{id}/positions
GET /api/sessions/{id}/overtakes
```
