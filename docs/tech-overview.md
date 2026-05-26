# ⚙️ Project Overview

## Background

As a hardcore F1 fan, watching races feels incomplete without the numbers behind every overtake, pit stop undercut, and tyre strategy call. I kept asking questions broadcast timing couldn't answer:

- *"Who's actually fastest in Sector 3, or is it just DRS?"*
- *"Did McLaren's pace drop on the Medium compound?"*
- *"How did Verstappen's trajectory compare to Norris lap by lap?"*
- *"Did Hamilton's 2.5s pit stop cost him the undercut?"*

The data exists — OpenF1 provides incredible free telemetry — but there was no single platform that:
1. **Unifies** telemetry, laps, tyres, weather, and pit stops in one place
2. **Enables flexible queries** for technical analysis
3. **Compares drivers** side by side per session
4. **Tracks history** across multiple races

Existing solutions (GP Tempo, Armchair Strategist) are read-only with limited comparison features. So I built my own.

## Core Problem Solved

F1 Analysis ingests OpenF1's raw API data into a structured PostgreSQL database, exposes it through a clean REST API, and visualises it in a mobile-friendly dashboard. Any F1 fan with a Docker host can run their own instance.

## Project Goals

1. **Data Ownership** — Own our F1 database, queryable anytime without API dependencies
2. **Sector Analysis** — Fastest per-sector per-session
3. **Driver Comparison** — Head-to-head with telemetry overlay
4. **Tyre & Pit Strategy** — Visualise stint, compound, and pit impact
5. **Session Reports** — Full data for FP1, Qualifying, Sprint, Race
6. **Historical Trending** — Compare performance across races in a season

## Status

**Live:** [f1-analysis.edsuwarna.id](https://f1-analysis.edsuwarna.id)
**Source:** [github.com/edsuwarna/f1-analysis](https://github.com/edsuwarna/f1-analysis)

## Next

- 🔧 **[Tech Stack](docs.html?page=tech-stack)** — what powers the platform
- 🏗️ **[Architecture](docs.html?page=tech-architecture)** — how it all fits together
