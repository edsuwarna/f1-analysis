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

    # Build race list ordered by date (latest first)
    race_order = []  # [(rname, mid), ...] in chronological order
    seen = set()
    for r in rows:
        key = (r.race_name, r.meeting_id)
        if key not in seen:
            seen.add(key)
            race_order.append((key, str(r.date_start) if r.date_start else ""))
    # Sort by date descending (latest first)
    race_order.sort(key=lambda x: x[1], reverse=True)

    for (rname, mid), _ in race_order:
        results = race_results[(rname, mid)]
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


@router.get("/qualifying-summary")
async def qualifying_summary(
    meeting_id: int = Query(..., description="Meeting ID"),
    db: AsyncSession = Depends(get_db),
):
    """Qualifying summary across Q1→Q2→Q3 segments.

    Splits a single qualifying session into Q1/Q2/Q3 segments
    based on driver count per lap number (heuristic: when count
    drops below 20→Q1 ends, below 15→Q2 ends).
    Returns best lap per driver per segment + improvement deltas.
    """
    # Get all qualifying sessions for this meeting (exclude sprint)
    sess_result = await db.execute(
        select(Session)
        .where(
            Session.meeting_id == meeting_id,
            Session.session_type == "Qualifying",
            Session.session_name.not_like("Sprint%"),
        )
        .order_by(Session.date_start)
    )
    sessions = sess_result.scalars().all()

    if not sessions:
        return {"meeting_id": meeting_id, "sessions": [], "drivers": []}

    session_list = [
        {"session_id": s.id, "session_name": s.session_name}
        for s in sessions
    ]

    session_ids = [s.id for s in sessions]

    # Fetch driver info from the first qualifying session
    drv_result = await db.execute(
        select(SessionDriver).where(SessionDriver.session_id == session_ids[0])
    )
    driver_info_map = {}
    for d in drv_result.scalars().all():
        driver_info_map[d.driver_number] = {
            "acronym": d.name_acronym,
            "full_name": d.full_name,
            "team_name": d.team_name,
            "team_colour": d.team_colour,
        }

    from collections import defaultdict

    all_drivers_list = []
    all_laps_by_session = {}

    for ses in sessions:
        sid = ses.id
        # Fetch laps for this session
        lap_result = await db.execute(
            select(Lap).where(
                Lap.session_id == sid,
                Lap.lap_duration.isnot(None),
                Lap.lap_duration > 0,
                Lap.lap_duration < 600,
            )
        )
        session_laps = lap_result.scalars().all()
        all_laps_by_session[sid] = session_laps

        if not session_laps:
            continue

        # Determine Q1/Q2/Q3 boundaries based on driver count per lap
        lap_driver_count = defaultdict(set)
        for l in session_laps:
            lap_driver_count[l.lap_number].add(l.driver_number)

        sorted_laps = sorted(lap_driver_count.keys())

        # Find transition points
        q2_start_lap = None
        q3_start_lap = None

        for ln in sorted_laps:
            cnt = len(lap_driver_count[ln])
            if q2_start_lap is None and cnt <= 15:
                q2_start_lap = ln
            if q3_start_lap is None and cnt <= 10:
                q3_start_lap = ln

        # Define segments
        segments = [
            ("Q1", 1, (q2_start_lap or 999) - 1),
            ("Q2", (q2_start_lap or 999), (q3_start_lap or 999) - 1),
            ("Q3", (q3_start_lap or 999), 9999),
        ]

        # Group laps by driver and segment
        for l in session_laps:
            segment = None
            for seg_name, seg_start, seg_end in segments:
                if seg_start <= l.lap_number <= seg_end:
                    segment = seg_name
                    break
            if segment is None:
                continue

            dn = l.driver_number
            # Store in combined structure
            all_drivers_list.append({
                "driver_number": dn,
                "segment": segment,
                "lap_duration": l.lap_duration,
            })

    # Compute best lap per driver per segment
    driver_segment_best = defaultdict(lambda: defaultdict(list))
    for entry in all_drivers_list:
        driver_segment_best[entry["driver_number"]][entry["segment"]].append(entry["lap_duration"])

    # Standard segment order
    segment_order = ["Q1", "Q2", "Q3"]
    drivers_data = []
    all_drivers_by_final = []

    for dn, segments in driver_segment_best.items():
        info = driver_info_map.get(dn, {})
        best_laps = {}
        prev_best = None
        total_improvement = None
        completed_segments = []

        for seg in segment_order:
            times = segments.get(seg, [])
            if times:
                best = min(times)
                best_laps[seg] = round(best, 3)
                completed_segments.append(seg)
                prev_best = best

        # Total improvement
        if len(completed_segments) >= 2:
            first_best = best_laps.get(completed_segments[0])
            last_best = best_laps.get(completed_segments[-1])
            if first_best and last_best:
                total_improvement = round(last_best - first_best, 3)

        drivers_data.append({
            "driver_number": dn,
            "acronym": info.get("acronym", f"#{dn}"),
            "full_name": info.get("full_name", "Unknown"),
            "team_name": info.get("team_name", "Unknown"),
            "team_colour": info.get("team_colour", ""),
            "best_laps": best_laps,
            "segments_completed": len(completed_segments),
            "total_improvement": total_improvement,
        })

        # For final ranking: use best lap from last completed segment
        if completed_segments:
            final_best = best_laps.get(completed_segments[-1])
            if final_best:
                all_drivers_by_final.append({
                    "driver_number": dn,
                    "acronym": info.get("acronym", f"#{dn}"),
                    "full_name": info.get("full_name", "Unknown"),
                    "team_name": info.get("team_name", "Unknown"),
                    "team_colour": info.get("team_colour", ""),
                    "best_lap": final_best,
                })

    # Sort by final segment best lap
    all_drivers_by_final.sort(key=lambda x: x["best_lap"])
    driver_order = {d["driver_number"]: i for i, d in enumerate(all_drivers_by_final)}
    drivers_data.sort(key=lambda d: driver_order.get(d["driver_number"], 999))

    # Segment availability info
    q2_drivers = sum(1 for d in drivers_data if "Q2" in d["best_laps"])
    q3_drivers = sum(1 for d in drivers_data if "Q3" in d["best_laps"])

    return {
        "meeting_id": meeting_id,
        "session": session_list[0] if session_list else None,
        "segments": [s for s in segment_order if any(s in d["best_laps"] for d in drivers_data)],
        "drivers": drivers_data,
        "total_drivers": len(drivers_data),
        "q2_drivers": q2_drivers,
        "q3_drivers": q3_drivers,
    }


