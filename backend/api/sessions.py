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
