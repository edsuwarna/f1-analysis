"""Backfill telemetry data for existing sessions."""
import time
import logging
from sqlalchemy import text

logging.basicConfig(level=logging.INFO)
log = logging.getLogger('backfill')

from backend.ingestion.ingest_openf1 import get_engine, _store_telemetry, REQUEST_DELAY

engine = get_engine()

# Get sessions without telemetry
with engine.begin() as conn:
    rows = conn.execute(text("""
        SELECT s.id, s.session_key, s.session_name
        FROM sessions s
        WHERE NOT EXISTS (
            SELECT 1 FROM telemetry t WHERE t.session_id = s.id
        )
        ORDER BY s.meeting_id, s.id
    """)).fetchall()

log.info(f"Sessions needing backfill: {len(rows)}")
for sid, skey, sname in rows:
    log.info(f"  📡 Fetching telemetry for session {sid} ({sname})...")
    try:
        _store_telemetry(engine, skey, sid)
        time.sleep(REQUEST_DELAY)
    except Exception as e:
        log.warning(f"  ⚠️ Error: {e}")
        time.sleep(REQUEST_DELAY * 2)

log.info("✅ Backfill complete!")
