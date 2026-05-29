"""
Teams API — Team info, personnel, driver lineup.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, select

from backend.core.database import get_db
from backend.models.models import SessionDriver

router = APIRouter()

# ── Race Engineers (per driver_number, based on DB data) ──
# Known as of 2026 season. PRs welcome for corrections & updates.
RACE_ENGINEERS = {
    1: "Will Joseph",              # Norris (McLaren) — champion #1
    3: "Gianpiero Lambiase",       # Verstappen (Red Bull)
    5: None,                       # Bortoleto (Audi) — rookie
    6: "Richard Wood",             # Hadjar (Red Bull) — rookie
    10: "Josh Peckett",            # Gasly (Alpine)
    11: "Hugh Bird",               # Perez (Cadillac)
    12: "Giacomo Tortora",         # Antonelli (Mercedes) — rookie
    14: "Chris Cronin",            # Alonso (Aston Martin)
    16: "Bryan Bozzi",             # Leclerc (Ferrari)
    18: "Ben Michell",             # Stroll (Aston Martin)
    23: "James Urwin",             # Albon (Williams)
    27: "Ed Regan",                # Hulkenberg (Audi)
    30: None,                      # Lawson (Racing Bulls)
    31: None,                      # Ocon (Haas) — TBC
    41: None,                      # Lindblad (Racing Bulls) — rookie
    43: "Gaetan Jego",             # Colapinto (Alpine)
    44: "Riccardo Adami",          # Hamilton (Ferrari)
    55: "Xavi Marcos",             # Sainz (Williams)
    63: "Marcus Dudley",           # Russell (Mercedes)
    77: None,                      # Bottas (Cadillac) — TBC
    81: "Tom Stallard",            # Piastri (McLaren)
    87: "Ronan O'Hare",            # Bearman (Haas)
}

# ── 2026 Team-Specific Headshots (DISABLED) ──
# Previously hardcoded F1 CDN URLs — removed to avoid DMCA/copyright risks.
# Falls back to OpenF1 headshots or initials+team-color avatars in the frontend.
HEADSHOT_2026 = {}

# ── Reserve Drivers (2026 season) ──
# Per team, usually 1-2 drivers shared across the garage.
# "TBC" means not yet confirmed / changes mid-season.
RESERVE_DRIVERS = {
    "Alpine": "TBC",
    "Aston Martin": "Jak Crawford (Third Driver)",
    "Audi": "Ralph Boschung (Development)",
    "Cadillac": "Zhou Guanyu (Reserve) · Colton Herta (Test)",
    "Ferrari": "TBC",
    "Haas F1 Team": "Jack Doohan (Reserve) · Ryo Hirakawa (Reserve)",
    "McLaren": "Leonardo Fornaroli (Reserve/Test/Development)",
    "Mercedes": "Frederik Vesti (Third Driver)",
    "Racing Bulls": "TBC",
    "Red Bull Racing": "Yuki Tsunoda (Test & Reserve)",
    "Williams": "Luke Browning (Reserve) · Victor Martins (Test/Development)",
}

# ── Reserve Driver Headshots (DISABLED) ──
# Previously hardcoded F1 CDN URLs — removed for copyright safety.
RESERVE_HEADSHOTS = {}

# ── Helper: split reserve driver string into array ──
def _split_reserve(raw: str) -> list:
    """Split 'Jack Doohan (Reserve) · Ryo Hirakawa (Reserve)' → ['Jack Doohan (Reserve)', 'Ryo Hirakawa (Reserve)']"""
    if not raw or raw == "TBC":
        return []
    parts = [p.strip() for p in raw.split("·")]
    return [p for p in parts if p]

# ── Team reference data ──
# Hardcoded but easy to update via PRs
TEAM_INFO = {
    "Alpine": {
        "full_name": "Alpine F1 Team",
        "team_principal": "Flavio Briatore",
        "technical_director": "David Sanchez",
        "base": "Enstone, United Kingdom",
        "power_unit": "Mercedes",
        "chassis": "A525",
        "founded": 1986,
        "constructors_titles": 2,
        "drivers_titles": 2,
    },
    "Aston Martin": {
        "full_name": "Aston Martin Aramco F1 Team",
        "team_principal": "Adrian Newey",
        "technical_director": "Dan Fallows",
        "base": "Silverstone, United Kingdom",
        "power_unit": "Honda",
        "chassis": "AMR26",
        "founded": 1959,
        "constructors_titles": 0,
        "drivers_titles": 0,
    },
    "Audi": {
        "full_name": "Audi F1 Team",
        "team_principal": "Mattia Binotto",
        "technical_director": "James Key",
        "base": "Hinwil, Switzerland / Neuburg, Germany",
        "power_unit": "Audi (in-house)",
        "chassis": "A26",
        "founded": 2026,
        "constructors_titles": 0,
        "drivers_titles": 0,
    },
    "Cadillac": {
        "full_name": "Cadillac Formula 1 Team",
        "team_principal": "Graeme Lowdon",
        "technical_director": "Nick Chester",
        "base": "Silverstone, United Kingdom / Warren, USA",
        "power_unit": "Ferrari",
        "chassis": "CAD26",
        "founded": 2026,
        "constructors_titles": 0,
        "drivers_titles": 0,
    },
    "Ferrari": {
        "full_name": "Scuderia Ferrari HP",
        "team_principal": "Frédéric Vasseur",
        "technical_director": "Loïc Serra / Enrico Cardile",
        "base": "Maranello, Italy",
        "power_unit": "Ferrari",
        "chassis": "SF-26",
        "founded": 1947,
        "constructors_titles": 16,
        "drivers_titles": 15,
    },
    "Haas F1 Team": {
        "full_name": "MoneyGram Haas F1 Team",
        "team_principal": "Ayao Komatsu",
        "technical_director": "Andrea De Zordo",
        "base": "Kannapolis, USA / Maranello, Italy",
        "power_unit": "Ferrari",
        "chassis": "VF-26",
        "founded": 2016,
        "constructors_titles": 0,
        "drivers_titles": 0,
    },
    "McLaren": {
        "full_name": "McLaren Formula 1 Team",
        "team_principal": "Andrea Stella",
        "technical_director": "Rob Marshall / Peter Prodromou",
        "base": "Woking, United Kingdom",
        "power_unit": "Mercedes",
        "chassis": "MCL60",
        "founded": 1963,
        "constructors_titles": 9,
        "drivers_titles": 12,
    },
    "Mercedes": {
        "full_name": "Mercedes-AMG Petronas F1 Team",
        "team_principal": "Toto Wolff",
        "technical_director": "James Allison",
        "base": "Brackley, United Kingdom",
        "power_unit": "Mercedes",
        "chassis": "W16",
        "founded": 1954,
        "constructors_titles": 8,
        "drivers_titles": 9,
    },
    "Racing Bulls": {
        "full_name": "Visa Cash App Racing Bulls",
        "team_principal": "Alan Permane",
        "technical_director": "Tim Goss",
        "base": "Faenza, Italy",
        "power_unit": "Red Bull Ford",
        "chassis": "RB06",
        "founded": 2006,
        "constructors_titles": 0,
        "drivers_titles": 0,
    },
    "Red Bull Racing": {
        "full_name": "Oracle Red Bull Racing",
        "team_principal": "Laurent Mekies",
        "technical_director": "Pierre Waché",
        "base": "Milton Keynes, United Kingdom",
        "power_unit": "Red Bull Ford",
        "chassis": "RB22",
        "founded": 2005,
        "constructors_titles": 6,
        "drivers_titles": 7,
    },
    "Williams": {
        "full_name": "Williams Racing",
        "team_principal": "James Vowles",
        "technical_director": "Pat Fry",
        "base": "Grove, United Kingdom",
        "power_unit": "Mercedes",
        "chassis": "FW48",
        "founded": 1977,
        "constructors_titles": 9,
        "drivers_titles": 7,
    },
}


@router.get("")
async def get_teams(
    year: int = Query(2026),
    db: AsyncSession = Depends(get_db),
):
    """Get all teams with info, driver lineup, and championship positions."""
    # Get constructor standings
    from collections import defaultdict

    champ_points = {}
    try:
        # Simple constructor points from championship endpoint logic
        query = text("""
            SELECT sd.team_name,
                   SUM(CASE
                       WHEN s.session_name = 'Sprint' THEN
                           CASE l.position
                               WHEN 1 THEN 8 WHEN 2 THEN 7 WHEN 3 THEN 6
                               WHEN 4 THEN 5 WHEN 5 THEN 4 WHEN 6 THEN 3
                               WHEN 7 THEN 2 WHEN 8 THEN 1 ELSE 0
                           END
                       ELSE
                           CASE l.position
                               WHEN 1 THEN 25 WHEN 2 THEN 18 WHEN 3 THEN 15
                               WHEN 4 THEN 12 WHEN 5 THEN 10 WHEN 6 THEN 8
                               WHEN 7 THEN 6 WHEN 8 THEN 4 WHEN 9 THEN 2
                               WHEN 10 THEN 1 ELSE 0
                           END
                   END) AS total_points
            FROM laps l
            JOIN sessions s ON s.id = l.session_id
            JOIN session_drivers sd ON sd.session_id = s.id AND sd.driver_number = l.driver_number
            JOIN meetings m ON m.id = s.meeting_id
            WHERE m.year = :year
              AND (s.session_name = 'Race' OR s.session_name = 'Sprint')
              AND l.position IS NOT NULL AND l.position > 0 AND l.position <= 20
              AND l.lap_number = (
                  SELECT MAX(l2.lap_number)
                  FROM laps l2
                  WHERE l2.session_id = l.session_id AND l2.driver_number = l.driver_number
              )
            GROUP BY sd.team_name
            ORDER BY total_points DESC
        """)
        result = await db.execute(query, {"year": year})
        for i, row in enumerate(result.fetchall()):
            champ_points[row.team_name] = {
                "position": i + 1,
                "points": row.total_points or 0,
            }
    except Exception:
        pass

    # Get drivers per team
    driver_query = text("""
        SELECT DISTINCT ON (sd.driver_number)
            sd.driver_number,
            sd.full_name,
            sd.name_acronym,
            sd.team_name,
            sd.team_colour,
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
    drivers_by_team = defaultdict(list)
    for d in drv_result.fetchall():
        hs_url = HEADSHOT_2026.get(d.driver_number) or (d.headshot_url or "")
        drivers_by_team[d.team_name].append({
            "driver_number": d.driver_number,
            "full_name": d.full_name,
            "acronym": d.name_acronym,
            "team_colour": d.team_colour or "",
            "headshot_url": hs_url,
            "race_engineer": RACE_ENGINEERS.get(d.driver_number, None),
        })

    # Get pit stop ranking
    pit_ranking = {}
    try:
        pit_query = text("""
            SELECT sd.team_name,
                   ROUND(AVG(p.pit_duration)::numeric, 2) AS avg_pit,
                   COUNT(*) AS stops
            FROM pit_stops p
            JOIN sessions s ON s.id = p.session_id
            JOIN session_drivers sd ON sd.session_id = s.id AND sd.driver_number = p.driver_number
            JOIN meetings m ON m.id = s.meeting_id
            WHERE m.year = :year
              AND p.pit_duration > 0 AND p.pit_duration < 120
            GROUP BY sd.team_name
            ORDER BY avg_pit
        """)
        pit_result = await db.execute(pit_query, {"year": year})
        for i, row in enumerate(pit_result.fetchall()):
            pit_ranking[row.team_name] = {
                "position": i + 1,
                "avg_pit_duration": float(row.avg_pit),
                "total_stops": row.stops,
            }
    except Exception:
        pass

    # Build response
    teams = []
    for team_name, info in TEAM_INFO.items():
        drivers = drivers_by_team.get(team_name, [])
        constructor = champ_points.get(team_name, {"position": None, "points": 0})
        pit = pit_ranking.get(team_name, {"position": None, "avg_pit_duration": None, "total_stops": 0})

        teams.append({
            "team_name": team_name,
            "full_name": info["full_name"],
            "team_colour": drivers[0]["team_colour"] if drivers else "",
            "team_principal": info["team_principal"],
            "technical_director": info["technical_director"],
            "base": info["base"],
            "power_unit": info["power_unit"],
            "chassis": info["chassis"],
            "founded": info["founded"],
            "constructors_titles": info["constructors_titles"],
            "drivers_titles": info["drivers_titles"],
            "constructor_position": constructor["position"],
            "constructor_points": constructor["points"],
            "pit_stop_rank": pit["position"],
            "pit_stop_avg": pit["avg_pit_duration"],
            "pit_stop_count": pit["total_stops"],
            "reserve_drivers": _split_reserve(RESERVE_DRIVERS.get(team_name, "TBC")),
            "drivers": drivers,
            "driver_count": len(drivers),
        })

    # Sort by constructor position
    teams.sort(key=lambda t: t["constructor_position"] if t["constructor_position"] else 99)

    return {
        "year": year,
        "total_teams": len(teams),
        "teams": teams,
        "reserve_headshots": RESERVE_HEADSHOTS,
    }
