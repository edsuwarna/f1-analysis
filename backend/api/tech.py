"""
Tech Updates API — Car performance telemetry analysis per race weekend.
Speed, gear, throttle, brake, DRS, and RPM stats per driver.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import math

from backend.core.database import get_db

router = APIRouter()


@router.get("/tech-updates/{meeting_id}")
async def get_tech_updates(
    meeting_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Aggregated telemetry stats per driver for a race weekend."""
    # Find Race session
    session_q = text("""
        SELECT id FROM sessions
        WHERE meeting_id = :mid AND session_type = 'Race'
        ORDER BY date_start DESC LIMIT 1
    """)
    s_result = await db.execute(session_q, {"mid": meeting_id})
    s_row = s_result.fetchone()
    if not s_row:
        return {"meeting_id": meeting_id, "session_id": None, "error": "No Race session"}

    session_id = s_row[0]

    # --- Speed Stats ---
    speed_q = text("""
        SELECT t.driver_number,
               sd.name_acronym, sd.team_name, sd.team_colour,
               MAX(t.speed) AS max_speed,
               AVG(t.speed) AS avg_speed
        FROM telemetry t
        LEFT JOIN session_drivers sd ON sd.session_id = t.session_id AND sd.driver_number = t.driver_number
        WHERE t.session_id = :sid AND t.speed > 0
        GROUP BY t.driver_number, sd.name_acronym, sd.team_name, sd.team_colour
        ORDER BY max_speed DESC
    """)
    speed_rows = (await db.execute(speed_q, {"sid": session_id})).fetchall()

    # --- Gear Distribution ---
    gear_q = text("""
        WITH gear_total AS (
            SELECT t.driver_number, COUNT(*) AS total
            FROM telemetry t
            WHERE t.session_id = :sid2 AND t.gear IS NOT NULL AND t.gear > 0
            GROUP BY t.driver_number
        ),
        gear_count AS (
            SELECT t.driver_number, t.gear, COUNT(*) AS cnt
            FROM telemetry t
            WHERE t.session_id = :sid3 AND t.gear IS NOT NULL AND t.gear > 0
            GROUP BY t.driver_number, t.gear
        )
        SELECT g.driver_number, g.gear,
               ROUND((g.cnt::numeric / gt.total) * 100, 1) AS pct
        FROM gear_count g
        JOIN gear_total gt ON gt.driver_number = g.driver_number
        ORDER BY g.driver_number, g.gear
    """)
    gear_rows = (await db.execute(gear_q, {"sid2": session_id, "sid3": session_id})).fetchall()

    # --- Aggregated stats (throttle, brake, rpm, drs) ---
    agg_q = text("""
        SELECT t.driver_number,
               sd.name_acronym, sd.team_name, sd.team_colour,
               AVG(t.throttle) AS avg_throttle,
               MAX(t.throttle) AS max_throttle,
               AVG(t.brake) AS avg_brake,
               MAX(t.brake) AS max_brake,
               AVG(t.rpm) AS avg_rpm,
               MAX(t.rpm) AS max_rpm
        FROM telemetry t
        LEFT JOIN session_drivers sd ON sd.session_id = t.session_id AND sd.driver_number = t.driver_number
        WHERE t.session_id = :sid
        GROUP BY t.driver_number, sd.name_acronym, sd.team_name, sd.team_colour
        ORDER BY avg_rpm DESC
    """)
    agg_rows = (await db.execute(agg_q, {"sid": session_id})).fetchall()

    # --- DRS separately (to avoid casting issues) ---
    drs_q = text("""
        SELECT t.driver_number,
               COUNT(*) FILTER (WHERE t.drs IS TRUE) AS drs_on,
               COUNT(*) AS total
        FROM telemetry t
        WHERE t.session_id = :sid AND t.drs IS NOT NULL
        GROUP BY t.driver_number
    """)
    drs_rows_raw = (await db.execute(drs_q, {"sid": session_id})).fetchall()
    drs_map = {}
    for r in drs_rows_raw:
        drs_map[r[0]] = round((r[1] / r[2]) * 100, 1) if r[2] > 0 else 0.0

    # Build speed map (columns: 0=dn, 1=acronym, 2=team, 3=colour, 4=max, 5=avg)
    speed_map = {}
    for r in speed_rows:
        dn = r[0]
        speed_map[dn] = {
            "max_speed": round(float(r[4]) if r[4] else 0, 1),
            "avg_speed": round(float(r[5]) if r[5] else 0, 1),
        }

    # Build gear map
    gear_dist = {}
    for r in gear_rows:
        dn = r[0]
        if dn not in gear_dist:
            gear_dist[dn] = {}
        gear_dist[dn][str(r[1])] = float(r[2])

    drivers = []
    for r in agg_rows:
        dn = r[0]
        drivers.append({
            "driver_number": dn,
            "acronym": r[1] or f"#{dn}",
            "team_name": r[2] or "",
            "team_colour": r[3] or "",
            "speed": speed_map.get(dn, {"max_speed": 0, "avg_speed": 0}),
            "gear_distribution": gear_dist.get(dn, {}),
            "throttle_avg": round(float(r[4]) if r[4] else 0, 1),
            "throttle_max": round(float(r[5]) if r[5] else 0, 1),
            "brake_avg": round(float(r[6]) if r[6] else 0, 1),
            "brake_max": round(float(r[7]) if r[7] else 0, 1),
            "avg_rpm": int(r[8]) if r[8] else 0,
            "max_rpm": int(r[9]) if r[9] else 0,
            "drs_pct": drs_map.get(dn, 0),
        })

    return {
        "meeting_id": meeting_id,
        "session_id": session_id,
        "total_drivers": len(drivers),
        "drivers": drivers,
    }
