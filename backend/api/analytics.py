"""
Analytics API — Aggregated insights and cross-race analysis.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from backend.core.database import get_db
from backend.models.models import Session, SessionDriver, Lap, PitStop

router = APIRouter()


@router.get("/sectors")
async def sector_trends(
    year: int = Query(2025),
    session_type: str = Query("Race"),
    db: AsyncSession = Depends(get_db),
):
    """Best sector times aggregated across races in a season."""
    query = text("""
        SELECT
            m.name AS race_name,
            m.id AS meeting_id,
            s.session_name,
            l.driver_number,
            sd.full_name,
            sd.name_acronym,
            sd.team_name,
            MIN(l.duration_sector_1) FILTER (WHERE l.duration_sector_1 > 0) AS best_s1,
            MIN(l.duration_sector_2) FILTER (WHERE l.duration_sector_2 > 0) AS best_s2,
            MIN(l.duration_sector_3) FILTER (WHERE l.duration_sector_3 > 0) AS best_s3,
            MIN(l.lap_duration) FILTER (WHERE l.lap_duration > 0) AS best_lap
        FROM laps l
        JOIN sessions s ON s.id = l.session_id
        JOIN meetings m ON m.id = s.meeting_id
        LEFT JOIN session_drivers sd ON sd.session_id = s.id AND sd.driver_number = l.driver_number
        WHERE m.year = :year
          AND s.session_type = :session_type
          AND l.duration_sector_1 IS NOT NULL AND l.duration_sector_1 > 0
        GROUP BY m.name, m.id, s.session_name, l.driver_number, sd.full_name, sd.name_acronym, sd.team_name
        ORDER BY m.date_start, best_lap NULLS LAST
    """)
    result = await db.execute(query, {"year": year, "session_type": session_type})
    rows = result.fetchall()
    return [
        {
            "race_name": r[0],
            "meeting_id": r[1],
            "session_name": r[2],
            "driver_number": r[3],
            "full_name": r[4],
            "acronym": r[5],
            "team": r[6],
            "best_sector_1": r[7],
            "best_sector_2": r[8],
            "best_sector_3": r[9],
            "best_lap": r[10],
        }
        for r in rows
    ]


@router.get("/driver-progress/{driver_number}")
async def driver_season_progress(
    driver_number: int,
    year: int = Query(2025),
    db: AsyncSession = Depends(get_db),
):
    """Track a driver's performance across a season."""
    query = text("""
        SELECT
            m.name AS race_name,
            m.date_start,
            s.session_type,
            MIN(l.lap_duration) FILTER (WHERE l.lap_duration > 0) AS best_lap,
            MIN(l.duration_sector_1) FILTER (WHERE l.duration_sector_1 > 0) AS best_s1,
            MIN(l.duration_sector_2) FILTER (WHERE l.duration_sector_2 > 0) AS best_s2,
            MIN(l.duration_sector_3) FILTER (WHERE l.duration_sector_3 > 0) AS best_s3,
            COUNT(*) FILTER (WHERE l.is_valid) AS valid_laps
        FROM laps l
        JOIN sessions s ON s.id = l.session_id
        JOIN meetings m ON m.id = s.meeting_id
        WHERE l.driver_number = :driver
          AND m.year = :year
          AND l.lap_duration > 0
        GROUP BY m.name, m.date_start, s.session_type
        ORDER BY m.date_start, s.date_start
    """)
    result = await db.execute(query, {"driver": driver_number, "year": year})
    rows = result.fetchall()
    return [
        {
            "race_name": r[0],
            "date": str(r[1]) if r[1] else None,
            "session_type": r[2],
            "best_lap": r[3],
            "best_sector_1": r[4],
            "best_sector_2": r[5],
            "best_sector_3": r[6],
            "valid_laps": r[7],
        }
        for r in rows
    ]


