"""
F1 Data Ingestion Pipeline (OpenF1 API)

Uses the OpenF1 API (https://openf1.org/) to fetch race session data
and store it in PostgreSQL. Supports incremental loading for all session types.

OpenF1 API endpoints:
  /v1/meetings  - Race weekend info
  /v1/sessions  - Session (FP1/Qualifying/Race) info
  /v1/drivers   - Driver info
  /v1/laps      - Lap times with sector 1/2/3 durations
  /v1/car_data  - Telemetry (speed, throttle, brake, DRS, RPM, gear)
  /v1/position  - Car position data
  /v1/pit       - Pit stop events
  /v1/stints    - Tyre compound strategy
  /v1/weather   - Weather conditions
  /v1/race_control - Race control messages

Usage:
    # Ingest a specific GP weekend
    python -m backend.ingestion.ingest_openf1 --year 2025 --gp "Australia"

    # Ingest all completed events in a season
    python -m backend.ingestion.ingest_openf1 --year 2025 --all

    # List available events
    python -m backend.ingestion.ingest_openf1 --year 2025 --list
"""

import argparse
import json
import logging
import os
import time
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session as SASession

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger(__name__)

OPENF1_BASE = "https://api.openf1.org/v1"
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://f1_user:f1_pass_secret@postgres:5432/f1_analysis",
)

def get_engine():
    return create_engine(DATABASE_URL)


REQUEST_DELAY = 0.5  # seconds between API calls to avoid rate limiting


def _normalize_hex(color: str) -> str:
    """Ensure hex color has # prefix. Returns empty string if blank."""
    if not color or not color.strip():
        return ""
    c = color.strip()
    if not c.startswith("#"):
        return f"#{c}"
    return c


def api_get(endpoint: str, params: dict | None = None) -> list | dict:
    """Make a GET request to the OpenF1 API with retry logic."""
    url = f"{OPENF1_BASE}/{endpoint}"
    if params:
        qs = "&".join(f"{k}={v}" for k, v in params.items() if v is not None)
        if qs:
            url = f"{url}?{qs}"

    for attempt in range(3):
        try:
            req = Request(url, headers={"User-Agent": "F1Analysis/1.0", "Accept": "application/json"})
            with urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode())
        except HTTPError as e:
            if e.code == 429:
                wait = 2 ** attempt
                log.warning(f"  ⏳ Rate limited, waiting {wait}s...")
                time.sleep(wait)
                continue
            raise
        except (URLError, OSError) as e:
            log.warning(f"  ⚠️ API error: {e} (attempt {attempt + 1}/3)")
            time.sleep(1)
    return []


def fetch_and_store_meeting(engine, year: int, gp_name: str):
    """Fetch all sessions for a GP weekend and store in DB."""
    log.info(f"📅 Fetching {year} {gp_name}...")

    # Get all meetings for the year
    meetings = api_get("meetings", {"year": year})
    if not meetings:
        log.error(f"❌ No meetings found for year {year}")
        return False

    # Find matching meeting
    meeting = None
    for m in meetings:
        if gp_name.lower() in m.get("meeting_name", "").lower() or \
           gp_name.lower() in m.get("location", "").lower() or \
           gp_name.lower() in m.get("country_name", "").lower():
            meeting = m
            break

    # Try by round number
    if not meeting:
        try:
            round_num = int(gp_name)
            if 0 < round_num <= len(meetings):
                # Sort by date and find nth race
                sorted_meetings = sorted(
                    [m for m in meetings if m.get("meeting_name") != "Pre-Season Testing"],
                    key=lambda x: x.get("date_start", "")
                )
                if round_num <= len(sorted_meetings):
                    meeting = sorted_meetings[round_num - 1]
        except ValueError:
            pass

    if not meeting:
        log.error(f"❌ Could not find GP: {gp_name}")
        names = [m.get("meeting_name", "?") for m in meetings if m.get("meeting_name") != "Pre-Season Testing"]
        log.info(f"Available: {names}")
        return False

    meeting_key = meeting["meeting_key"]
    meeting_name = meeting.get("meeting_name", gp_name)
    log.info(f"✅ Found: {meeting_name} (meeting_key={meeting_key})")

    # Store meeting
    meeting_id = _store_meeting(engine, meeting)
    log.info(f"🏁 Meeting ID: {meeting_id}")

    # Get sessions for this meeting
    sessions = api_get("sessions", {"meeting_key": meeting_key})
    if not sessions:
        log.warning(f"  ⚠️ No sessions found for {meeting_name}")
        return True

    # Sort sessions chronologically
    sessions.sort(key=lambda s: s.get("date_start", ""))

    for ses in sessions:
        session_key = ses["session_key"]
        session_name = ses.get("session_name", "?")
        session_type = ses.get("session_type", "Practice")

        # Skip if we don't want this type
        session_types_priority = {"Practice": 1, "Qualifying": 2, "Race": 3}
        stype_priority = session_types_priority.get(session_type, 0)

        try:
            log.info(f"  → Loading {session_name} ({session_type})...")
            _store_session(engine, meeting_id, session_key, session_name, session_type)
        except Exception as e:
            log.warning(f"  ⚠️ Could not load {session_name}: {e}")

    log.info(f"✅ Done: {meeting_name}")
    return True


