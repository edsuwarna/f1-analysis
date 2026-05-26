"""
F1 Data Ingestion Pipeline

Uses Fast-F1 to fetch race session data and store it in PostgreSQL.
Supports incremental loading (no duplicates) for all session types.

Usage:
    # Ingest a specific session
    python -m backend.ingestion.ingest_race --year 2025 --gp "Bahrain" --session R

    # Ingest entire 2025 season (all completed races)
    python -m backend.ingestion.ingest_race --year 2025 --all

    # List available events
    python -m backend.ingestion.ingest_race --year 2025 --list
"""

import argparse
import logging
import os
import sys
from datetime import datetime

import fastf1
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session as SASession

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

# Database connection (sync — for ingestion)
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://f1_user:f1_pass_secret@localhost:5432/f1_analysis",
)

RACE_API_KEY = "RACE"  # Fast-F1 session type key

SESSION_TYPE_MAP = {
    "Practice 1": "Practice",
    "Practice 2": "Practice",
    "Practice 3": "Practice",
    "Qualifying": "Qualifying",
    "Race": "Race",
    "Sprint": "Race",
    "Sprint Qualifying": "Qualifying",
}


def get_engine():
    return create_engine(DATABASE_URL)


def fetch_and_store_meeting(engine, year: int, gp_name: str, session_types: list[str] | None = None):
    """Fetch all sessions for a GP weekend and store in DB."""
    log.info(f"📅 Fetching {year} {gp_name}...")

    # Get the event schedule
    schedule = fastf1.get_event_schedule(year)
    event = schedule[schedule["EventName"].str.contains(gp_name, case=False, na=False)]

    if event.empty:
        # Try by round number
        try:
            round_num = int(gp_name)
            event = schedule[schedule["RoundNumber"] == round_num]
        except ValueError:
            pass

    if event.empty:
        log.error(f"❌ Could not find event: {gp_name}")
        log.info(f"Available: {schedule['EventName'].tolist()}")
        return False

    event = event.iloc[0]
    round_number = event["RoundNumber"]
    event_name = event["EventName"]
    log.info(f"✅ Found: R{round_number} {event_name}")

    # Determine which session types to fetch
    all_session_types = ["Practice 1", "Practice 2", "Practice 3", "Qualifying", "Race"]

    # Check for Sprint weekend
    if "Sprint" in str(event.get("EventFormat", "")).lower() or event.get("SprintCoordinates"):
        all_session_types.extend(["Sprint Qualifying", "Sprint"])

    if session_types:
        session_types = [s for s in session_types if s in all_session_types]
    else:
        session_types = all_session_types

    # Store meeting
    meeting_id = _store_meeting(engine, event, year)
    log.info(f"🏁 Meeting ID: {meeting_id}")

    for stype in session_types:
        try:
            log.info(f"  → Loading {stype}...")
            session = fastf1.get_session(year, gp_name, stype)
            session.load(laps=True, telemetry=True, weather=True, messages=True)
            _store_session(engine, session, meeting_id)
        except Exception as e:
            log.warning(f"  ⚠️ Could not load {stype}: {e}")

    log.info(f"✅ Done: {event_name}")
    return True


