-- Horizon: a public list of games a player intends to play in the future,
-- sourced from the IGDB cache. Entries are not auto-removed.
CREATE TABLE horizon_entries (
    id        bigint      PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    player_id uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    igdb_id   integer     NOT NULL REFERENCES igdb_games(igdb_id),
    added_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (player_id, igdb_id)
);

CREATE INDEX horizon_entries_player_id_added_at_idx ON horizon_entries (player_id, added_at DESC);

-- horizon_add: actor adds a game to their own Horizon (target_id = actor_id).
-- subject_id (journey FK) doesn't apply here, so a separate igdb_id column
-- carries the game reference for this event type.
ALTER TABLE activity_events ADD COLUMN subject_igdb_id integer REFERENCES igdb_games(igdb_id);

ALTER TABLE activity_events DROP CONSTRAINT activity_events_type_check;
ALTER TABLE activity_events ADD CONSTRAINT activity_events_type_check
    CHECK (type IN ('new_comment', 'new_follower', 'horizon_add'));
