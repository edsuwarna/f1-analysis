# 📖 How to Use This App

F1 Analysis is designed for **technical F1 fans** who want to dig deeper than broadcast timing screens. This guide explains the app layout and how to navigate it.

## Overview

The app is a single-page application with three main views:

```
┌────────────────────────────────────────────────────┐
│   🏎️ F1 Analysis    [Session Picker]  [ℹ️ Guide]   │
├────────────────────────────────────────────────────┤
│                                                    │
│   ┌──────────────────────────────────────────────┐ │
│   │           Analysis Section Cards              │ │
│   │   (click to expand, reload per session)       │ │
│   └──────────────────────────────────────────────┘ │
│                                                    │
│   Each section is collapsible — click to expand    │
│   and see full data & charts.                      │
└────────────────────────────────────────────────────┘
```

## Navigation Flow

1. **Home Page** → Select a **year** (e.g., 2026)
2. **Meetings List** → Pick a **Grand Prix** (e.g., Monaco)
3. **Sessions List** → Choose a **session** (FP1, FP2, FP3, Qualifying, Sprint, Race)
4. **Analysis Page** → All 13 analysis sections load automatically

## The 13 Analysis Sections

| # | Section | Best For |
|---|---|---|
| 1 | **Best Sector Times** | Who's fastest in each sector |
| 2 | **Qualifying Evolution** | Lap time progression Q1→Q2→Q3 |
| 3 | **Lap Distribution** | Pace vs consistency analysis |
| 4 | **Position History** | Lap-by-lap race positions |
| 5 | **Pit Strategy Battle** | Undercut analysis & stint comparison |
| 6 | **Tyre Strategy Timeline** | Compound mapping per driver |
| 7 | **Pit Stop Analysis** | Stop times & crew performance |
| 8 | **Weather Impact** | Temperature, humidity, rainfall |
| 9 | **Gap Timeline** | Cumulative gap to leader |
| 10 | **Overtake Analysis** | Position changes per lap |
| 11 | **Tyre Degradation** | Lap time vs tyre age |
| 12 | **Driver Comparison** | Side-by-side any 2 drivers |
| 13 | **Championship Standings** | Season points & per-GP results |

## Tips

- Click any section header to collapse/expand it
- Use the floating **"Jump to Section"** button on mobile for quick navigation
- Checkboxes in Gap Timeline and Position History let you focus on specific drivers
- Data is cached per session — switching sessions reloads automatically
- Dark/light theme is persisted to localStorage

## Next

Read the detailed guides for each section below, or jump straight to the sections that interest you most.