def _store_meeting(engine, meeting_data: dict) -> int:
    """Store meeting info from OpenF1 API data."""
    with SASession(engine) as session:
        meeting_key = meeting_data["meeting_key"]
        existing = session.execute(
            text("SELECT id FROM meetings WHERE meeting_key = :mk"),
            {"mk": meeting_key},
        ).fetchone()

        date_start = _parse_dt(meeting_data.get("date_start"))
        date_end = _parse_dt(meeting_data.get("date_end"))

        if existing:
            meeting_id = existing[0]
            session.execute(text("""
                UPDATE meetings SET
                    year = :y, name = :n, official_name = :off,
                    location = :loc, country_code = :cc, country_name = :cn,
                    circuit_name = :circuit, circuit_type = :ctype,
                    date_start = :ds, date_end = :de, gmt_offset = :gmt
                WHERE id = :id
            """), {
                "id": meeting_id,
                "y": int(meeting_data.get("year", 0)),
                "n": meeting_data.get("meeting_name", ""),
                "off": meeting_data.get("meeting_official_name", ""),
                "loc": meeting_data.get("location", ""),
                "cc": meeting_data.get("country_code", ""),
                "cn": meeting_data.get("country_name", ""),
                "circuit": meeting_data.get("circuit_short_name", ""),
                "ctype": meeting_data.get("circuit_type", ""),
                "ds": date_start,
                "de": date_end,
                "gmt": meeting_data.get("gmt_offset", ""),
            })
            log.info(f"  Meeting already exists (ID: {meeting_id}), updated.")
        else:
            result = session.execute(text("""
                INSERT INTO meetings (meeting_key, year, name, official_name,
                    location, country_code, country_name, circuit_name,
                    circuit_type, date_start, date_end, gmt_offset)
                VALUES (:mk, :y, :n, :off, :loc, :cc, :cn, :circuit,
                    :ctype, :ds, :de, :gmt)
                RETURNING id
            """), {
                "mk": meeting_key,
                "y": int(meeting_data.get("year", 0)),
                "n": meeting_data.get("meeting_name", ""),
                "off": meeting_data.get("meeting_official_name", ""),
                "loc": meeting_data.get("location", ""),
                "cc": meeting_data.get("country_code", ""),
                "cn": meeting_data.get("country_name", ""),
                "circuit": meeting_data.get("circuit_short_name", ""),
                "ctype": meeting_data.get("circuit_type", ""),
                "ds": date_start,
                "de": date_end,
                "gmt": meeting_data.get("gmt_offset", ""),
            })
            meeting_id = result.scalar()

        session.commit()
        return meeting_id