@router.get("/championship")
async def championship_standings(
    year: int = Query(2025),
    db: AsyncSession = Depends(get_db),
):
    """Driver & Constructor championship standings for a season.

    Computes points for Race (25-18-15-12-10-8-6-4-2-1) and
    Sprint (8-7-6-5-4-3-2-1) sessions based on final lap positions.
    """
    # Points tables
    RACE_POINTS = {1: 25, 2: 18, 3: 15, 4: 12, 5: 10,
                   6: 8, 7: 6, 8: 4, 9: 2, 10: 1}
    SPRINT_POINTS = {1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1}

    query = text("""
        SELECT
            m.id AS meeting_id,
            m.name AS race_name,
            m.date_start,
            s.id AS session_id,
            s.session_type,
            s.session_name,
            l.driver_number,
            l.position,
            sd.full_name,
            sd.name_acronym,
            sd.team_name,
            sd.team_colour
        FROM meetings m
        JOIN sessions s ON s.meeting_id = m.id
        JOIN laps l ON l.session_id = s.id
        LEFT JOIN session_drivers sd
            ON sd.session_id = s.id AND sd.driver_number = l.driver_number
        WHERE m.year = :year
          AND s.session_name IN ('Race', 'Sprint')
          AND l.position IS NOT NULL AND l.position > 0
          AND l.position <= 20
          AND l.lap_number = (
              SELECT MAX(l2.lap_number)
              FROM laps l2
              WHERE l2.session_id = l.session_id
                AND l2.driver_number = l.driver_number
          )
        ORDER BY m.date_start, l.position
    """)
    result = await db.execute(query, {"year": year})
    rows = result.fetchall()

    if not rows:
        return {"driver_standings": [], "constructor_standings": [], "races": []}

    from collections import defaultdict
    driver_points = defaultdict(int)
    constructor_points = defaultdict(int)
    driver_details = {}
    race_list = []
    race_results = defaultdict(list)

    for r in rows:
        pos = r.position
        session_type = r.session_type
        session_name = r.session_name
        driver_num = r.driver_number
        team = r.team_name or "Unknown"
        team_colour = r.team_colour or ""

        # Determine points
        pts = 0
        if session_name == "Sprint":
            pts = SPRINT_POINTS.get(pos, 0)
        elif session_type == "Race" or session_name == "Race":
            pts = RACE_POINTS.get(pos, 0)

        driver_points[driver_num] += pts
        constructor_points[team] += pts

        if driver_num not in driver_details:
            driver_details[driver_num] = {
                "full_name": r.full_name or f"Driver #{driver_num}",
                "acronym": r.name_acronym or f"#{driver_num}",
                "team_name": team,
                "team_colour": team_colour,
            }

        race_results[(r.race_name, r.meeting_id)].append({
            "driver_number": driver_num,
            "position": pos,
            "points": pts,
            "acronym": r.name_acronym or f"#{driver_num}",
            "team_colour": team_colour,
            "session_name": session_name,
        })

    # Build race list
    for (rname, mid), results in sorted(race_results.items()):
        results.sort(key=lambda x: x["position"])
        race_list.append({
            "meeting_id": mid,
            "race_name": rname,
            "results": results,
        })

    # Driver standings
    driver_standings = [
        {
            "position": i + 1,
            "driver_number": dn,
            "full_name": info["full_name"],
            "acronym": info["acronym"],
            "team_name": info["team_name"],
            "team_colour": info["team_colour"],
            "points": pts,
        }
        for i, (dn, pts) in enumerate(
            sorted(driver_points.items(), key=lambda x: -x[1])
        )
        for info in [driver_details[dn]]
    ]

    # Constructor standings
    constructor_standings = [
        {
            "position": i + 1,
            "team_name": team,
            "points": pts,
        }
        for i, (team, pts) in enumerate(
            sorted(constructor_points.items(), key=lambda x: -x[1])
        )
    ]

    return {
        "year": year,
        "races_completed": len(race_list),
        "driver_standings": driver_standings,
        "constructor_standings": constructor_standings,
        "races": race_list,
    }


