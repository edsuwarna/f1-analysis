"""
Sessions API — Lap times, telemetry, stints, pit stops.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from backend.core.database import get_db
from backend.models.models import (
    Session, SessionDriver, Lap, Stint, PitStop, Weather, Telemetry
)

router = APIRouter()


@router.get("/sessions/{session_id}")
async def get_session(session_id: int, db: AsyncSession = Depends(get_db)):
    """Get session details."""
    result = await db.execute(select(Session).where(Session.id == session_id))
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "id": s.id,
        "session_key": s.session_key,
        "meeting_id": s.meeting_id,
        "session_type": s.session_type,
        "session_name": s.session_name,
        "date_start": str(s.date_start) if s.date_start else None,
    }


@router.get("/sessions/{session_id}/drivers")
async def get_session_drivers(session_id: int, db: AsyncSession = Depends(get_db)):
    """List all drivers in a session."""
    result = await db.execute(
        select(SessionDriver)
        .where(SessionDriver.session_id == session_id)
        .order_by(SessionDriver.driver_number)
    )
    drivers = result.scalars().all()
    return [
        {
            "driver_number": d.driver_number,
            "full_name": d.full_name,
            "name_acronym": d.name_acronym,
            "team_name": d.team_name,
            "team_colour": d.team_colour,
            "headshot_url": d.headshot_url,
        }
        for d in drivers
    ]


@router.get("/sessions/{session_id}/laps")
async def get_session_laps(
    session_id: int,
    driver: int | None = Query(None, description="Filter by driver number"),
    db: AsyncSession = Depends(get_db),
):
    """Get all lap data for a session, optionally filtered by driver."""
    query = select(Lap).where(Lap.session_id == session_id)
    if driver:
        query = query.where(Lap.driver_number == driver)
    query = query.order_by(Lap.driver_number, Lap.lap_number)
    result = await db.execute(query)
    laps = result.scalars().all()

    # Fetch driver info for team colours
    drv_result = await db.execute(
        select(SessionDriver).where(SessionDriver.session_id == session_id)
    )
    driver_color_map = {}
    for d in drv_result.scalars().all():
        driver_color_map[d.driver_number] = {
            "team_colour": d.team_colour,
            "acronym": d.name_acronym,
        }

    return [
        {
            "driver_number": l.driver_number,
            "lap_number": l.lap_number,
            "sector_1": l.duration_sector_1,
            "sector_2": l.duration_sector_2,
            "sector_3": l.duration_sector_3,
            "lap_duration": l.lap_duration,
            "compound": l.compound,
            "tyre_age": l.tyre_age,
            "position": l.position,
            "is_personal_best": l.is_personal_best,
            "is_valid": l.is_valid,
            "team_colour": driver_color_map.get(l.driver_number, {}).get("team_colour"),
            "acronym": driver_color_map.get(l.driver_number, {}).get("acronym"),
        }
        for l in laps
    ]


@router.get("/sessions/{session_id}/sectors")
async def get_sector_times(session_id: int, db: AsyncSession = Depends(get_db)):
    """Get best sector times per driver for a session."""
    query = text("""
        WITH best_sectors AS (
            SELECT
                driver_number,
                MIN(duration_sector_1) FILTER (WHERE duration_sector_1 IS NOT NULL AND duration_sector_1 > 0) AS best_s1,
                MIN(duration_sector_2) FILTER (WHERE duration_sector_2 IS NOT NULL AND duration_sector_2 > 0) AS best_s2,
                MIN(duration_sector_3) FILTER (WHERE duration_sector_3 IS NOT NULL AND duration_sector_3 > 0) AS best_s3,
                MIN(lap_duration) FILTER (WHERE lap_duration IS NOT NULL AND lap_duration > 0) AS best_lap,
                COUNT(*) AS total_laps
            FROM laps
            WHERE session_id = :sid
              AND duration_sector_1 IS NOT NULL AND duration_sector_1 > 0
            GROUP BY driver_number
        )
        SELECT
            s.driver_number,
            sd.full_name,
            sd.name_acronym,
            sd.team_name,
            sd.team_colour,
            s.best_s1,
            s.best_s2,
            s.best_s3,
            s.best_lap,
            s.total_laps
        FROM best_sectors s
        LEFT JOIN session_drivers sd ON sd.session_id = :sid2 AND sd.driver_number = s.driver_number
        ORDER BY s.best_lap NULLS LAST
    """)
    result = await db.execute(query, {"sid": session_id, "sid2": session_id})
    rows = result.fetchall()
    return [
        {
            "driver_number": r[0],
            "full_name": r[1],
            "acronym": r[2],
            "team": r[3],
            "team_colour": r[4],
            "best_sector_1": r[5],
            "best_sector_2": r[6],
            "best_sector_3": r[7],
            "best_lap": r[8],
            "total_laps": r[9],
        }
        for r in rows
    ]


@router.get("/sessions/{session_id}/stints")
async def get_session_stints(
    session_id: int,
    driver: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get tyre stint information."""
    query = select(Stint).where(Stint.session_id == session_id)
    if driver:
        query = query.where(Stint.driver_number == driver)
    query = query.order_by(Stint.driver_number, Stint.stint_number)
    result = await db.execute(query)
    stints = result.scalars().all()
    return [
        {
            "driver_number": s.driver_number,
            "stint_number": s.stint_number,
            "compound": s.compound,
            "tyre_age_at_start": s.tyre_age_at_start,
            "lap_start": s.lap_start,
            "lap_end": s.lap_end,
            "total_laps": s.total_laps,
            "fresh_tyre": s.fresh_tyre,
        }
        for s in stints
    ]


