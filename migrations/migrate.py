#!/usr/bin/env python3
"""Simple DB migration runner for f1-analysis.

Tracks applied migrations in a `_migrations` table.
Safe to run multiple times — only applies new migrations.

Usage:
    python3 migrations/migrate.py
"""
import os
import sys
import re
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.ingestion.ingest_openf1 import get_engine
from sqlalchemy import text

MIGRATIONS_DIR = os.path.dirname(os.path.abspath(__file__))


def ensure_tracking_table(conn):
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS _migrations (
            filename VARCHAR(255) PRIMARY KEY,
            applied_at TIMESTAMP DEFAULT NOW(),
            checksum VARCHAR(64)
        )
    """))


def get_applied(conn):
    rows = conn.execute(text("SELECT filename FROM _migrations ORDER BY filename")).fetchall()
    return {r[0] for r in rows}


def main():
    engine = get_engine()
    
    # Get migration files
    migration_files = sorted([
        f for f in os.listdir(MIGRATIONS_DIR)
        if f.endswith(".sql") and re.match(r"^\d{3}_.+\.sql$", f)
    ])
    
    if not migration_files:
        print("✅ No migration files found")
        return
    
    with engine.begin() as conn:
        ensure_tracking_table(conn)
        applied = get_applied(conn)
        
        new_count = 0
        for mf in migration_files:
            if mf in applied:
                print(f"  ⏭️  {mf} — already applied")
                continue
            
            filepath = os.path.join(MIGRATIONS_DIR, mf)
            with open(filepath) as f:
                sql = f.read()
            
            print(f"  📦 Applying {mf}...")
            # Split by semicolons for multi-statement migrations
            statements = [s.strip() for s in sql.split(";") if s.strip()]
            for stmt in statements:
                # Skip comment-only blocks
                clean = re.sub(r"--.*", "", stmt).strip()
                if not clean:
                    continue
                conn.execute(text(stmt))
            
            # Record migration
            import hashlib
            checksum = hashlib.sha256(sql.encode()).hexdigest()[:16]
            conn.execute(
                text("INSERT INTO _migrations (filename, checksum) VALUES (:f, :c)"),
                {"f": mf, "c": checksum},
            )
            new_count += 1
        
        if new_count:
            print(f"✅ Applied {new_count} new migration(s)")
        else:
            print("✅ Already up to date")


if __name__ == "__main__":
    main()
