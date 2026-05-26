-- 001_drop_redundant_session_index.sql
-- Removes ix_telemetry_session_id which is redundant with
-- idx_telemetry_session_driver_lap (B-tree prefix covers session_id lookups).
--
-- Applied: 2026-05-26
-- Rollback: CREATE INDEX CONCURRENTLY ix_telemetry_session_id ON telemetry(session_id);

DROP INDEX IF EXISTS ix_telemetry_session_id;