def _store_meeting(engine, event, year: int) -> int:
    """Store meeting info, return meeting_id.

    Maps Fast-F1 event schedule columns to our DB schema.
    Fast-F1 schedule columns: RoundNumber, Country, Location, OfficialEventName,
    EventDate, EventName, EventFormat, Session1-5Date/DateUtc, etc.
    """
    # Extract timezone offset from Session1Date (it's timezone-aware)
    gmt_offset = ""
    try:
        s1_date = event.get("Session1Date")
        if pd.notna(s1_date) and s1_date.tz is not None:
            offset = s1_date.tz.utcoffset(s1_date)
            if offset:
                total_seconds = int(offset.total_seconds())
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                sign = "+" if hours >= 0 else "-"
                gmt_offset = f"{sign}{abs(hours):02d}:{minutes:02d}"
    except Exception:
        pass

    with SASession(engine) as session:
        # Check if exists
        existing = session.execute(
            text("SELECT id FROM meetings WHERE year = :y AND name = :n"),
            {"y": year, "n": event["EventName"]},
        ).fetchone()

        # Use Session1DateUtc for start, Session5DateUtc for end (UTC timestamps)
        date_start = _pdts_to_dt(event.get("Session1DateUtc"))
        date_end = _pdts_to_dt(event.get("Session5DateUtc"))

        if existing:
            log.info(f"  Meeting already exists (ID: {existing[0]}), updating...")
            meeting_id = existing[0]
            session.execute(text("""
                UPDATE meetings SET
                    official_name = :official, location = :loc,
                    country_name = :cn, date_start = :ds, date_end = :de,
                    gmt_offset = :gmt
                WHERE id = :id
            """), {
                "id": meeting_id,
                "official": str(event.get("OfficialEventName", event["EventName"])),
                "loc": str(event.get("Location", "")),
                "cn": str(event.get("Country", "")),
                "ds": date_start,
                "de": date_end,
                "gmt": gmt_offset,
            })
        else:
            stmt = text("""
                INSERT INTO meetings (year, name, official_name, location,
                    country_name, date_start, date_end, gmt_offset)
                VALUES (:y, :n, :official, :loc, :cn, :ds, :de, :gmt)
                RETURNING id
            """)
            result = session.execute(stmt, {
                "y": year,
                "n": event["EventName"],
                "official": str(event.get("OfficialEventName", event["EventName"])),
                "loc": str(event.get("Location", "")),
                "cn": str(event.get("Country", "")),
                "ds": date_start,
                "de": date_end,
                "gmt": gmt_offset,
            })
            meeting_id = result.scalar()

        session.commit()
        return meeting_id


def _pdts_to_dt(val):
    """Convert a pandas Timestamp (possibly with tz) to tz-naive datetime or None."""
    if val is None or (hasattr(val, 'empty') and val.empty) or (hasattr(val, 'size') and val.size == 0):
        return None
    try:
        if pd.isna(val):
            return None
        if hasattr(val, 'to_pydatetime'):
            dt = val.to_pydatetime()
            if dt.tzinfo is not None:
                # Convert to UTC and make naive (UTC stored in DB)
                from datetime import timezone
                dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
            return dt
        return val
    except Exception:
        return None


def _store_session(engine, fastf1_session, meeting_id: int):
    """Store a single session's data."""
    with SASession(engine) as db_session:
        # Check existing — use meeting_id + session_name as unique key
        existing = db_session.execute(
            text("SELECT id FROM sessions WHERE meeting_id = :mid AND session_name = :sname"),
            {"mid": meeting_id, "sname": fastf1_session.name},
        ).fetchone()

        if existing:
            log.info(f"    Session already exists (ID: {existing[0]}), storing telemetry only...")
            _store_telemetry(db_session, fastf1_session, existing[0])
            db_session.commit()
            return existing[0]

        # Get session name
        sname = fastf1_session.name
        stype = SESSION_TYPE_MAP.get(sname, "Practice")

        # Get session start time
        date_start = None
        try:
            date_start = _pdts_to_dt(fastf1_session.date)
        except Exception:
            pass

        # Fast-F1 doesn't always have session_key like OpenF1
        session_key = None

        # Insert session
        res = db_session.execute(text("""
            INSERT INTO sessions (session_key, meeting_id, session_type, session_name, date_start)
            VALUES (:sk, :mid, :stype, :sname, :ds)
            RETURNING id
        """), {
            "sk": session_key,
            "mid": meeting_id,
            "stype": stype,
            "sname": sname,
            "ds": date_start,
        })
        session_id = res.scalar()
        log.info(f"    📝 Created session ID: {session_id} ({sname})")

        # Store drivers
        _store_drivers(db_session, fastf1_session, session_id)

        # Store laps
        _store_laps(db_session, fastf1_session, session_id)

        # Store telemetry
        _store_telemetry(db_session, fastf1_session, session_id)

        # Store stints (tyre data)
        _store_stints(db_session, fastf1_session, session_id)

        # Store weather
        _store_weather(db_session, fastf1_session, session_id)

        db_session.commit()
        return session_id


