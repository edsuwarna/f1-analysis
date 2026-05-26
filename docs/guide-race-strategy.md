# ⛽ Pit Strategy & Tyre Analysis

Three interconnected sections that together paint the full picture of race strategy.

## 1. Pit Strategy Battle 🏁

Analyses race position over time with undercut/overlay effects.

**What it shows:**
- Position vs lap chart for all drivers
- Pit stop markers on the chart
- Undercut delta calculation
- Stint-by-stint comparison

**How to read:**
```
Position
   1  │ VER ··········· [P] ········ [P] ···
   2  │ NOR ····· [P] ·········· [P] ···
   3  │ LEC ··· [P] ·········· [P] ···
      └───────────────────────────────────
        Lap 1               Lap 58
        [P] = Pit Stop
```

- A driver pitting earlier leaps ahead temporarily with fresh tyres
- The **net position effect** shows whether the undercut actually worked
- Compare out-lap times to spot successful vs failed undercuts

**Key metric:** **Undercut delta** = time difference when driver A pits and driver B stays out. A positive delta means the undercut worked.

## 2. Tyre Strategy Timeline 🛞

Visual timeline of every driver's tyre stints.

```
Driver  │████████████░░░░░░░░░░██████████
        │   Soft          Medium     Hard
Driver  │████████████████████████████████
        │        Medium (entire race)
```

**Colour coding:**
- 🟡 **Soft** (Red)
- 🟠 **Medium** (Yellow)
- ⚪ **Hard** (White)
- 🟢 **Intermediate** (Green)
- 🔵 **Wet** (Blue)

**What to look for:**
- **Split strategies** between teammates — one on Soft, one on Medium
- **Long middle stint** on Hards = one-stop gamble
- **Multiple short stints** = aggressive, multi-stop strategy
- **Late-race compound** tells you the team's final gamble

## 3. Pit Stop Analysis ⛽

Every pit stop in detail: lap, driver, compound change, time lost.

**What to look for:**
- ⚡ **<2.5 seconds** = excellent crew
- ⏳ **>3.5 seconds** = slow stop, probably lost position
- 🔄 **Double-stack** = both team cars pit same lap (crew under pressure)
- 📊 **Crew consistency** — same crew doing 2.4s every time vs alternating 2.0s and 4.0s

## Data Sources

```
GET /api/sessions/{id}/pit-stops
GET /api/sessions/{id}/stints
GET /api/analytics/sessions/{id}/pit-strategy
GET /api/analytics/tyre-strategy?meeting_id=N
```