def _store_session(engine, meeting_id: int, session_key: int,
                   session_name: str, session_type: str):
    """Store a single session's data from OpenF1 API."""
    with SASession(engine) as session:
        existing = session.execute(
            text("SELECT id FROM sessions WHERE meeting_id = :mid AND session_name = :sname"),
            {"mid": meeting_id, "sname": session_name},
        ).fetchone()

        if existing:
            log.info(f"    Session already exists (ID: {existing[0]}), skipping...")
            return existing[0]

        date_start = _parse_dt(
            api_get("sessions", {"session_key": session_key, "limit": 1})
            .get("date_start") if False else None
        )

        # Insert session
        res = session.execute(text("""
            INSERT INTO sessions (session_key, meeting_id, session_type, session_name)
            VALUES (:sk, :mid, :stype, :sname)
            RETURNING id
        """), {
            "sk": session_key,
            "mid": meeting_id,
            "stype": session_type,
            "sname": session_name,
        })
        session_id = res.scalar()
        log.info(f"    📝 Created session ID: {session_id} ({session_name})")

        # Store drivers
        _store_drivers(session, session_key, session_id)

        # Store laps
        time.sleep(REQUEST_DELAY)
        _store_laps(session, session_key, session_id)

        # Store stints (tyre data)
        time.sleep(REQUEST_DELAY)
        _store_stints(session, session_key, session_id)

        # Store pit stops
        time.sleep(REQUEST_DELAY)
        _store_pit_stops(session, session_key, session_id)

        # Store weather
        time.sleep(REQUEST_DELAY)
        _store_weather(session, session_key, session_id)

        # Store race control messages
        time.sleep(REQUEST_DELAY)
        _store_race_control(session, session_key, session_id)

        # Commit session data first so telemetry (separate connection) can FK reference it
        session.commit()

        # Store telemetry (car_data) — needs engine for parallel connection
        time.sleep(REQUEST_DELAY)
        _store_telemetry(engine, session_key, session_id)

        return session_id


def _store_telemetry(engine, session_key: int, session_id: int):
    """Store car telemetry data from OpenF1 /v1/car_data endpoint."""
    log.info("      📡 Fetching telemetry...")
    try:
        # Get list of drivers first
        drivers = api_get("drivers", {"session_key": session_key})
        if not drivers:
            log.info("      ⏭️ No drivers for telemetry")
            return

        driver_numbers = [d["driver_number"] for d in drivers if "driver_number" in d]

        total_stored = 0
        for dn in driver_numbers:
            time.sleep(REQUEST_DELAY)
            car_data = api_get("car_data", {"session_key": session_key, "driver_number": dn})
            if not car_data:
                continue

            batch = []
            for entry in car_data:
                # Parse timestamp from OpenF1 date field
                ts_str = entry.get("date")
                ts = None
                if ts_str:
                    try:
                        dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                        if dt.tzinfo is not None:
                            dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
                        ts = dt.timestamp()
                    except (ValueError, TypeError):
                        pass

                # OpenF1 uses uppercase X, Y for track coordinates
                x_val = entry.get("X") or entry.get("x")
                y_val = entry.get("Y") or entry.get("y")

                batch.append({
                    "sid": session_id,
                    "dn": dn,
                    "ln": entry.get("lap_number"),
                    "ts": ts,
                    "speed": entry.get("speed"),
                    "rpm": entry.get("rpm"),
                    "gear": entry.get("n_gear") if entry.get("n_gear") is not None else entry.get("gear"),
                    "throttle": entry.get("throttle"),
                    "brake": entry.get("brake"),
                    "drs": entry.get("drs"),
                    "x": x_val,
                    "y": y_val,
                })

            if batch:
                # Insert in batches of 1000
                BATCH_SIZE = 1000
                for i in range(0, len(batch), BATCH_SIZE):
                    sub = batch[i:i + BATCH_SIZE]
                    with SASession(engine) as sasession:
                        sasession.execute(text("""
                            INSERT INTO telemetry
                                (session_id, driver_number, lap_number, timestamp,
                                 speed, rpm, gear, throttle, brake, drs, x, y)
                            VALUES
                                (:sid, :dn, :ln, :ts,
                                 :speed, :rpm, :gear, :throttle, :brake, :drs, :x, :y)
                            ON CONFLICT DO NOTHING
                        """), sub)
                        sasession.commit()
                total_stored += len(batch)
                log.info(f"      📡 Stored {len(batch)} telemetry rows for driver #{dn}")

        if total_stored > 0:
            log.info(f"      📡 Total telemetry stored: {total_stored}")
        else:
            log.info("      ⏭️ No telemetry data available")

    except Exception as e:
        log.warning(f"      ⚠️ Telemetry error: {e}")
        import traceback
        traceback.print_exc()