def _store_drivers(sasession, f1session, session_id: int):
    """Store driver information."""
    try:
        drivers = f1session.drivers
        results = f1session.results
        if results is None or results.empty:
            return

        for _, drv in results.iterrows():
            dn = int(drv["DriverNumber"])
            sasession.execute(text("""
                INSERT INTO session_drivers
                    (session_id, driver_number, broadcast_name, full_name, name_acronym,
                     team_name, team_colour, headshot_url, country_code)
                VALUES (:sid, :dn, :bn, :fn, :acro, :team, :tc, :hs, :cc)
                ON CONFLICT (session_id, driver_number) DO NOTHING
            """), {
                "sid": session_id,
                "dn": dn,
                "bn": drv.get("BroadcastName", ""),
                "fn": f"{drv.get('FirstName', '')} {drv.get('LastName', '')}".strip(),
                "acro": drv.get("Abbreviation", ""),
                "team": drv.get("TeamName", ""),
                "tc": drv.get("TeamColour", ""),
                "hs": drv.get("HeadshotUrl", ""),
                "cc": drv.get("CountryCode", ""),
            })
    except Exception as e:
        log.warning(f"      ⚠️ Driver store error: {e}")


def _store_laps(sasession, f1session, session_id: int):
    """Store lap data including sector times."""
    try:
        laps = f1session.laps
        if laps is None or laps.empty:
            log.warning("      ⚠️ No lap data")
            return

        # Filter to valid rows
        lap_cols = [
            "DriverNumber", "LapNumber", "Sector1Time", "Sector2Time",
            "Sector3Time", "LapTime", "IsPersonalBest", "IsValid",
            "Compound", "TyreLife", "Position", "SpeedFL", "SpeedST",
        ]

        batch = []
        for _, lap in laps.iterrows():
            try:
                s1 = lap.get("Sector1Time")
                s2 = lap.get("Sector2Time")
                s3 = lap.get("Sector3Time")
                lt = lap.get("LapTime")

                batch.append({
                    "sid": session_id,
                    "dn": int(lap.get("DriverNumber", 0)),
                    "ln": int(lap.get("LapNumber", 0)),
                    "s1": s1.total_seconds() if pd.notna(s1) and hasattr(s1, "total_seconds") else (float(s1) if pd.notna(s1) else None),
                    "s2": s2.total_seconds() if pd.notna(s2) and hasattr(s2, "total_seconds") else (float(s2) if pd.notna(s2) else None),
                    "s3": s3.total_seconds() if pd.notna(s3) and hasattr(s3, "total_seconds") else (float(s3) if pd.notna(s3) else None),
                    "lt": lt.total_seconds() if pd.notna(lt) and hasattr(lt, "total_seconds") else (float(lt) if pd.notna(lt) else None),
                    "pb": bool(lap.get("IsPersonalBest", False)),
                    "valid": bool(lap.get("IsValid", True)),
                    "compound": str(lap.get("Compound", "")),
                    "tyre_age": int(lap.get("TyreLife", 0)) if pd.notna(lap.get("TyreLife")) else 0,
                    "pos": int(lap.get("Position", 0)) if pd.notna(lap.get("Position")) else 0,
                    "spfl": float(lap.get("SpeedFL", 0)) if pd.notna(lap.get("SpeedFL")) else None,
                    "spst": float(lap.get("SpeedST", 0)) if pd.notna(lap.get("SpeedST")) else None,
                })
            except Exception as e:
                log.warning(f"      ⚠️ Lap row error: {e}")

        if batch:
            sasession.execute(text("""
                INSERT INTO laps (session_id, driver_number, lap_number,
                    duration_sector_1, duration_sector_2, duration_sector_3,
                    lap_duration, is_personal_best, is_valid, compound,
                    tyre_age, position, speed_fl, speed_straight)
                VALUES (:sid, :dn, :ln, :s1, :s2, :s3, :lt, :pb, :valid,
                    :compound, :tyre_age, :pos, :spfl, :spst)
                ON CONFLICT DO NOTHING
            """), batch)
            log.info(f"      📊 Stored {len(batch)} laps")

    except Exception as e:
        log.warning(f"      ⚠️ Laps store error: {e}")