@router.get("/lap-distribution")
async def lap_distribution(
    session_id: int = Query(None, description="Session ID (required)"),
    db: AsyncSession = Depends(get_db),
):
    """Lap time distribution stats per driver for a session.

    Returns per-driver statistics: avg, median, stdDev, min, max,
    plus all individual lap times for charting. Great for consistency analysis.
    """
    if not session_id:
        return {"error": "session_id query param required"}

    # Get all valid laps
    result = await db.execute(
        select(Lap)
        .where(
            Lap.session_id == session_id,
            Lap.lap_duration.isnot(None),
            Lap.lap_duration > 10,
        )
        .order_by(Lap.driver_number, Lap.lap_number)
    )
    laps = result.scalars().all()

    if not laps:
        return {"session_id": session_id, "drivers": []}

    # Fetch driver info
    drv_result = await db.execute(
        select(SessionDriver).where(SessionDriver.session_id == session_id)
    )
    driver_info = {}
    for d in drv_result.scalars().all():
        driver_info[d.driver_number] = {
            "acronym": d.name_acronym,
            "full_name": d.full_name,
            "team_name": d.team_name,
            "team_colour": d.team_colour,
        }

    from collections import defaultdict
    import math

    by_driver = defaultdict(list)
    for l in laps:
        by_driver[l.driver_number].append(l.lap_duration)

    drivers_data = []
    for dn, times in by_driver.items():
        times.sort()
        n = len(times)
        avg = sum(times) / n
        # Median
        mid = n // 2
        median = times[mid] if n % 2 else (times[mid - 1] + times[mid]) / 2
        # Std dev
        variance = sum((t - avg) ** 2 for t in times) / n
        std_dev = math.sqrt(variance)
        # Min/Max
        lap_min = times[0]
        lap_max = times[-1]
        # Consistency score: lower std_dev / median = more consistent
        consistency = round((1 - (std_dev / median)) * 100, 1) if median > 0 else 0

        info = driver_info.get(dn, {})
        drivers_data.append({
            "driver_number": dn,
            "acronym": info.get("acronym", f"#{dn}"),
            "full_name": info.get("full_name", ""),
            "team_name": info.get("team_name", "Unknown"),
            "team_colour": info.get("team_colour", ""),
            "total_laps": n,
            "avg_lap_time": round(avg, 3),
            "median_lap_time": round(median, 3),
            "std_dev": round(std_dev, 3),
            "fastest_lap": round(lap_min, 3),
            "slowest_lap": round(lap_max, 3),
            "range": round(lap_max - lap_min, 3),
            "consistency": consistency,
            "lap_times": [round(t, 3) for t in times],
        })

    # Sort by best lap
    drivers_data.sort(key=lambda x: x["fastest_lap"])

    # Determine session info
    sess_result = await db.execute(select(Session).where(Session.id == session_id))
    sess = sess_result.scalar_one_or_none()

    return {
        "session_id": session_id,
        "session_name": sess.session_name if sess else None,
        "session_type": sess.session_type if sess else None,
        "total_drivers": len(drivers_data),
        "total_laps": sum(d["total_laps"] for d in drivers_data),
        "drivers": drivers_data,
    }


