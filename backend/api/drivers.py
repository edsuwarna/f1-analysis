"""
Drivers API — Driver info, season stats, race results, headshots.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from backend.core.database import get_db
from backend.api.teams import HEADSHOT_2026

router = APIRouter()

# Points tables (matching championship endpoint)
RACE_POINTS = {1: 25, 2: 18, 3: 15, 4: 12, 5: 10,
               6: 8, 7: 6, 8: 4, 9: 2, 10: 1}
SPRINT_POINTS = {1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1}


@router.get("/drivers")
async def get_drivers(
    year: int = Query(2026),
    db: AsyncSession = Depends(get_db),
):
    """Get all drivers for a season with detailed info, headshots, and statistics."""

    # ── 1. Get all drivers that participated in the season ──
    driver_query = text("""
        SELECT DISTINCT ON (sd.driver_number)
            sd.driver_number,
            sd.full_name,
            sd.name_acronym,
            sd.team_name,
            sd.team_colour,
            sd.country_code,
            sd.headshot_url
        FROM session_drivers sd
        JOIN sessions s ON s.id = sd.session_id
        JOIN meetings m ON m.id = s.meeting_id
        WHERE m.year = :year
          AND EXISTS (
            SELECT 1 FROM laps l
            JOIN sessions s2 ON s2.id = l.session_id
            WHERE l.driver_number = sd.driver_number
              AND (s2.session_type = 'Qualifying' OR s2.session_name = 'Race')
              AND s2.meeting_id IN (SELECT id FROM meetings WHERE year = :year)
          )
        ORDER BY sd.driver_number, s.date_start DESC
    """)
    drv_result = await db.execute(driver_query, {"year": year})
    drivers_raw = drv_result.fetchall()

    if not drivers_raw:
        return {
            "year": year,
            "total_drivers": 0,
            "drivers": [],
        }

    # ── 2. Get all race/sprint finish positions per driver per round ──
    results_query = text("""
        WITH race_sessions AS (
            SELECT id, meeting_id, session_name, date_start
            FROM sessions
            WHERE session_name IN ('Race', 'Sprint')
              AND meeting_id IN (SELECT id FROM meetings WHERE year = :year)
        ),
        round_order AS (
            SELECT DISTINCT m.id AS meeting_id, m.name AS race_name, m.date_start
            FROM meetings m WHERE m.year = :year
            ORDER BY m.date_start
        ),
        finish_positions AS (
            SELECT DISTINCT ON (s.meeting_id, s.session_name, l.driver_number)
                s.meeting_id,
                s.session_name,
                l.driver_number,
                l.position,
                l.lap_duration IS NOT NULL AND l.lap_duration > 10 AS finished
            FROM laps l
            JOIN race_sessions s ON s.id = l.session_id
            WHERE l.position IS NOT NULL AND l.position > 0
              AND l.lap_number > 0
            ORDER BY s.meeting_id, s.session_name, l.driver_number, l.lap_number DESC
        )
        SELECT
            ro.meeting_id,
            ro.race_name,
            fp.session_name,
            fp.driver_number,
            fp.position,
            fp.finished
        FROM round_order ro
        JOIN finish_positions fp ON fp.meeting_id = ro.meeting_id
        ORDER BY ro.date_start, ro.meeting_id, fp.driver_number
    """)
    res_result = await db.execute(results_query, {"year": year})
    results_rows = res_result.fetchall()

    # ── 3. Build driver map and results per driver ──
    from collections import defaultdict

    # Map driver_number -> driver info
    driver_map = {}
    for d in drivers_raw:
        hs_url = HEADSHOT_2026.get(d.driver_number) or (d.headshot_url or "")
        driver_map[d.driver_number] = {
            "driver_number": d.driver_number,
            "full_name": d.full_name or f"Driver #{d.driver_number}",
            "name_acronym": d.name_acronym or f"#{d.driver_number}",
            "team_name": d.team_name or "Unknown",
            "team_colour": d.team_colour or "",
            "headshot_url": hs_url,
            "country_code": (d.country_code or "").upper(),
        }

    # Group results by driver_number
    driver_results = defaultdict(list)
    for r in results_rows:
        dn = r.driver_number
        pts = 0
        if r.session_name == "Sprint":
            pts = SPRINT_POINTS.get(r.position, 0)
        else:
            pts = RACE_POINTS.get(r.position, 0)

        driver_results[dn].append({
            "meeting_id": r.meeting_id,
            "race_name": r.race_name,
            "session_name": r.session_name,
            "position": r.position,
            "points": pts,
            "dnf": not r.finished,
        })

    # ── 4. Compute season statistics per driver ──
    drivers_output = []
    for dn, info in driver_map.items():
        results = driver_results.get(dn, [])

        # Separate Race and Sprint results
        race_results = [r for r in results if r["session_name"] == "Race"]
        sprint_results = [r for r in results if r["session_name"] == "Sprint"]

        # Points: sum across all Race + Sprint sessions
        points = sum(r["points"] for r in results)

        # Wins: position=1 in Race sessions
        wins = sum(1 for r in race_results if r["position"] == 1)

        # Podiums: position in [1,2,3] in Race sessions
        podiums = sum(1 for r in race_results if r["position"] in (1, 2, 3))

        # Races completed (non-DNF Race finishes)
        races_completed = len(race_results)
        dnf_count = sum(1 for r in race_results if r["dnf"])

        # Average finish position (Race only, excluding DNFs for avg calculation)
        valid_race_positions = [r["position"] for r in race_results if r["position"] and r["position"] > 0 and not r["dnf"]]
        avg_finish = round(sum(valid_race_positions) / len(valid_race_positions), 1) if valid_race_positions else None

        drivers_output.append({
            "driver_number": dn,
            "full_name": info["full_name"],
            "name_acronym": info["name_acronym"],
            "team_name": info["team_name"],
            "team_colour": info["team_colour"],
            "headshot_url": info["headshot_url"],
            "country_code": info["country_code"],
            "points": points,
            "wins": wins,
            "podiums": podiums,
            "races_completed": races_completed,
            "avg_finish": avg_finish,
            "dnf_count": dnf_count,
            "results": results,
        })

    # Sort by championship points descending (same as championship endpoint)
    drivers_output.sort(key=lambda d: (-d["points"], d["avg_finish"] or 99))

    return {
        "year": year,
        "total_drivers": len(drivers_output),
        "drivers": drivers_output,
    }
