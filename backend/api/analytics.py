"""
Analytics API — Aggregated insights and cross-race analysis.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from backend.core.database import get_db

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
          AND l.is_valid = true
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
