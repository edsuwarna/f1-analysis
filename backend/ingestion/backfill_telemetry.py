"""Backfill telemetry data for existing sessions.

Resumable — writes a checkpoint file so you can Ctrl+C and restart.
Usage:
    # Backfill all missing sessions
    python3 -m backend.ingestion.backfill_telemetry

    # Backfill only N sessions (then stop — run again to continue)
    python3 -m backend.ingestion.backfill_telemetry --limit 3

    # Backfill specific session IDs
    python3 -m backend.ingestion.backfill_telemetry --sessions 2,4,6
"""
import time
import sys
import os
import json
import signal
import logging
from datetime import datetime, timezone
from sqlalchemy import text

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("backfill")

from backend.ingestion.ingest_openf1 import get_engine, _store_telemetry, REQUEST_DELAY

CHECKPOINT_FILE = "/app/backend/ingestion/.backfill_checkpoint.json"


def backfill_sessions(engine, limit=0, resume_from=0):
    """Backfill telemetry for sessions with missing or incomplete telemetry.
    
    Catches both:
    - Sessions with zero telemetry rows
    - Sessions where some drivers lack telemetry (partial)
    
    Args:
        engine: SQLAlchemy engine
        limit: Max sessions to backfill (0 = all)
        resume_from: Skip sessions with id <= this value
        
    Returns:
        Number of sessions backfilled
    """
    with engine.begin() as conn:
        rows = conn.execute(text("""
            WITH driver_counts AS (
                SELECT session_id, COUNT(*)::int AS total_drivers
                FROM session_drivers
                GROUP BY session_id
            ),
            telemetry_driver_counts AS (
                SELECT session_id, COUNT(DISTINCT driver_number)::int AS tel_drivers
                FROM telemetry
                GROUP BY session_id
            )
            SELECT s.id, s.session_key, s.session_name,
                   COALESCE(dc.total_drivers, 0) AS total_drivers,
                   COALESCE(tdc.tel_drivers, 0) AS tel_drivers
            FROM sessions s
            LEFT JOIN driver_counts dc ON dc.session_id = s.id
            LEFT JOIN telemetry_driver_counts tdc ON tdc.session_id = s.id
            WHERE COALESCE(tdc.tel_drivers, 0) < COALESCE(dc.total_drivers, 0)
               OR (dc.total_drivers IS NULL AND tdc.tel_drivers IS NULL)
            ORDER BY s.meeting_id, s.id
        """)).fetchall()

    if resume_from:
        rows = [r for r in rows if r[0] > resume_from]

    if not rows:
        return 0

    log.info(f"🎯 Found {len(rows)} session(s) with missing/incomplete telemetry")
    for r in rows:
        log.info(f"    Session {r[0]}: {r[2]} — {r[4]}/{r[3]} drivers have telemetry")

    total = len(rows)
    if limit > 0:
        rows = rows[:limit]

    completed = 0
    for sid, skey, sname, *_ in rows:
        log.info(f"  📡 [{completed+1}/{total}] Session {sid}: {sname}...")
        try:
            _store_telemetry(engine, skey, sid)
            completed += 1
            # Save checkpoint
            with open(CHECKPOINT_FILE, "w") as f:
                json.dump({"last_session_id": sid, "timestamp": datetime.now(timezone.utc).isoformat()}, f)
            time.sleep(REQUEST_DELAY)
        except Exception as e:
            log.warning(f"  ⚠️ Error on session {sid}: {e}")
            time.sleep(REQUEST_DELAY * 3)


    return completed


def main():
    # ── CLI arg parsing ──
    import argparse
    parser = argparse.ArgumentParser(description="Backfill F1 telemetry")
    parser.add_argument("--limit", type=int, default=0, help="Process at most N sessions")
    parser.add_argument("--sessions", type=str, default="", help="Comma-separated session IDs")
    parser.add_argument("--resume", type=int, default=0, help="Skip sessions with id < this value")
    args = parser.parse_args()

    # Graceful shutdown
    interrupted = False
    def handle_sigint(sig, frame):
        nonlocal interrupted
        if interrupted:
            sys.exit(1)
        interrupted = True
        log.warning("⏸️  Interrupted! Finishing current session...")
    signal.signal(signal.SIGINT, handle_sigint)

    engine = get_engine()

    # Load checkpoint
    resume_from = args.resume
    if os.path.exists(CHECKPOINT_FILE):
        try:
            with open(CHECKPOINT_FILE) as f:
                checkpoint = json.load(f)
            resume_from = checkpoint.get("last_session_id", resume_from)
            log.info(f"📌 Resuming from session {resume_from}")
        except Exception as e:
            log.warning(f"⚠️ Checkpoint error: {e}")

    if args.sessions:
        session_ids = [int(x.strip()) for x in args.sessions.split(",")]
        with engine.begin() as conn:
            placeholders = ",".join([str(s) for s in session_ids])
            rows = conn.execute(text(f"""
                SELECT s.id, s.session_key, s.session_name
                FROM sessions s
                WHERE s.id IN ({placeholders})
                ORDER BY s.id
            """)).fetchall()
        total = len(rows)
        log.info(f"🎯 Sessions to backfill: {total}")
        for idx, (sid, skey, sname) in enumerate(rows, 1):
            if interrupted:
                break
            log.info(f"[{idx}/{total}] 📡 Session {sid}: {sname}")
            try:
                _store_telemetry(engine, skey, sid)
                time.sleep(REQUEST_DELAY)
            except Exception as e:
                log.warning(f"  ⚠️ Error: {e}")
                time.sleep(REQUEST_DELAY * 3)
    else:
        completed = backfill_sessions(engine, limit=args.limit, resume_from=resume_from)
        if completed:
            log.info(f"✅ Backfilled {completed} session(s)")
        else:
            log.info("✅ All sessions already have telemetry data!")

    # Cleanup checkpoint if all done
    if os.path.exists(CHECKPOINT_FILE):
        with engine.begin() as conn:
            remaining = conn.execute(text("""
                WITH driver_counts AS (
                    SELECT session_id, COUNT(*)::int AS total_drivers
                    FROM session_drivers
                    GROUP BY session_id
                ),
                telemetry_driver_counts AS (
                    SELECT session_id, COUNT(DISTINCT driver_number)::int AS tel_drivers
                    FROM telemetry
                    GROUP BY session_id
                )
                SELECT COUNT(*) FROM sessions s
                LEFT JOIN driver_counts dc ON dc.session_id = s.id
                LEFT JOIN telemetry_driver_counts tdc ON tdc.session_id = s.id
                WHERE COALESCE(tdc.tel_drivers, 0) < COALESCE(dc.total_drivers, 0)
                   OR (dc.total_drivers IS NULL AND tdc.tel_drivers IS NULL)
            """)).scalar()
        if remaining == 0:
            os.remove(CHECKPOINT_FILE)


if __name__ == "__main__":
    main()
