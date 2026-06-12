ALTER TABLE activity_events DROP CONSTRAINT activity_events_subject_id_fkey;
ALTER TABLE activity_events ADD CONSTRAINT activity_events_subject_id_fkey
    FOREIGN KEY (subject_id) REFERENCES journeys(id) ON DELETE SET NULL;

ALTER TABLE activity_events DROP COLUMN comment_id;