@router.get("/sessions/{session_id}/pit-stops")
async def get_pit_stops(
    session_id: int,
    driver: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get pit stop events."""
    query = select(PitStop).where(PitStop.session_id == session_id)
    if driver:
        query = query.where(PitStop.driver_number == driver)
    query = query.order_by(PitStop.driver_number, PitStop.lap_number)
    result = await db.execute(query)
    stops = result.scalars().all()
    return [
        {
            "driver_number": p.driver_number,
            "lap_number": p.lap_number,
            "pit_duration": p.pit_duration,
            "lane_duration": p.lane_duration,
            "stop_duration": p.stop_duration,
        }
        for p in stops
    ]


@router.get("/sessions/{session_id}/telemetry/{driver}")
async def get_driver_telemetry(
    session_id: int,
    driver: int,
    lap: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Get telemetry data for a driver in a session."""
    query = select(Telemetry).where(
        Telemetry.session_id == session_id,
        Telemetry.driver_number == driver,
    )
    if lap:
        query = query.where(Telemetry.lap_number == lap)
    query = query.order_by(Telemetry.timestamp).limit(10000)
    result = await db.execute(query)
    telemetry = result.scalars().all()
    return [
        {
            "lap_number": t.lap_number,
            "timestamp": t.timestamp,
            "speed": t.speed,
            "rpm": t.rpm,
            "gear": t.gear,
            "throttle": t.throttle,
            "brake": t.brake,
            "drs": t.drs,
            "x": t.x,
            "y": t.y,
        }
        for t in telemetry
    ]


@router.get("/sessions/{session_id}/weather")
async def get_session_weather(session_id: int, db: AsyncSession = Depends(get_db)):
    """Get weather timeline for a session."""
    result = await db.execute(
        select(Weather)
        .where(Weather.session_id == session_id)
        .order_by(Weather.timestamp)
    )
    records = result.scalars().all()
    return [
        {
            "timestamp": w.timestamp,
            "air_temp": w.air_temp,
            "track_temp": w.track_temp,
            "humidity": w.humidity,
            "pressure": w.pressure,
            "wind_speed": w.wind_speed,
            "rainfall": w.rainfall,
        }
        for w in records
    ]


@router.get("/sessions/{session_id}/gaps")
async def get_session_gaps(
    session_id: int,
    reference: int | None = Query(None, description="Reference driver number (default: leader per lap)"),
    db: AsyncSession = Depends(get_db),
):
    """Gap timeline — cumulative gap of each driver to leader (or reference driver) lap by lap.

    Returns a timeline array where each entry has the gap to leader (or ref driver)
    for every driver at every lap. Only valid Race sessions have meaningful positions.
    """
    # Get all laps with valid lap_durations, ordered by driver + lap
    result = await db.execute(
        select(Lap)
        .where(
            Lap.session_id == session_id,
            Lap.lap_duration.isnot(None),
            Lap.lap_duration > 0,
        )
        .order_by(Lap.driver_number, Lap.lap_number)
    )
    laps = result.scalars().all()

    if not laps:
        return {"leader": None, "reference": reference, "timeline": []}

    # Group by driver, compute cumulative time per lap
    from collections import defaultdict
    driver_laps = defaultdict(list)
    driver_info = {}

    for l in laps:
        driver_laps[l.driver_number].append(l)
        if l.driver_number not in driver_info:
            driver_info[l.driver_number] = {
                "full_name": "",  # filled below from session_drivers
                "name_acronym": f"#{l.driver_number}",
                "team_name": "",
                "team_colour": "",
            }

    # Fetch driver info
    drv_result = await db.execute(
        select(SessionDriver).where(SessionDriver.session_id == session_id)
    )
    for d in drv_result.scalars().all():
        if d.driver_number in driver_info:
            driver_info[d.driver_number] = {
                "full_name": d.full_name,
                "name_acronym": d.name_acronym,
                "team_name": d.team_name,
                "team_colour": d.team_colour,
            }

    # Get all unique lap numbers across all drivers
    all_lap_nums = sorted(set(l.lap_number for l in laps))
    if not all_lap_nums:
        return {"leader": None, "reference": reference, "timeline": []}

    # Build cumulative time per driver per lap
    # cum_times[driver_number][lap_number] = cumulative_time
    cum_times = {}
    for dn, dlaps in driver_laps.items():
        ct = 0.0
        cum_times[dn] = {}
        for l in dlaps:
            ct += l.lap_duration
            cum_times[dn][l.lap_number] = ct

    # Determine reference driver: if not specified, use the driver leading at the final lap
    leader_dn = None
    if reference is not None and reference in cum_times:
        leader_dn = reference
    else:
        # Leader = driver with smallest cumulative time at the last common lap
        last_lap = all_lap_nums[-1]
        min_ct = float('inf')
        for dn, ct_map in cum_times.items():
            if last_lap in ct_map and ct_map[last_lap] < min_ct:
                min_ct = ct_map[last_lap]
                leader_dn = dn

    # Build timeline: flat array sorted by lap, then position
    timeline = []
    for lap_num in all_lap_nums:
        # Get leader's cumulative time at this lap
        leader_ct = None
        if leader_dn and lap_num in cum_times.get(leader_dn, {}):
            leader_ct = cum_times[leader_dn][lap_num]

        # Collect all drivers present at this lap, compute gap
        lap_entries = []
        for dn, ct_map in cum_times.items():
            if lap_num not in ct_map:
                continue
            ct = ct_map[lap_num]
            gap = (ct - leader_ct) if (leader_ct is not None) else 0.0
            info = driver_info.get(dn, {})
            lap_entries.append({
                "lap": lap_num,
                "driver_number": dn,
                "acronym": info.get("name_acronym", f"#{dn}"),
                "full_name": info.get("full_name", ""),
                "team_name": info.get("team_name", ""),
                "team_colour": info.get("team_colour", ""),
                "cumulative_time": round(ct, 3),
                "gap_to_leader": round(gap, 3),
            })

        # Sort by gap (so leader first)
        lap_entries.sort(key=lambda x: x["gap_to_leader"])
        timeline.extend(lap_entries)

    leader_info = driver_info.get(leader_dn) if leader_dn else None
    return {
        "leader": {
            "driver_number": leader_dn,
            "acronym": leader_info["name_acronym"] if leader_info else None,
            "full_name": leader_info["full_name"] if leader_info else None,
            "team_name": leader_info["team_name"] if leader_info else None,
            "team_colour": leader_info["team_colour"] if leader_info else None,
        } if leader_info else None,
        "reference": reference,
        "max_lap": all_lap_nums[-1],
        "timeline": timeline,
    }


@router.get("/sessions/{session_id}/positions")
async def get_session_positions(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Position history — each driver's race position lap by lap.

    Returns a timeline of position per driver per lap, sorted by
    lap_number then position. Great for a position-evolution chart.
    """
    result = await db.execute(
        select(Lap)
        .where(
            Lap.session_id == session_id,
            Lap.position.isnot(None),
            Lap.position > 0,
        )
        .order_by(Lap.lap_number, Lap.position)
    )
    laps = result.scalars().all()

    if not laps:
        return {"max_lap": 0, "timeline": []}

    max_lap = max(l.lap_number for l in laps)

    # Fetch driver info once
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

    timeline = []
    for l in laps:
        info = driver_info.get(l.driver_number, {})
        timeline.append({
            "lap": l.lap_number,
            "driver_number": l.driver_number,
            "acronym": info.get("acronym", f"#{l.driver_number}"),
            "full_name": info.get("full_name", ""),
            "team_name": info.get("team_name", ""),
            "team_colour": info.get("team_colour", ""),
            "position": l.position,
        })

    return {
        "max_lap": max_lap,
        "timeline": timeline,
    }


@router.get("/sessions/{session_id}/qualifying-evolution")
async def get_qualifying_evolution(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Qualifying evolution — each driver's lap progression with improvement deltas.

    Groups laps by driver, sorted by lap_number, with sector deltas pre-computed.
    Best for Qualifying sessions (has is_personal_best flags).
    """
    result = await db.execute(
        select(Lap)
        .where(
            Lap.session_id == session_id,
            Lap.lap_duration.isnot(None),
            Lap.lap_duration > 0,
        )
        .order_by(Lap.driver_number, Lap.lap_number)
    )
    laps = result.scalars().all()

    if not laps:
        return {"evolution": [], "best_lap_times": []}

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
    by_driver = defaultdict(list)
    for l in laps:
        by_driver[l.driver_number].append(l)

    evolution = []
    all_best = []

    for dn, driver_laps in by_driver.items():
        driver_laps.sort(key=lambda l: l.lap_number)
        info = driver_info.get(dn, {})
        prev_lap = None
        prev_s1 = None
        prev_s2 = None
        prev_s3 = None
        personal_best_time = None
        runs = []

        for l in driver_laps:
            lap_time = l.lap_duration
            s1 = l.duration_sector_1
            s2 = l.duration_sector_2
            s3 = l.duration_sector_3

            # Delta from previous lap
            delta = (lap_time - prev_lap) if (prev_lap is not None and lap_time and prev_lap) else None
            delta_s1 = (s1 - prev_s1) if (s1 and prev_s1) else None
            delta_s2 = (s2 - prev_s2) if (s2 and prev_s2) else None
            delta_s3 = (s3 - prev_s3) if (s3 and prev_s3) else None

            # Is this a personal best?
            is_pb = False
            if lap_time and lap_time > 0:
                if personal_best_time is None or lap_time < personal_best_time:
                    personal_best_time = lap_time
                    is_pb = True

            runs.append({
                "lap_number": l.lap_number,
                "lap_duration": lap_time,
                "sector_1": s1,
                "sector_2": s2,
                "sector_3": s3,
                "compound": l.compound,
                "is_personal_best": is_pb,
                "delta": round(delta, 3) if delta is not None else None,
                "delta_s1": round(delta_s1, 3) if delta_s1 is not None else None,
                "delta_s2": round(delta_s2, 3) if delta_s2 is not None else None,
                "delta_s3": round(delta_s3, 3) if delta_s3 is not None else None,
            })

            prev_lap = lap_time
            prev_s1 = s1
            prev_s2 = s2
            prev_s3 = s3

        evolution.append({
            "driver_number": dn,
            "acronym": info.get("acronym", f"#{dn}"),
            "full_name": info.get("full_name", ""),
            "team_name": info.get("team_name", ""),
            "team_colour": info.get("team_colour", ""),
            "runs": runs,
            "best_lap_time": personal_best_time,
            "total_runs": len(runs),
        })

        # For the best-lap comparison table
        if personal_best_time and personal_best_time > 0:
            all_best.append({
                "driver_number": dn,
                "acronym": info.get("acronym", f"#{dn}"),
                "full_name": info.get("full_name", ""),
                "team_name": info.get("team_name", ""),
                "team_colour": info.get("team_colour", ""),
                "best_lap_time": personal_best_time,
            })

    # Sort evolution by best lap time
    evolution.sort(key=lambda x: x["best_lap_time"] if x["best_lap_time"] else float('inf'))
    # Sort best times
    all_best.sort(key=lambda x: x["best_lap_time"])

    return {
        "evolution": evolution,
        "best_lap_times": all_best,
    }


@router.get("/sessions/{session_id}/compare/{driver_a}/{driver_b}")
async def compare_drivers(
    session_id: int,
    driver_a: int,
    driver_b: int,
    db: AsyncSession = Depends(get_db),
):
    """Head-to-head comparison of two drivers in a session."""
    # Get lap data for both drivers
    result = await db.execute(
        select(Lap)
        .where(
            Lap.session_id == session_id,
            Lap.driver_number.in_([driver_a, driver_b]),
        )
        .order_by(Lap.lap_number, Lap.driver_number)
    )
    laps = result.scalars().all()

    # Group by driver
    data = {}
    for l in laps:
        dn = l.driver_number
        if dn not in data:
            data[dn] = []
        data[dn].append({
            "lap_number": l.lap_number,
            "lap_duration": l.lap_duration,
            "sector_1": l.duration_sector_1,
            "sector_2": l.duration_sector_2,
            "sector_3": l.duration_sector_3,
            "compound": l.compound,
            "position": l.position,
        })

    return {
        "driver_a": data.get(driver_a, []),
        "driver_b": data.get(driver_b, []),
    }


@router.get("/sessions/{session_id}/track-map")
async def get_track_map(
    session_id: int,
    lap: int | None = Query(None, description="Specific lap to show positions for"),
    db: AsyncSession = Depends(get_db),
):
    """Track position map — circuit layout + driver positions per lap.

    Returns the circuit path (x,y from any driver's telemetry) and
    each driver's position on track for every lap (or a specific lap).
    """
    # 1. Get circuit path from first driver's telemetry (any driver, first lap)
    drv_result = await db.execute(
        select(SessionDriver).where(SessionDriver.session_id == session_id).limit(1)
    )
    first_driver = drv_result.scalar_one_or_none()
    if not first_driver:
        return {"circuit": [], "positions": [], "max_lap": 0}

    dn = first_driver.driver_number
    telemetry_query = select(Telemetry).where(
        Telemetry.session_id == session_id,
        Telemetry.driver_number == dn,
        Telemetry.lap_number == 1,
    ).order_by(Telemetry.timestamp).limit(5000)
    t_result = await db.execute(telemetry_query)
    circuit_coords = [
        {"x": t.x, "y": t.y}
        for t in t_result.scalars().all()
        if t.x is not None and t.y is not None
    ]

    # 2. Get position data (lap number, position, driver info)
    pos_result = await db.execute(
        select(Lap).where(
            Lap.session_id == session_id,
            Lap.position.isnot(None),
            Lap.position > 0,
        ).order_by(Lap.lap_number, Lap.position)
    )
    laps = pos_result.scalars().all()

    # Fetch driver info
    drv_all = await db.execute(
        select(SessionDriver).where(SessionDriver.session_id == session_id)
    )
    driver_info = {}
    for d in drv_all.scalars().all():
        driver_info[d.driver_number] = {
            "acronym": d.name_acronym,
            "full_name": d.full_name,
            "team_name": d.team_name,
            "team_colour": d.team_colour,
        }

    # Build per-lap position lists
    from collections import defaultdict
    lap_positions = defaultdict(list)
    all_laps = set()
    for l in laps:
        info = driver_info.get(l.driver_number, {})
        lap_positions[l.lap_number].append({
            "driver_number": l.driver_number,
            "position": l.position,
            "acronym": info.get("acronym", f"#{l.driver_number}"),
            "team_colour": info.get("team_colour", ""),
        })
        all_laps.add(l.lap_number)

    max_lap = max(all_laps) if all_laps else 0
    sorted_laps = sorted(all_laps)

    # If a specific lap is requested, return only that lap
    if lap is not None:
        return {
            "circuit": circuit_coords,
            "positions": lap_positions.get(lap, []),
            "lap": lap,
            "max_lap": max_lap,
            "total_laps": len(sorted_laps),
        }

    return {
        "circuit": circuit_coords,
        "all_laps": sorted_laps,
        "lap_positions": dict(lap_positions),
        "max_lap": max_lap,
        "total_laps": len(sorted_laps),
    }
