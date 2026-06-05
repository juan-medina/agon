-- Migration 001 — pending_journeys dedup guard
-- Adds a partial unique index that prevents duplicate ended sessions from being stored
-- even if the application-level upsert logic is bypassed (e.g. concurrent retries).
--
-- Safe to run on an existing database. If duplicates already exist the CREATE will fail
-- and they must be cleaned up manually before applying.

CREATE UNIQUE INDEX IF NOT EXISTS pending_journeys_dedup_idx
    ON pending_journeys(user_id, exe_name, started_at, ended_at)
    WHERE ended_at IS NOT NULL;