def _store_telemetry(sasession, f1session, session_id: int):
    """Store high-frequency telemetry data (speed, throttle, brake, RPM)."""
    import math
    try:
        total = 0
        for drv in f1session.drivers:
            try:
                laps = f1session.laps.pick_driver(drv)
                if laps is None or laps.empty:
                    continue

                car_data = laps.get_car_data()
                if car_data is None or car_data.empty:
                    continue

                # Add distance for better alignment
                car_data = car_data.add_distance()

                batch = []
                for _, row in car_data.iterrows():
                    ts = row.get("Time", 0)
                    if hasattr(ts, "total_seconds"):
                        ts = ts.total_seconds()
                    lap_num = int(row.get("LapNumber", 0)) if pd.notna(row.get("LapNumber")) else None
                    speed = float(row.get("Speed", 0)) if pd.notna(row.get("Speed")) else None
                    rpm = int(row.get("RPM", 0)) if pd.notna(row.get("RPM")) else None
                    gear = int(row.get("Gear", 0)) if pd.notna(row.get("Gear")) else None
                    throttle = float(row.get("Throttle", 0)) if pd.notna(row.get("Throttle")) else None
                    brake = bool(row.get("Brake", False)) if pd.notna(row.get("Brake")) else None
                    drs = bool(row.get("DRS", False)) if pd.notna(row.get("DRS")) else None
                    x = float(row.get("X", 0)) if pd.notna(row.get("X")) else None
                    y = float(row.get("Y", 0)) if pd.notna(row.get("Y")) else None

                    if lap_num is None or speed is None:
                        continue

                    batch.append({
                        "sid": session_id,
                        "dn": int(drv),
                        "ln": lap_num,
                        "ts": float(ts) if ts else 0,
                        "speed": speed,
                        "rpm": rpm,
                        "gear": gear,
                        "throttle": throttle,
                        "brake": 1.0 if brake else 0.0,
                        "drs": drs if drs else False,
                        "x": x if x and not math.isnan(x) else None,
                        "y": y if y and not math.isnan(y) else None,
                    })

                if batch:
                    chunk_size = 500
                    for i in range(0, len(batch), chunk_size):
                        chunk = batch[i:i + chunk_size]
                        sasession.execute(text("""
                            INSERT INTO telemetry (session_id, driver_number, lap_number,
                                timestamp, speed, rpm, gear, throttle, brake, drs, x, y)
                            VALUES (:sid, :dn, :ln, :ts, :speed, :rpm, :gear,
                                :throttle, :brake, :drs, :x, :y)
                            ON CONFLICT DO NOTHING
                        """), chunk)
                    total += len(batch)
                    log.info(f"      📈 Stored {len(batch)} telemetry points for driver #{drv}")

            except Exception as e:
                log.warning(f"      ⚠️ Telemetry driver #{drv} error: {e}")

        log.info(f"      📊 Total telemetry: {total} points")

    except Exception as e:
        log.warning(f"      ⚠️ Telemetry store error: {e}")


def _store_stints(sasession, f1session, session_id: int):
    """Store tyre stint data."""
    try:
        for drv in f1session.drivers:
            try:
                driver_stints = f1session.laps.pick_driver(drv).get_tire_stints()
                if driver_stints is not None and not driver_stints.empty:
                    batch = []
                    for _, stint in driver_stints.iterrows():
                        batch.append({
                            "sid": session_id,
                            "dn": int(drv),
                            "sn": int(stint.get("Stint", 1)),
                            "comp": str(stint.get("Compound", "")),
                            "age": int(stint.get("TyreAgeAtStart", 0)) if pd.notna(stint.get("TyreAgeAtStart")) else 0,
                            "ls": int(stint.get("LapStart", 1)),
                            "le": int(stint.get("LapEnd", 0)),
                            "tl": int(stint.get("TotalLaps", 0)) if pd.notna(stint.get("TotalLaps")) else 0,
                            "fresh": bool(stint.get("FreshTyre", True)),
                        })
                    if batch:
                        sasession.execute(text("""
                            INSERT INTO stints (session_id, driver_number, stint_number,
                                compound, tyre_age_at_start, lap_start, lap_end,
                                total_laps, fresh_tyre)
                            VALUES (:sid, :dn, :sn, :comp, :age, :ls, :le, :tl, :fresh)
                            ON CONFLICT (session_id, driver_number, stint_number) DO NOTHING
                        """), batch)
            except Exception:
                pass
    except Exception as e:
        log.warning(f"      ⚠️ Stints store error: {e}")


