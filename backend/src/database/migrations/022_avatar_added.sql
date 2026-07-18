-- Migration 022: Avatar Added
ALTER TABLE users ADD COLUMN avatar INT DEFAULT NULL AFTER role;