def _store_drivers(sasession, session_key: int, session_id: int):
    """Store driver information for a session."""
    try:
        drivers = api_get("drivers", {"session_key": session_key})
        if not drivers:
            log.warning("      ⚠️ No driver data")
            return

        for d in drivers:
            sasession.execute(text("""
                INSERT INTO session_drivers
                    (session_id, driver_number, broadcast_name, full_name,
                     name_acronym, team_name, team_colour, headshot_url, country_code)
                VALUES (:sid, :dn, :bn, :fn, :acro, :team, :tc, :hs, :cc)
                ON CONFLICT (session_id, driver_number) DO UPDATE SET
                    team_name = EXCLUDED.team_name,
                    team_colour = EXCLUDED.team_colour
            """), {
                "sid": session_id,
                "dn": d.get("driver_number"),
                "bn": d.get("broadcast_name", ""),
                "fn": d.get("full_name", ""),
                "acro": d.get("name_acronym", ""),
                "team": d.get("team_name", ""),
                "tc": _normalize_hex(d.get("team_colour", "")),
                "hs": d.get("headshot_url", ""),
                "cc": d.get("country_code", ""),
            })
        log.info(f"      👨‍👩‍👧‍👦 Stored {len(drivers)} drivers")
    except Exception as e:
        sasession.rollback()
        log.warning(f"      ⚠️ Driver error: {e}")


def _store_laps(sasession, session_key: int, session_id: int):
    """Store lap data with sector times from OpenF1 API."""
    try:
        laps = api_get("laps", {"session_key": session_key})
        if not laps:
            log.warning("      ⚠️ No lap data")
            return

        batch = []
        for lap in laps:
            batch.append({
                "sid": session_id,
                "dn": lap.get("driver_number"),
                "ln": lap.get("lap_number"),
                "s1": lap.get("duration_sector_1"),
                "s2": lap.get("duration_sector_2"),
                "s3": lap.get("duration_sector_3"),
                "lt": lap.get("lap_duration"),
                "i1s": lap.get("i1_speed"),
                "i2s": lap.get("i2_speed"),
                "sts": lap.get("st_speed"),
                "pit_out": lap.get("is_pit_out_lap", False),
            })

        # Fetch position data from OpenF1 to get lap-by-lap race positions
        positions_map = {}  # (driver_number, lap_number) -> position
        try:
            time.sleep(REQUEST_DELAY)
            pos_data = api_get("position", {"session_key": session_key})
            if pos_data:
                from collections import defaultdict
                by_driver = defaultdict(list)
                for p in pos_data:
                    dn = p.get("driver_number")
                    pos = p.get("position")
                    date = p.get("date")
                    if dn and pos and date:
                        by_driver[dn].append({"date": date, "position": pos})

                for dn, entries in by_driver.items():
                    entries.sort(key=lambda x: x["date"])
                    driver_batch = [l for l in batch if l["dn"] == dn]
                    pos_idx = 0
                    for lb in driver_batch:
                        lb_num = lb["ln"]
                        if pos_idx < len(entries):
                            positions_map[(dn, lb_num)] = entries[pos_idx]["position"]
                            pos_idx = min(pos_idx + 1, len(entries) - 1)
        except Exception as e:
            log.warning(f"      ⚠️ Could not fetch position data: {e}")

        # Build compound + tyre_age map from stint data
        compound_map = {}  # (driver_number, lap_number) -> (compound, tyre_age)
        try:
            time.sleep(REQUEST_DELAY)
            stint_data = api_get("stints", {"session_key": session_key})
            if stint_data:
                for st in stint_data:
                    dn = st.get("driver_number")
                    comp = st.get("compound")
                    age_start = st.get("tyre_age_at_start", 0)
                    lap_start = st.get("lap_start", 1)
                    lap_end = st.get("lap_end", 0)
                    if dn and comp and lap_start:
                        for lap_num in range(lap_start, lap_end + 1):
                            tyre_age = (age_start or 0) + (lap_num - lap_start)
                            compound_map[(dn, lap_num)] = (comp, tyre_age)
        except Exception as e:
            log.warning(f"      ⚠️ Could not fetch stint data: {e}")

        # Insert in batches of 500
        BATCH_SIZE = 500
        for i in range(0, len(batch), BATCH_SIZE):
            sub_batch = batch[i:i + BATCH_SIZE]
            # Augment with position + compound + tyre_age data
            enhanced_batch = []
            for lb in sub_batch:
                dn = lb["dn"]
                ln = lb["ln"]
                lb["pos"] = positions_map.get((dn, ln))
                cmpd_info = compound_map.get((dn, ln))
                lb["compound"] = cmpd_info[0] if cmpd_info else None
                lb["tyre_age"] = cmpd_info[1] if cmpd_info else None
                enhanced_batch.append(lb)
            sasession.execute(text("""
                INSERT INTO laps
                    (session_id, driver_number, lap_number,
                     duration_sector_1, duration_sector_2, duration_sector_3,
                     lap_duration, speed_fl, speed_straight, position,
                     compound, tyre_age)
                VALUES
                    (:sid, :dn, :ln, :s1, :s2, :s3, :lt, :i1s, :sts, :pos,
                     :compound, :tyre_age)
                ON CONFLICT DO NOTHING
            """), enhanced_batch)

        log.info(f"      📊 Stored {len(batch)} laps")
    except Exception as e:
        sasession.rollback()
        log.warning(f"      ⚠️ Laps store error: {e}")


