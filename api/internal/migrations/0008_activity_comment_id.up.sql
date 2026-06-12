-- Activity events describe something the actor did ("X commented on Y's
-- journey"). If the thing being described is deleted, the event describing
-- it should be removed too — not hidden behind an app-side filter.
--
-- comment_id ties a new_comment event to the comment that created it, so
-- deleting the comment removes its activity entry.
--
-- subject_id was previously ON DELETE SET NULL, leaving the row behind
-- forever with subject_id = NULL and relying on the API to filter it out of
-- feeds. Switch to CASCADE so deleting the journey removes the row outright.
ALTER TABLE activity_events ADD COLUMN comment_id uuid REFERENCES comments(id) ON DELETE CASCADE;

ALTER TABLE activity_events DROP CONSTRAINT activity_events_subject_id_fkey;
ALTER TABLE activity_events ADD CONSTRAINT activity_events_subject_id_fkey
    FOREIGN KEY (subject_id) REFERENCES journeys(id) ON DELETE CASCADE;
