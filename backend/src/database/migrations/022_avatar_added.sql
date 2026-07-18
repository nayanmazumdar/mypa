-- Migration 022: Add avatar column to users (stores file path like /uploads/photo.jpg)
ALTER TABLE users ADD COLUMN avatar VARCHAR(500) DEFAULT NULL AFTER phone;

-- Fix: If column already exists with wrong type (INT), correct it to VARCHAR
ALTER TABLE users MODIFY COLUMN avatar VARCHAR(500) DEFAULT NULL;