def _store_stints(sasession, session_key: int, session_id: int):
    """Store tyre stint data from OpenF1 API."""
    try:
        stints = api_get("stints", {"session_key": session_key})
        if not stints:
            log.info("      ⏭️ No stint data")
            return

        batch = []
        for stint in stints:
            batch.append({
                "sid": session_id,
                "dn": stint.get("driver_number"),
                "sn": stint.get("stint_number"),
                "comp": stint.get("compound") or "",
                "age": stint.get("tyre_age_at_start", 0),
                "ls": stint.get("lap_start"),
                "le": stint.get("lap_end"),
                "tl": stint.get("total_laps"),
                "fresh": stint.get("fresh_tyre", True),
            })

        if batch:
            sasession.execute(text("""
                INSERT INTO stints (session_id, driver_number, stint_number,
                    compound, tyre_age_at_start, lap_start, lap_end,
                    total_laps, fresh_tyre)
                VALUES (:sid, :dn, :sn, :comp, :age, :ls, :le, :tl, :fresh)
                ON CONFLICT (session_id, driver_number, stint_number) DO NOTHING
            """), batch)
            log.info(f"      🛞 Stored {len(batch)} stints")
    except Exception as e:
        sasession.rollback()
        log.warning(f"      ⚠️ Stints error: {e}")


def _store_pit_stops(sasession, session_key: int, session_id: int):
    """Store pit stop data from OpenF1 API."""
    try:
        pits = api_get("pit", {"session_key": session_key})
        if not pits:
            log.info("      ⏭️ No pit stop data")
            return

        batch = []
        for pit in pits:
            batch.append({
                "sid": session_id,
                "dn": pit.get("driver_number"),
                "ln": pit.get("lap_number"),
                "pd": pit.get("pit_duration"),
                "ld": pit.get("lane_duration"),
                "sd": pit.get("stop_duration"),
                "ts": _parse_dt(pit.get("date")),
            })

        if batch:
            sasession.execute(text("""
                INSERT INTO pit_stops (session_id, driver_number, lap_number,
                    pit_duration, lane_duration, stop_duration, timestamp)
                VALUES (:sid, :dn, :ln, :pd, :ld, :sd, :ts)
                ON CONFLICT DO NOTHING
            """), batch)
            log.info(f"      ⛽ Stored {len(batch)} pit stops")
    except Exception as e:
        sasession.rollback()
        log.warning(f"      ⚠️ Pit stops error: {e}")


def _store_weather(sasession, session_key: int, session_id: int):
    """Store weather data from OpenF1 API."""
    try:
        weather = api_get("weather", {"session_key": session_key})
        if not weather:
            log.info("      ⏭️ No weather data")
            return

        batch = []
        for w in weather:
            # OpenF1 returns 'date' as ISO datetime string
            ts = w.get("date")
            if ts:
                ts = _parse_dt(ts)
            if not ts:
                continue
            batch.append({
                "sid": session_id,
                "ts": ts,
                "air": w.get("air_temperature"),
                "track": w.get("track_temperature"),
                "hum": w.get("humidity"),
                "press": w.get("pressure"),
                "wind": w.get("wind_speed"),
                "wd": w.get("wind_direction"),
                "rain": bool(w.get("rainfall", False)),
            })

        if batch:
            # Insert in batches of 200
            for i in range(0, len(batch), 200):
                sub = batch[i:i + 200]
                sasession.execute(text("""
                    INSERT INTO weather (session_id, timestamp, air_temp, track_temp,
                        humidity, pressure, wind_speed, wind_direction, rainfall)
                    VALUES (:sid, :ts, :air, :track, :hum, :press, :wind, :wd, :rain)
                    ON CONFLICT DO NOTHING
                """), sub)
            log.info(f"      🌤️ Stored {len(batch)} weather records")
    except Exception as e:
        sasession.rollback()
        log.warning(f"      ⚠️ Weather error: {e}")