def _store_weather(sasession, f1session, session_id: int):
    """Store weather data."""
    try:
        weather = f1session.weather_data
        if weather is not None and not weather.empty:
            batch = []
            for _, w in weather.iterrows():
                try:
                    batch.append({
                        "sid": session_id,
                        "ts": float(w.get("Time", 0)) if pd.notna(w.get("Time")) else 0,
                        "air": float(w.get("AirTemp", 0)) if pd.notna(w.get("AirTemp")) else None,
                        "track": float(w.get("TrackTemp", 0)) if pd.notna(w.get("TrackTemp")) else None,
                        "hum": int(w.get("Humidity", 0)) if pd.notna(w.get("Humidity")) else None,
                        "press": float(w.get("Pressure", 0)) if pd.notna(w.get("Pressure")) else None,
                        "wind": float(w.get("WindSpeed", 0)) if pd.notna(w.get("WindSpeed")) else None,
                        "wd": int(w.get("WindDirection", 0)) if pd.notna(w.get("WindDirection")) else None,
                        "rain": bool(w.get("Rainfall", False)),
                    })
                except Exception:
                    pass
            if batch:
                sasession.execute(text("""
                    INSERT INTO weather (session_id, timestamp, air_temp, track_temp,
                        humidity, pressure, wind_speed, wind_direction, rainfall)
                    VALUES (:sid, :ts, :air, :track, :hum, :press, :wind, :wd, :rain)
                """), batch)
                log.info(f"      🌤️ Stored {len(batch)} weather records")
    except Exception as e:
        log.warning(f"      ⚠️ Weather store error: {e}")


def list_events(year: int):
    """List available events for a season."""
    schedule = fastf1.get_event_schedule(year)
    print(f"\n📋 {year} F1 Season Schedule:\n")
    print(f"{'Round':<8} {'Event':<35} {'Location':<20} {'Circuit':<30}")
    print("-" * 95)
    for _, event in schedule.iterrows():
        print(f"{event.get('RoundNumber', '?'):<8} "
              f"{str(event.get('EventName', ''))[:34]:<35} "
              f"{str(event.get('Location', ''))[:19]:<20} "
              f"{str(event.get('CircuitName', ''))[:29]:<30}")


def main():
    parser = argparse.ArgumentParser(description="F1 Data Ingestion Pipeline")
    parser.add_argument("--year", type=int, default=datetime.now().year, help="Season year")
    parser.add_argument("--gp", type=str, default=None, help="Grand Prix name or round number")
    parser.add_argument("--session", type=str, default=None,
                        help="Session type(s): FP1, FP2, FP3, Q, R, Sprint, SQ. Comma-sep.")
    parser.add_argument("--all", action="store_true", help="Ingest all completed race weekends")
    parser.add_argument("--list", action="store_true", help="List available events")

    args = parser.parse_args()

    fastf1.Cache.enable_cache(os.getenv("CACHE_DIR", os.path.expanduser("~/.fastf1_cache")))

    engine = get_engine()

    if args.list:
        list_events(args.year)
        return

    if args.gp:
        session_map = {
            "FP1": "Practice 1", "FP2": "Practice 2", "FP3": "Practice 3",
            "Q": "Qualifying", "R": "Race",
            "Sprint": "Sprint", "SQ": "Sprint Qualifying",
        }
        session_types = None
        if args.session:
            session_types = [session_map.get(s.strip(), s.strip()) for s in args.session.split(",")]
        fetch_and_store_meeting(engine, args.year, args.gp, session_types)

    elif args.all:
        schedule = fastf1.get_event_schedule(args.year)
        from datetime import timezone
        now = datetime.now(timezone.utc)

        for _, event in schedule.iterrows():
            try:
                # Check if event has started
                evt_date = event.get("Session1Date")
                if pd.notna(evt_date):
                    evt_start = pd.Timestamp(evt_date).to_pydatetime()
                    if evt_start.tzinfo is None:
                        from datetime import timezone
                        evt_start = evt_start.replace(tzinfo=timezone.utc)
                    if evt_start > now:
                        log.info(f"⏭️ Skipping future event: {event['EventName']}")
                        continue
                fetch_and_store_meeting(engine, args.year, event["EventName"])
            except Exception as e:
                log.error(f"❌ Error processing {event.get('EventName', '?')}: {e}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
