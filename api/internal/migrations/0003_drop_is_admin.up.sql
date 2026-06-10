-- The admin-impersonation dev feature has been removed; the is_admin flag
-- has no remaining purpose.
ALTER TABLE users DROP COLUMN is_admin;