@router.get("/sessions/{session_id}/pit-strategy")
async def get_pit_strategy(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Pit strategy analysis — undercut deltas, pit stop impact, stint comparison.

    Returns per-driver pit analysis including lap times before/after each
    pit stop, net undercut gain, and cross-driver undercut windows.
    """
    # Get all pit stops
    result = await db.execute(
        select(PitStop).where(PitStop.session_id == session_id)
        .order_by(PitStop.driver_number, PitStop.lap_number)
    )
    pits = result.scalars().all()

    if not pits:
        return {"session_id": session_id, "drivers": []}

    # Get all laps
    result = await db.execute(
        select(Lap).where(
            Lap.session_id == session_id,
            Lap.lap_duration.isnot(None),
            Lap.lap_duration > 0,
        ).order_by(Lap.driver_number, Lap.lap_number)
    )
    laps = result.scalars().all()

    # Group laps by driver
    from collections import defaultdict
    laps_by_driver = defaultdict(list)
    for l in laps:
        laps_by_driver[l.driver_number].append(l)

    # Get driver info
    drv_result = await db.execute(
        select(SessionDriver).where(SessionDriver.session_id == session_id)
    )
    driver_info = {}
    for d in drv_result.scalars().all():
        driver_info[d.driver_number] = {
            "acronym": d.name_acronym,
            "full_name": d.full_name,
            "team_name": d.team_name,
            "team_colour": d.team_colour,
        }

    # Group pits by driver
    pits_by_driver = defaultdict(list)
    for p in pits:
        pits_by_driver[p.driver_number].append(p)

    drivers_data = []
    for dn, stops in pits_by_driver.items():
        driver_laps = laps_by_driver.get(dn, [])
        if not driver_laps:
            continue

        info = driver_info.get(dn, {})
        pit_analysis = []

        for p in stops:
            ln = p.lap_number
            # Find in-lap and out-lap
            in_lap = next((l for l in driver_laps if l.lap_number == ln), None)
            out_lap = next((l for l in driver_laps if l.lap_number == ln + 1), None)
            prev_lap = next((l for l in driver_laps if l.lap_number == ln - 1), None)

            # Average of 3 laps before (excluding in-lap)
            laps_before = [l for l in driver_laps if l.lap_number < ln and l.lap_duration and l.lap_duration < 600]
            laps_before = sorted(laps_before, key=lambda x: x.lap_number, reverse=True)[:3]
            avg_before = sum(l.lap_duration for l in laps_before) / len(laps_before) if laps_before else None

            # Average of 3 laps after pit (excluding out-lap)
            laps_after = [l for l in driver_laps if l.lap_number > ln + 1 and l.lap_duration and l.lap_duration < 600]
            laps_after = sorted(laps_after, key=lambda x: x.lap_number)[:3]
            avg_after = sum(l.lap_duration for l in laps_after) / len(laps_after) if laps_after else None

            pit_analysis.append({
                "lap_number": ln,
                "pit_duration": round(p.pit_duration, 1) if p.pit_duration else None,
                "in_lap_time": round(in_lap.lap_duration, 3) if in_lap and in_lap.lap_duration else None,
                "out_lap_time": round(out_lap.lap_duration, 3) if out_lap and out_lap.lap_duration else None,
                "prev_lap_time": round(prev_lap.lap_duration, 3) if prev_lap and prev_lap.lap_duration else None,
                "avg_before": round(avg_before, 3) if avg_before else None,
                "avg_after": round(avg_after, 3) if avg_after else None,
                "time_lost_in_pit": round(p.pit_duration - (prev_lap.lap_duration or p.pit_duration), 1) if p.pit_duration and prev_lap and prev_lap.lap_duration else None,
            })

        drivers_data.append({
            "driver_number": dn,
            "acronym": info.get("acronym", f"#{dn}"),
            "full_name": info.get("full_name", ""),
            "team_name": info.get("team_name", ""),
            "team_colour": info.get("team_colour", ""),
            "total_stops": len(stops),
            "pit_analysis": pit_analysis,
        })

    return {
        "session_id": session_id,
        "total_stops": len(pits),
        "drivers": drivers_data,
    }


@router.get("/tyre-strategy")
async def tyre_strategy_summary(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Tyre strategy summary across all drivers in a race."""
    query = text("""
        SELECT
            st.driver_number,
            sd.full_name,
            sd.name_acronym,
            sd.team_name,
            sd.team_colour,
            st.stint_number,
            st.compound,
            st.lap_start,
            st.lap_end,
            st.total_laps,
            st.tyre_age_at_start
        FROM stints st
        JOIN sessions s ON s.id = st.session_id
        LEFT JOIN session_drivers sd ON sd.session_id = s.id AND sd.driver_number = st.driver_number
        WHERE s.meeting_id = :mid AND s.session_type = 'Race'
        ORDER BY st.driver_number, st.stint_number
    """)
    result = await db.execute(query, {"mid": meeting_id})
    rows = result.fetchall()

    # Group by driver
    from collections import defaultdict
    strategies = defaultdict(list)
    for r in rows:
        strategies[r[0]].append({
            "stint_number": r[5],
            "compound": r[6],
            "lap_start": r[7],
            "lap_end": r[8],
            "total_laps": r[9],
            "tyre_age_at_start": r[10],
        })

    return [
        {
            "driver_number": dn,
            "full_name": rows[0][1] if rows else None,
            "acronym": rows[0][2] if rows else None,
            "team": rows[0][3] if rows else None,
            "team_colour": rows[0][4] if rows else None,
            "stints": stints,
        }
        for dn, stints in strategies.items()
        for rows in [strategies[dn]]
    ]