def _store_race_control(sasession, session_key: int, session_id: int):
    """Store race control messages (flags, SC, VSC, penalties, incidents)."""
    try:
        rc_data = api_get("race_control", {"session_key": session_key})
        if not rc_data:
            log.info("      🚩 No race control data")
            return

        batch = []
        for rc in rc_data:
            ts_str = rc.get("date")
            ts = _parse_dt(ts_str) if ts_str else None
            batch.append({
                "sid": session_id,
                "ln": rc.get("lap_number"),
                "cat": rc.get("category"),
                "flag": rc.get("flag"),
                "scope": rc.get("scope"),
                "sector": rc.get("sector"),
                "dn": rc.get("driver_number"),
                "msg": (rc.get("message") or "")[:500],
                "ts": ts,
            })

        if batch:
            sasession.execute(text("""
                INSERT INTO race_control_messages
                    (session_id, lap_number, category, flag, scope, sector, driver_number, message, timestamp)
                VALUES (:sid, :ln, :cat, :flag, :scope, :sector, :dn, :msg, :ts)
                ON CONFLICT DO NOTHING
            """), batch)
            log.info(f"      🚩 Stored {len(batch)} race control messages")
    except Exception as e:
        sasession.rollback()
        log.warning(f"      ⚠️ Race control error: {e}")


def _parse_dt(val):
    """Parse ISO datetime string to tz-naive datetime or None."""
    if not val:
        return None
    try:
        if isinstance(val, str):
            dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
            if dt.tzinfo is not None:
                dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
            return dt
        return val
    except (ValueError, TypeError):
        return None


def list_events(year: int):
    """List available events for a season."""
    meetings = api_get("meetings", {"year": year})
    if not meetings:
        log.error(f"No meetings found for {year}")
        return

    # Filter out pre-season testing
    races = [m for m in meetings if "Testing" not in m.get("meeting_name", "")]
    races.sort(key=lambda m: m.get("date_start", ""))

    print(f"\n📋 {year} F1 Season Schedule:\n")
    print(f"{'#':<4} {'Event':<35} {'Location':<20} {'Circuit':<25}")
    print("-" * 85)
    for i, m in enumerate(races, 1):
        print(f"{i:<4} {m.get('meeting_name', '?')[:34]:<35} "
              f"{m.get('location', '')[:19]:<20} "
              f"{m.get('circuit_short_name', '')[:24]:<25}")


def main():
    parser = argparse.ArgumentParser(description="F1 Data Ingestion (OpenF1 API)")
    parser.add_argument("--year", type=int, default=datetime.now().year, help="Season year")
    parser.add_argument("--gp", type=str, default=None, help="Grand Prix name, location, or round number")
    parser.add_argument("--all", action="store_true", help="Ingest all completed race weekends")
    parser.add_argument("--list", action="store_true", help="List available events")

    args = parser.parse_args()

    engine = get_engine()

    if args.list:
        list_events(args.year)
        return

    if args.gp:
        fetch_and_store_meeting(engine, args.year, args.gp)

    elif args.all:
        meetings = api_get("meetings", {"year": args.year})
        now = datetime.utcnow()

        # Filter out testing, sort by date
        races = sorted(
            [m for m in meetings if "Testing" not in m.get("meeting_name", "")],
            key=lambda m: m.get("date_start", "")
        )

        for race in races:
            try:
                date_start = _parse_dt(race.get("date_start"))
                if date_start and date_start > now:
                    log.info(f"⏭️ Skipping future: {race.get('meeting_name')}")
                    continue
                time.sleep(REQUEST_DELAY)
                fetch_and_store_meeting(engine, args.year, race.get("meeting_name"))
            except Exception as e:
                log.error(f"❌ Error: {race.get('meeting_name')}: {e}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
