-- Likes never gained traction and cluttered the journey detail and echoes
-- pages. Remove the feature entirely: the likes table, the new_like echo
-- type, and its supporting unique index.
DELETE FROM echoes WHERE type = 'new_like';
DROP INDEX IF EXISTS echoes_like_unique_idx;
ALTER TABLE echoes DROP CONSTRAINT echoes_type_check;
ALTER TABLE echoes ADD CONSTRAINT echoes_type_check CHECK (type IN ('new_comment', 'new_follower'));
DROP TABLE likes;
