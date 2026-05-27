#!/usr/bin/env python3
"""Auto-ingest F1 data from OpenF1 API.

Runs inside the ingestion Docker container. Directly calls the
ingestion modules to fetch new meetings/sessions and backfill
telemetry. Idempotent — safe to run every tick.
"""
import time
import logging
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("auto_ingest")

from backend.ingestion.ingest_openf1 import (
    get_engine, _store_meeting, _store_session, _store_telemetry,
    REQUEST_DELAY, api_get
)
from backend.ingestion.backfill_telemetry import backfill_sessions
from sqlalchemy import text

engine = get_engine()


def fetch_new_data():
    """Fetch new meetings and sessions from OpenF1 that aren't in DB yet."""
    log.info("📡 Checking OpenF1 for new meetings...")

    # Get existing meeting keys from DB
    with engine.begin() as conn:
        existing_keys = set(
            row[0] for row in conn.execute(
                text("SELECT meeting_key FROM meetings WHERE meeting_key IS NOT NULL")
            ).fetchall()
        )

    # Fetch all meetings from OpenF1
    year = datetime.now().year
    meetings = api_get("meetings", {"year": year})
    if not meetings:
        log.info("  ⏭️ No meetings from API")
        return 0

    new_count = 0
    for m in meetings:
        mk = m.get("meeting_key")
        if not mk or mk in existing_keys:
            continue

        name = m.get("meeting_name", "?")
        log.info(f"  🆕 New meeting: {name}")
        try:
            meeting_id = _store_meeting(engine, m)
            if not meeting_id:
                continue
            new_count += 1
        except Exception as e:
            log.warning(f"    ⚠️ Meeting error: {e}")
            continue

        # Fetch sessions for this meeting
        time.sleep(REQUEST_DELAY)
        sessions = api_get("sessions", {"meeting_key": mk})
        if sessions:
            for ses in sessions:
                sk = ses.get("session_key")
                sn = ses.get("session_name", "?")
                st = ses.get("session_type", "Practice")
                try:
                    sid = _store_session(engine, meeting_id, sk, sn, st)
                    # _store_session already fetches telemetry internally
                    time.sleep(REQUEST_DELAY)
                except Exception as e:
                    log.warning(f"    ⚠️ Session {sn} error: {e}")

        time.sleep(REQUEST_DELAY)

    return new_count


def main():
    log.info("🏎️ F1 Auto-Ingest starting...")

    # Step 1: Fetch new meetings & sessions + telemetry
    new = fetch_new_data()
    if new:
        log.info(f"✅ {new} new meeting(s) ingested with sessions & telemetry!")
    else:
        log.info("  ℹ️ No new meetings found")

    # Step 2: Backfill telemetry for any existing sessions that lack it
    log.info("📡 Checking sessions needing telemetry backfill...")
    try:
        backfilled = backfill_sessions(engine, limit=5)
        if backfilled:
            log.info(f"✅ Backfilled {backfilled} session(s)")
        else:
            log.info("  ℹ️ All sessions have telemetry data")
    except Exception as e:
        log.warning(f"  ⚠️ Backfill error: {e}")

    log.info("✅ Auto-Ingest complete!")


if __name__ == "__main__":
    main()
