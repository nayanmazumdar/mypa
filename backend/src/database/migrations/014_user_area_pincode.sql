-- Migration 014: Add area and pincode fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS area    VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pincode VARCHAR(10)  DEFAULT NULL;
