"""Backfill race_control_messages for all existing Race/Qualifying sessions."""
import logging
import time
from sqlalchemy import create_engine, text

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

DATABASE_URL = "postgresql+psycopg2://f1_user:f1_pass_secret@postgres:5432/f1_analysis"
engine = create_engine(DATABASE_URL)

# Import the new function
import sys
sys.path.insert(0, "/app")
from backend.ingestion.ingest_openf1 import _store_race_control, api_get, REQUEST_DELAY

def backfill():
    with engine.connect() as conn:
        # Get sessions that have a session_key and are Race/Qualifying
        rows = conn.execute(text("""
            SELECT s.id, s.session_key, s.session_name, s.session_type, m.name as meeting
            FROM sessions s
            JOIN meetings m ON s.meeting_id = m.id
            WHERE s.session_type IN ('Race', 'Qualifying')
              AND s.session_key IS NOT NULL
            ORDER BY s.id
        """)).fetchall()

    total = len(rows)
    log.info(f"📋 Found {total} sessions to backfill")

    for i, (sid, skey, sname, stype, meeting) in enumerate(rows, 1):
        log.info(f"[{i}/{total}] Session {sid}: {meeting} - {sname} (key={skey})")

        # Check if already has race control data
        with engine.connect() as check_conn:
            existing = check_conn.execute(
                text("SELECT COUNT(*) FROM race_control_messages WHERE session_id = :sid"),
                {"sid": sid}
            ).scalar()
            if existing and existing > 0:
                log.info(f"  ⏭️ Already has {existing} messages, skipping")
                continue

        try:
            from sqlalchemy.orm import Session as SASession
            with SASession(engine) as sasession:
                _store_race_control(sasession, skey, sid)
                sasession.commit()
            log.info(f"  ✅ Done")
        except Exception as e:
            log.warning(f"  ⚠️ Error: {e}")

        time.sleep(REQUEST_DELAY)

    # Final count
    with engine.connect() as conn:
        cnt = conn.execute(text("SELECT COUNT(*) FROM race_control_messages")).scalar()
    log.info(f"\n🏁 Total race control messages: {cnt}")

if __name__ == "__main__":
    backfill()
    log.info("✅ Backfill complete!")