@router.get("/teammate-battle")
async def teammate_battle(
    year: int = Query(2026),
    db: AsyncSession = Depends(get_db),
):
    """Compare teammates across all sessions in a season.

    Groups drivers by team, pairs them, and returns head-to-head stats
    for each teammate pair across all race weekends.
    """
    query = text("""
        WITH driver_teams AS (
            SELECT DISTINCT ON (sd.driver_number, m.id)
                sd.driver_number,
                sd.full_name,
                sd.name_acronym,
                sd.team_name,
                sd.team_colour,
                m.id AS meeting_id,
                m.name AS race_name,
                m.date_start
            FROM session_drivers sd
            JOIN sessions s ON s.id = sd.session_id
            JOIN meetings m ON m.id = s.meeting_id
            WHERE m.year = :year
            ORDER BY sd.driver_number, m.id, s.date_start
        ),
        qual_best AS (
            SELECT DISTINCT ON (l.session_id, l.driver_number)
                l.session_id,
                l.driver_number,
                l.session_id AS sess_id,
                MIN(l.lap_duration) FILTER (WHERE l.lap_duration > 0) AS best_qual_lap
            FROM laps l
            JOIN sessions s ON s.id = l.session_id
            WHERE s.session_type = 'Qualifying'
              AND l.lap_duration > 0
            GROUP BY l.session_id, l.driver_number
        ),
        race_best AS (
            SELECT
                l.session_id,
                l.driver_number,
                MIN(l.lap_duration) FILTER (WHERE l.lap_duration > 0) AS best_race_lap,
                MIN(l.duration_sector_1) FILTER (WHERE l.duration_sector_1 > 0) AS best_s1,
                MIN(l.duration_sector_2) FILTER (WHERE l.duration_sector_2 > 0) AS best_s2,
                MIN(l.duration_sector_3) FILTER (WHERE l.duration_sector_3 > 0) AS best_s3,
                COUNT(*) FILTER (WHERE l.lap_duration > 0) AS race_laps
            FROM laps l
            JOIN sessions s ON s.id = l.session_id
            WHERE s.session_type = 'Race'
              AND l.lap_duration > 0
            GROUP BY l.session_id, l.driver_number
        ),
        meeting_races AS (
            SELECT DISTINCT s.meeting_id, s.id AS session_id
            FROM sessions s
            WHERE s.session_type = 'Race'
        )
        SELECT
            dt.team_name,
            dt.team_colour,
            dt.meeting_id,
            dt.race_name,
            dt.date_start,
            dt.driver_number,
            dt.full_name,
            dt.name_acronym,
            qb.best_qual_lap,
            rb.best_race_lap,
            rb.best_s1,
            rb.best_s2,
            rb.best_s3,
            rb.race_laps
        FROM driver_teams dt
        LEFT JOIN qual_best qb ON qb.driver_number = dt.driver_number
            AND qb.session_id IN (
                SELECT s.id FROM sessions s
                WHERE s.meeting_id = dt.meeting_id AND s.session_type = 'Qualifying'
            )
        LEFT JOIN race_best rb ON rb.driver_number = dt.driver_number
            AND rb.session_id IN (
                SELECT s.id FROM sessions s
                WHERE s.meeting_id = dt.meeting_id AND s.session_type = 'Race'
            )
        ORDER BY dt.date_start, dt.team_name, dt.driver_number
    """)
    result = await db.execute(query, {"year": year})
    rows = result.fetchall()

    from collections import defaultdict, Counter

    # Group by team + meeting
    teams = defaultdict(lambda: defaultdict(list))
    seen_meetings = set()
    for r in rows:
        team = r.team_name or "Unknown"
        meeting = (r.meeting_id, r.race_name, str(r.date_start) if r.date_start else "")
        teams[team][meeting].append({
            "driver_number": r.driver_number,
            "full_name": r.full_name or f"#{r.driver_number}",
            "acronym": r.name_acronym or f"#{r.driver_number}",
            "team_colour": r.team_colour or "",
            "best_qual_lap": r.best_qual_lap,
            "best_race_lap": r.best_race_lap,
            "best_s1": r.best_s1,
            "best_s2": r.best_s2,
            "best_s3": r.best_s3,
            "race_laps": r.race_laps,
        })
        seen_meetings.add(meeting)

    # Build team-mate battle output
    battle = []
    for team, meetings in sorted(teams.items()):
        # Find the team colour from any entry
        team_colour = ""
        for m_data in meetings.values():
            for d in m_data:
                if d.get("team_colour"):
                    team_colour = d["team_colour"]
                    break

        race_wins = defaultdict(int)
        qual_wins = defaultdict(int)
        points = defaultdict(int)

        # Count how many meetings each driver appeared in
        driver_appearances = Counter()
        for meeting_key, drivers in meetings.items():
            seen_in_this_meeting = set()
            for d in drivers:
                acr = d["acronym"]
                if acr not in seen_in_this_meeting:
                    driver_appearances[acr] += 1
                    seen_in_this_meeting.add(acr)

        # Keep only the 2 most frequent drivers
        top2 = [acr for acr, _ in driver_appearances.most_common(2)]

        for meeting_key, drivers in sorted(meetings.items()):
            # Only compare the top 2 drivers
            main_drivers = [d for d in drivers if d["acronym"] in top2]
            if len(main_drivers) >= 2:
                # Sort drivers by this meeting's best qual lap for comparison
                d_sorted = sorted(main_drivers, key=lambda d: d["best_qual_lap"] if d["best_qual_lap"] else float("inf"))
                if len(d_sorted) >= 2:
                    winner = d_sorted[0]["acronym"]
                    qual_wins[winner] += 1

                d_race = sorted(main_drivers, key=lambda d: d["best_race_lap"] if d["best_race_lap"] else float("inf"))
                if len(d_race) >= 2:
                    winner = d_race[0]["acronym"]
                    race_wins[winner] += 1

        driver_list = sorted(top2)
        battle.append({
            "team_name": team,
            "team_colour": team_colour,
            "drivers": driver_list,
            "race_wins": dict(race_wins),
            "qual_wins": dict(qual_wins),
        })

    return {
        "year": year,
        "battles": battle,
        "total_teams": len(battle),
    }


