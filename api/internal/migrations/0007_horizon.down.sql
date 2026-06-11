ALTER TABLE activity_events DROP CONSTRAINT activity_events_type_check;
ALTER TABLE activity_events ADD CONSTRAINT activity_events_type_check
    CHECK (type IN ('new_comment', 'new_follower'));

ALTER TABLE activity_events DROP COLUMN subject_igdb_id;

DROP TABLE horizon_entries;
