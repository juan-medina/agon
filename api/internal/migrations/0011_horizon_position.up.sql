-- Explicit ordering for a player's Horizon, so they can drag-and-drop
-- reorder it to put their most-anticipated game first.
ALTER TABLE horizon_entries ADD COLUMN position integer NOT NULL DEFAULT 0;

-- Backfill preserving the current newest-first order.
UPDATE horizon_entries h
SET position = ranked.position
FROM (
    SELECT id, row_number() OVER (PARTITION BY player_id ORDER BY added_at DESC) - 1 AS position
    FROM horizon_entries
) ranked
WHERE h.id = ranked.id;

CREATE INDEX horizon_entries_player_id_position_idx ON horizon_entries (player_id, position);
