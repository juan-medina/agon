CREATE TABLE likes (
    journey_id uuid        NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (journey_id, user_id)
);

ALTER TABLE echoes DROP CONSTRAINT echoes_type_check;
ALTER TABLE echoes ADD CONSTRAINT echoes_type_check CHECK (type IN ('new_comment', 'new_follower', 'new_like'));
CREATE UNIQUE INDEX echoes_like_unique_idx ON echoes(recipient_id, subject_id) WHERE type = 'new_like';