@router.get("/season-progression")
async def season_progression(
    year: int = Query(2026),
    db: AsyncSession = Depends(get_db),
):
    """Cumulative points per driver across race rounds — perfect for a line chart.

    Returns rounds in chronological order with per-driver points and cumulative
    totals. Separate Race and Sprint points. Top 15 drivers shown by default.
    """
    RACE_POINTS = {1: 25, 2: 18, 3: 15, 4: 12, 5: 10,
                   6: 8, 7: 6, 8: 4, 9: 2, 10: 1}
    SPRINT_POINTS = {1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1}

    query = text("""
        SELECT
            m.id AS meeting_id,
            m.name AS race_name,
            m.date_start,
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
        return {"year": year, "rounds": []}

    from collections import defaultdict, OrderedDict

    # Track all drivers and their points per race
    all_drivers = {}  # driver_number -> {acronym, team_name, team_colour}
    rounds_data = OrderedDict()  # (mid, rname) -> {date, race_name, meeting_id, drivers: {dn: {race_pts, sprint_pts}}}

    for r in rows:
        mid = r.meeting_id
        rname = r.race_name
        date = str(r.date_start) if r.date_start else ""
        dn = r.driver_number
        session_name = r.session_name
        pos = r.position

        if dn not in all_drivers:
            all_drivers[dn] = {
                "acronym": r.name_acronym or f"#{dn}",
                "team_name": r.team_name or "Unknown",
                "team_colour": r.team_colour or "",
            }

        key = (mid, rname)
        if key not in rounds_data:
            rounds_data[key] = {
                "meeting_id": mid,
                "race_name": rname,
                "date": date,
                "drivers": defaultdict(lambda: {"race_pts": 0, "sprint_pts": 0}),
            }

        pts = 0
        if session_name == "Sprint":
            pts = SPRINT_POINTS.get(pos, 0)
            rounds_data[key]["drivers"][dn]["sprint_pts"] = pts
        else:  # Race
            pts = RACE_POINTS.get(pos, 0)
            rounds_data[key]["drivers"][dn]["race_pts"] = pts

    # Sort rounds chronologically
    sorted_rounds = sorted(rounds_data.values(), key=lambda x: x["date"])

    # Compute cumulative points per driver per round
    cumulative = defaultdict(int)
    rounds_output = []

    for rnd_num, rd in enumerate(sorted_rounds, 1):
        driver_list = []
        for dn, info in all_drivers.items():
            d = rd["drivers"].get(dn, {"race_pts": 0, "sprint_pts": 0})
            total = d["race_pts"] + d["sprint_pts"]
            cumulative[dn] += total
            driver_list.append({
                "driver_number": dn,
                "acronym": info["acronym"],
                "team_name": info["team_name"],
                "team_colour": info["team_colour"],
                "race_points": d["race_pts"],
                "sprint_points": d["sprint_pts"],
                "round_points": total,
                "cumulative_points": cumulative[dn],
            })

        # Sort by cumulative points descending
        driver_list.sort(key=lambda x: -x["cumulative_points"])

        rounds_output.append({
            "round": rnd_num,
            "race_name": rd["race_name"],
            "meeting_id": rd["meeting_id"],
            "standings": driver_list,
        })

    # Also return driver info for consistent coloring
    driver_info_list = [
        {"driver_number": dn, "acronym": info["acronym"],
         "team_name": info["team_name"], "team_colour": info["team_colour"],
         "total_points": cumulative[dn]}
        for dn, info in sorted(all_drivers.items(),
                               key=lambda x: -cumulative[x[0]])
    ]

    return {
        "year": year,
        "rounds": rounds_output,
        "drivers": driver_info_list,
        "total_rounds": len(rounds_output),
    }


@router.get("/head-to-head")
async def head_to_head(
    year: int = Query(2026),
    db: AsyncSession = Depends(get_db),
):
    """Driver vs driver head-to-head matrix across all race weekends.

    For each pair of drivers, returns who beat who in qualifying and race
    across all completed rounds. Ideal for a heatmap or comparison table.
    """
    # Get qualifying finishing positions and race finishing positions per driver per round
    query = text("""
        WITH driver_info AS (
            SELECT DISTINCT ON (sd.driver_number)
                sd.driver_number,
                sd.name_acronym,
                sd.team_name,
                sd.team_colour
            FROM session_drivers sd
            JOIN sessions s ON s.id = sd.session_id
            JOIN meetings m ON m.id = s.meeting_id
            WHERE m.year = :year
            ORDER BY sd.driver_number, s.date_start DESC
        ),
        round_order AS (
            SELECT DISTINCT m.id AS meeting_id, m.name AS race_name, m.date_start
            FROM meetings m
            WHERE m.year = :year
        ),
        qual_positions AS (
            SELECT
                s.meeting_id,
                l.driver_number,
                l.position,
                ROW_NUMBER() OVER (
                    PARTITION BY s.meeting_id, s.session_name
                    ORDER BY l.lap_duration NULLS LAST
                ) AS qual_rank
            FROM laps l
            JOIN sessions s ON s.id = l.session_id
            WHERE s.session_type = 'Qualifying'
              AND l.lap_duration > 0 AND l.lap_duration < 600
              AND s.meeting_id IN (SELECT id FROM meetings WHERE year = :year2)
        ),
        race_positions AS (
            SELECT DISTINCT ON (s.meeting_id, l.driver_number)
                s.meeting_id,
                l.driver_number,
                l.position
            FROM laps l
            JOIN sessions s ON s.id = l.session_id
            WHERE s.session_name = 'Race'
              AND l.position IS NOT NULL AND l.position > 0
              AND s.meeting_id IN (SELECT id FROM meetings WHERE year = :year3)
            ORDER BY s.meeting_id, l.driver_number, l.lap_number DESC
        )
        SELECT
            ro.meeting_id,
            ro.race_name,
            qp.driver_number AS qual_dn,
            qp.qual_rank,
            rp.driver_number AS race_dn,
            rp.position AS race_position
        FROM round_order ro
        LEFT JOIN qual_positions qp ON qp.meeting_id = ro.meeting_id
        LEFT JOIN race_positions rp ON rp.meeting_id = ro.meeting_id
            AND rp.driver_number = qp.driver_number
        ORDER BY ro.date_start, qp.qual_rank
    """)
    result = await db.execute(query, {"year": year, "year2": year, "year3": year})
    rows = result.fetchall()

    # Get all drivers
    drv_result = await db.execute(
        text("""
            SELECT DISTINCT ON (driver_number)
                driver_number, name_acronym, team_name, team_colour
            FROM session_drivers sd
            JOIN sessions s ON s.id = sd.session_id
            JOIN meetings m ON m.id = s.meeting_id
            WHERE m.year = :year
            ORDER BY driver_number, s.date_start DESC
        """), {"year": year}
    )
    all_drivers = drv_result.fetchall()
    driver_map = {}
    for d in all_drivers:
        driver_map[d.driver_number] = {
            "acronym": d.name_acronym or f"#{d.driver_number}",
            "team_name": d.team_name or "Unknown",
            "team_colour": d.team_colour or "",
        }

    from collections import defaultdict

    # Group data by meeting, then by driver
    meetings_data = defaultdict(lambda: defaultdict(dict))
    meeting_names = {}
    for r in rows:
        if r.meeting_id not in meeting_names:
            meeting_names[r.meeting_id] = r.race_name
        if r.qual_dn:
            meetings_data[r.meeting_id][r.qual_dn]["qual_rank"] = r.qual_rank
        if r.race_dn:
            meetings_data[r.meeting_id][r.race_dn]["race_pos"] = r.race_position

    # For each pair of drivers, count who beat who
    driver_nums = list(driver_map.keys())
    qual_wins = defaultdict(lambda: defaultdict(int))
    race_wins = defaultdict(lambda: defaultdict(int))
    qual_totals = defaultdict(lambda: defaultdict(int))
    race_totals = defaultdict(lambda: defaultdict(int))

    for mid, drivers_data in meetings_data.items():
        # Qualifying head-to-head
        qual_drivers = [(dn, d["qual_rank"]) for dn, d in drivers_data.items()
                       if d.get("qual_rank")]
        for i in range(len(qual_drivers)):
            for j in range(i + 1, len(qual_drivers)):
                d1, r1 = qual_drivers[i]
                d2, r2 = qual_drivers[j]
                if r1 < r2:
                    qual_wins[d1][d2] += 1
                else:
                    qual_wins[d2][d1] += 1
                qual_totals[d1][d2] += 1
                qual_totals[d2][d1] += 1

        # Race head-to-head
        race_drivers = [(dn, d["race_pos"]) for dn, d in drivers_data.items()
                       if d.get("race_pos")]
        for i in range(len(race_drivers)):
            for j in range(i + 1, len(race_drivers)):
                d1, p1 = race_drivers[i]
                d2, p2 = race_drivers[j]
                if p1 < p2:
                    race_wins[d1][d2] += 1
                else:
                    race_wins[d2][d1] += 1
                race_totals[d1][d2] += 1
                race_totals[d2][d1] += 1

    # Build driver list with standings
    driver_list = []
    for dn in driver_nums:
        info = driver_map[dn]
        driver_list.append({
            "driver_number": dn,
            "acronym": info["acronym"],
            "team_name": info["team_name"],
            "team_colour": info["team_colour"],
            "qual_wins": dict(qual_wins.get(dn, {})),
            "race_wins": dict(race_wins.get(dn, {})),
            "qual_totals": dict(qual_totals.get(dn, {})),
            "race_totals": dict(race_totals.get(dn, {})),
        })

    # Sort by acronym for consistent display
    driver_list.sort(key=lambda x: x["acronym"])

    return {
        "year": year,
        "drivers": driver_list,
        "total_rounds": len(meetings_data),
    }


@router.get("/pit-stop-championship")
async def pit_stop_championship(
    year: int = Query(2026),
    db: AsyncSession = Depends(get_db),
):
    """Team pit stop speed championship — aggregate across all Race sessions.

    Ranks teams by average pit stop duration, with fastest/slowest stops,
    consistency, and individual stop history.
    """
    query = text("""
        SELECT
            sd.team_name,
            sd.team_colour,
            p.driver_number,
            p.lap_number,
            p.pit_duration,
            p.lane_duration,
            p.stop_duration,
            sd.name_acronym,
            m.name AS race_name
        FROM pit_stops p
        JOIN sessions s ON s.id = p.session_id
        JOIN meetings m ON m.id = s.meeting_id
        JOIN session_drivers sd ON sd.session_id = s.id AND sd.driver_number = p.driver_number
        WHERE m.year = :year
          AND s.session_name = 'Race'
          AND p.pit_duration IS NOT NULL AND p.pit_duration > 0
        ORDER BY sd.team_name, m.date_start, p.lap_number
    """)
    result = await db.execute(query, {"year": year})
    rows = result.fetchall()

    if not rows:
        return {"year": year, "teams": []}

    from collections import defaultdict
    import math

    teams = defaultdict(lambda: {
        "stops": [],
        "total_stops": 0,
        "durations": [],
        "drivers": set(),
    })

    for r in rows:
        team = r.team_name or "Unknown"
        teams[team]["stops"].append({
            "driver_number": r.driver_number,
            "acronym": r.name_acronym or f"#{r.driver_number}",
            "lap_number": r.lap_number,
            "pit_duration": round(r.pit_duration, 1),
            "lane_duration": round(r.lane_duration, 1) if r.lane_duration else None,
            "stop_duration": round(r.stop_duration, 1) if r.stop_duration else None,
            "race_name": r.race_name,
        })
        teams[team]["total_stops"] += 1
        if r.pit_duration:
            teams[team]["durations"].append(r.pit_duration)
        teams[team]["drivers"].add(r.driver_number)
        # Store colour from any entry
        if r.team_colour:
            teams[team]["colour"] = r.team_colour

    teams_output = []
    for team, data in teams.items():
        durations = data["durations"]
        if not durations:
            continue
        avg = sum(durations) / len(durations)
        variance = sum((d - avg) ** 2 for d in durations) / len(durations)
        std = math.sqrt(variance)

        # Count stops per race
        races_with_stops = len(set(s["race_name"] for s in data["stops"]))

        teams_output.append({
            "team_name": team,
            "team_colour": data.get("colour", ""),
            "drivers": len(data["drivers"]),
            "total_stops": data["total_stops"],
            "races_with_stops": races_with_stops,
            "avg_pit_duration": round(avg, 2),
            "fastest_stop": round(min(durations), 1),
            "slowest_stop": round(max(durations), 1),
            "std_dev": round(std, 2),
            "consistency": round((1 - (std / avg)) * 100, 1) if avg > 0 else 0,
        })

    # Sort by avg pit duration ascending (fastest first)
    teams_output.sort(key=lambda x: x["avg_pit_duration"])

    # Best overall stop
    all_stops = []
    for team, data in teams.items():
        for s in data["stops"]:
            all_stops.append((s["pit_duration"], team, s))

    all_stops.sort(key=lambda x: x[0])

    return {
        "year": year,
        "teams": teams_output,
        "total_teams": len(teams_output),
        "total_stops": sum(t["total_stops"] for t in teams_output),
        "overall_fastest_stop": all_stops[0] if all_stops else None,
    }
